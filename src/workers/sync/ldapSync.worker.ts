import { FastifyInstance } from 'fastify';
import { PrismaClient as SarPrismaClient } from '../../generated/prisma/index.js';
import { PrismaClient as SourcePrismaClient } from '../../generated/prisma-ldap/index.js';

export type LdapSyncWorkerContext = {
    sarPrisma: SarPrismaClient;
    scPrisma: SourcePrismaClient;
    log: FastifyInstance['log'];
};


const EXTRACT_USER_ROLE_SQL = `
SELECT 
    S.SYSTEM_NAME, 
    M.USERNAME, 
    E.NO_REG, 
    C.COMPANY_CODE, 
    M.ROLE_ID, 
    R.ROLE_NAME
FROM TB_M_AUTHORIZATION_MAPPING M
JOIN TB_M_ROLE R ON M.ROLE_ID = R.ROLE_ID
JOIN TB_M_EMPLOYEE E ON M.USERNAME = E.USERNAME
JOIN TB_M_SYSTEM S ON S.SYSTEM_ID = M.SYSTEM_ID
JOIN TB_M_COMPANY_OF_ORIGIN C ON C.COMPANY_ID = E.COMPANY_ID
WHERE CAST(E.USER_EXPIRATION_DATE AS DATE) >= CAST(GETDATE() AS DATE)
ORDER BY S.SYSTEM_NAME, M.ROLE_ID, M.USERNAME
`;

const EXTRACT_ROLE_FUNC_SQL = `
SELECT DISTINCT 
    S.SYSTEM_NAME, 
    R.ROLE_ID, 
    R.ROLE_NAME, 
    D.SCREEN_ID, 
    C.SCREEN_NAME
FROM TB_M_ROLE R
JOIN TB_M_SYSTEM S ON S.SYSTEM_ID = R.SYSTEM_ID
JOIN TB_M_AUTHORIZATION_DETAIL D ON D.SYSTEM_ID = R.SYSTEM_ID AND D.ROLE_ID = R.ROLE_ID
JOIN TB_M_SCREEN C ON D.SCREEN_ID = C.SCREEN_ID
WHERE D.SCREEN_AUTH = '1'
ORDER BY S.SYSTEM_NAME, R.ROLE_ID, D.SCREEN_ID
`;


const DEDUPE_USER_ROLE_SQL = `
WITH x AS (
  SELECT *,
         ROW_NUMBER() OVER (
           PARTITION BY SYSTEM_NAME, USERNAME, ROLE_ID
           ORDER BY CHANGED_DATE DESC, CREATED_DATE DESC, USERNAME ASC
         ) AS rn
  FROM dbo.TB_T_LDAP_USER_ROLE
)
DELETE FROM x WHERE rn > 1;
`;

const DEDUPE_ROLE_FUNC_SQL = `
WITH y AS (
  SELECT *,
         ROW_NUMBER() OVER (
           PARTITION BY SYSTEM_NAME, ROLE_ID, SCREEN_ID
           ORDER BY CHANGED_DATE DESC, CREATED_DATE DESC, SCREEN_ID ASC
         ) AS rn
  FROM dbo.TB_T_LDAP_ROLE_FUNCTION
)
DELETE FROM y WHERE rn > 1;
`;


const MERGE_USER_ROLE_SQL = `
INSERT INTO dbo.TB_R_USER_ROLE (
    APPLICATION_NAME, USERNAME, NO_REG, COMPANY_CODE, 
    ROLE_ID, ROLE_NAME, CREATED_BY, CREATED_DT
)
SELECT DISTINCT
    t.SYSTEM_NAME, 
    t.USERNAME,
    t.NO_REG,
    t.COMPANY_CODE,
    t.ROLE_ID, 
    t.ROLE_NAME,
    'LDAP_SYNC',
    GETDATE()
FROM dbo.TB_T_LDAP_USER_ROLE AS t
JOIN dbo.TB_M_EMPLOYEE AS e ON e.NOREG = t.NO_REG 
WHERE NOT EXISTS (
  SELECT 1 
  FROM dbo.TB_R_USER_ROLE AS r
  WHERE r.NO_REG = t.NO_REG 
    AND r.ROLE_ID = t.ROLE_ID
    AND r.APPLICATION_NAME = t.SYSTEM_NAME
);
`;

const MERGE_ROLE_FUNC_SQL = `
INSERT INTO dbo.TB_R_ROLE_FUNCTION (
    APPLICATION_NAME, ROLE_ID, ROLE_NAME, 
    SCREEN_ID, SCREEN_NAME, CREATED_BY, CREATED_DT
)
SELECT DISTINCT
    t.SYSTEM_NAME,
    t.ROLE_ID, 
    t.ROLE_NAME,
    t.SCREEN_ID,
    t.SCREEN_NAME,
    'LDAP_SYNC',
    GETDATE()
FROM dbo.TB_T_LDAP_ROLE_FUNCTION AS t
WHERE NOT EXISTS (
  SELECT 1 
  FROM dbo.TB_R_ROLE_FUNCTION AS rf
  WHERE rf.ROLE_ID = t.ROLE_ID
    AND rf.SCREEN_ID = t.SCREEN_ID
    AND rf.APPLICATION_NAME = t.SYSTEM_NAME
);
`;


export async function runLdapSyncWorker(context: LdapSyncWorkerContext) {
    const { sarPrisma, scPrisma, log } = context;

    log.info("Starting LDAP Sync Process (Append Only)...");

    try {

        log.info("Step 1: Truncating LDAP temp tables...");
        await sarPrisma.tB_T_LDAP_USER_ROLE.deleteMany({});
        await sarPrisma.tB_T_LDAP_ROLE_FUNCTION.deleteMany({});



        log.info("Step 2: Extracting data...");
        const userRoles = await scPrisma.$queryRawUnsafe<any[]>(EXTRACT_USER_ROLE_SQL);
        const roleFuncs = await scPrisma.$queryRawUnsafe<any[]>(EXTRACT_ROLE_FUNC_SQL);

        log.info(` -> Extracted ${userRoles.length} User-Roles`);
        log.info(` -> Extracted ${roleFuncs.length} Role-Functions`);


        log.info("Step 3: Loading to Temp...");
        const now = new Date();

        if (userRoles.length > 0) {
            await sarPrisma.tB_T_LDAP_USER_ROLE.createMany({
                data: userRoles.map((r) => ({
                    SYSTEM_NAME: r.SYSTEM_NAME,
                    USERNAME: r.USERNAME,
                    NO_REG: r.NO_REG,
                    COMPANY_CODE: r.COMPANY_CODE,
                    ROLE_ID: r.ROLE_ID,
                    ROLE_NAME: r.ROLE_NAME,
                    CREATED_BY: 'LDAP_EXTRACT',
                    CREATED_DATE: now,
                })),
            });
        }

        if (roleFuncs.length > 0) {
            await sarPrisma.tB_T_LDAP_ROLE_FUNCTION.createMany({
                data: roleFuncs.map((r) => ({
                    SYSTEM_NAME: r.SYSTEM_NAME,
                    ROLE_ID: r.ROLE_ID,
                    ROLE_NAME: r.ROLE_NAME,
                    SCREEN_ID: r.SCREEN_ID,
                    SCREEN_NAME: r.SCREEN_NAME,
                    CREATED_BY: 'LDAP_EXTRACT',
                    CREATED_DATE: now,
                })),
            });
        }



        log.info("Step 4: Deduplicating Staged Data...");
        const dedupedUR = await sarPrisma.$executeRawUnsafe(DEDUPE_USER_ROLE_SQL);
        const dedupedRF = await sarPrisma.$executeRawUnsafe(DEDUPE_ROLE_FUNC_SQL);
        log.info(` -> Removed ${dedupedUR + dedupedRF} duplicates.`);



        log.info("Step 5: Merging to Final (Add New Only)...");

        const newPermissions = await sarPrisma.$executeRawUnsafe(MERGE_USER_ROLE_SQL);
        log.info(` -> Inserted ${newPermissions} NEW User-Role assignments.`);

        const newFunctions = await sarPrisma.$executeRawUnsafe(MERGE_ROLE_FUNC_SQL);
        log.info(` -> Inserted ${newFunctions} NEW Role-Function mappings.`);


        log.info("LDAP Sync Complete.");

    } catch (error) {
        log.error(error, "LDAP Sync Failed");
        throw error;
    }
}