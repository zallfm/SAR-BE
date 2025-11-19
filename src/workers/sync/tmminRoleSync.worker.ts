import { FastifyInstance } from 'fastify';
import { PrismaClient as SarPrismaClient } from '../../generated/prisma/index.js';
import { PrismaClient as SourcePrismaClient } from '../../generated/prisma-tmmin/index.js';

export type TmminRoleSyncWorkerContext = {
    sarPrisma: SarPrismaClient;
    scPrisma: SourcePrismaClient;
    log: FastifyInstance['log'];
};


const EXTRACT_USER_ROLE_SQL = `
SELECT
    H.APPLICATION_ID AS SYSTEM_NAME,
    H.USERNAME,
    U.REG_NO AS NO_REG,
    H.ROLE_ID,
    H.ROLE_NAME
FROM TB_M_ROLE_HEADER AS H
JOIN TB_M_USER AS U ON H.USERNAME = U.USERNAME
ORDER BY H.USERNAME, H.ROLE_ID
`;

const EXTRACT_ROLE_FUNC_SQL = `
SELECT DISTINCT
    H.APPLICATION_ID AS SYSTEM_NAME,
    H.ROLE_ID,
    H.ROLE_NAME,
    D.SCREEN_ID
FROM TB_M_ROLE_HEADER AS H
JOIN TB_M_ROLE_DETAIL AS D ON H.ROLE_ID = D.ROLE_ID
ORDER BY H.ROLE_ID, D.SCREEN_ID
`;


const DEDUPE_USER_ROLE_SQL = `
WITH x AS (
  SELECT *,
         ROW_NUMBER() OVER (
           PARTITION BY SYSTEM_NAME, USERNAME, ROLE_ID
           ORDER BY CHANGED_DATE DESC, CREATED_DATE DESC, USERNAME ASC
         ) AS rn
  FROM dbo.TB_T_TMMINROLE_USER_ROLE
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
  FROM dbo.TB_T_TMMINROLE_ROLE_FUNCTION
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
    'TMMIN_SYNC',
    GETDATE()
FROM dbo.TB_T_TMMINROLE_USER_ROLE AS t
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
    'TMMIN_SYNC',
    GETDATE()
FROM dbo.TB_T_TMMINROLE_ROLE_FUNCTION AS t
WHERE NOT EXISTS (
  SELECT 1 
  FROM dbo.TB_R_ROLE_FUNCTION AS rf
  WHERE rf.ROLE_ID = t.ROLE_ID
    AND rf.SCREEN_ID = t.SCREEN_ID
    AND rf.APPLICATION_NAME = t.SYSTEM_NAME
);
`;


export async function runTmminRoleSyncWorker(context: TmminRoleSyncWorkerContext) {
    const { sarPrisma, scPrisma, log } = context;

    log.info("Starting TMMINROLE Sync Process...");

    try {

        log.info("Step 1: Truncating TMMINROLE temp tables...");
        await sarPrisma.tB_T_TMMINROLE_USER_ROLE.deleteMany({});
        await sarPrisma.tB_T_TMMINROLE_ROLE_FUNCTION.deleteMany({});



        log.info("Step 2: Extracting data...");
        const userRoles = await scPrisma.$queryRawUnsafe<any[]>(EXTRACT_USER_ROLE_SQL);
        const roleFuncs = await scPrisma.$queryRawUnsafe<any[]>(EXTRACT_ROLE_FUNC_SQL);

        log.info(` -> Extracted ${userRoles.length} User-Roles`);
        log.info(` -> Extracted ${roleFuncs.length} Role-Functions`);



        log.info("Step 3: Loading to Temp...");
        const now = new Date();

        if (userRoles.length > 0) {
            await sarPrisma.tB_T_TMMINROLE_USER_ROLE.createMany({
                data: userRoles.map((r) => ({
                    SYSTEM_NAME: r.SYSTEM_NAME,
                    USERNAME: r.USERNAME,
                    NO_REG: r.NO_REG,
                    COMPANY_CODE: null,
                    ROLE_ID: r.ROLE_ID,
                    ROLE_NAME: r.ROLE_NAME,
                    CREATED_BY: 'TMMIN_EXTRACT',
                    CREATED_DATE: now,
                })),
            });
        }

        if (roleFuncs.length > 0) {
            await sarPrisma.tB_T_TMMINROLE_ROLE_FUNCTION.createMany({
                data: roleFuncs.map((r) => ({
                    SYSTEM_NAME: r.SYSTEM_NAME,
                    ROLE_ID: r.ROLE_ID,
                    ROLE_NAME: r.ROLE_NAME,
                    SCREEN_ID: r.SCREEN_ID,
                    SCREEN_NAME: null,
                    CREATED_BY: 'TMMIN_EXTRACT',
                    CREATED_DATE: now,
                })),
            });
        }



        log.info("Step 4: Deduplicating Staged Data...");
        const dedupedUR = await sarPrisma.$executeRawUnsafe(DEDUPE_USER_ROLE_SQL);
        const dedupedRF = await sarPrisma.$executeRawUnsafe(DEDUPE_ROLE_FUNC_SQL);
        log.info(` -> Removed ${dedupedUR + dedupedRF} duplicates.`);


        log.info("Step 5: Merging to Final Tables...");

        const newPermissions = await sarPrisma.$executeRawUnsafe(MERGE_USER_ROLE_SQL);
        log.info(` -> Inserted ${newPermissions} NEW User-Role assignments.`);

        const newFunctions = await sarPrisma.$executeRawUnsafe(MERGE_ROLE_FUNC_SQL);
        log.info(` -> Inserted ${newFunctions} NEW Role-Function mappings.`);


        log.info("TMMINROLE Sync Complete.");

    } catch (error) {
        log.error(error, "TMMINROLE Sync Failed");
        throw error;
    }
}