import { FastifyInstance } from 'fastify';
import { PrismaClient as SarPrismaClient } from '../../generated/prisma/index.js';
import { PrismaClient as ScPrismaClient } from '../../generated/prisma-sc/index.js';


export type SecuritySyncWorkerContext = {
    sarPrisma: SarPrismaClient;
    scPrisma: ScPrismaClient;
    log: FastifyInstance['log'];
};

const EXTRACT_USER_ROLE_SQL = `
SELECT 
    APP.NAME AS APPLICATION_NAME,
    A.USERNAME,
    U.REG_NO,
    CAST(U.COMPANY AS NVARCHAR(50)) AS COMPANY_CODE,
    A.ROLE AS ROLE_ID,
    R.NAME AS ROLE_NAME
FROM 
    TB_M_AUTHORIZATION A
JOIN 
    TB_M_USER U ON U.USERNAME = A.USERNAME
LEFT JOIN 
    TB_M_ROLE R ON R.ID = A.ROLE AND R.APPLICATION = A.APPLICATION
JOIN 
    TB_M_APPLICATION APP ON A.APPLICATION = APP.ID
`;

const EXTRACT_ROLE_FUNCTION_SQL = `
SELECT DISTINCT 
    A.APPLICATION AS APPLICATION_NAME,
    A.ROLE AS ROLE_ID,
    R.NAME AS ROLE_NAME,
    A.[FUNCTION] AS SCREEN_ID,
    F.DESCRIPTION AS SCREEN_NAME
FROM 
    TB_M_AUTHORIZATION A
JOIN 
    TB_M_ROLE R ON A.ROLE = R.ID AND R.APPLICATION = A.APPLICATION
JOIN 
    TB_M_FUNCTION F ON A.[FUNCTION] = F.ID AND F.APPLICATION = A.APPLICATION
`;

const DEDUPE_USER_ROLE_SQL = `
WITH x AS (
  SELECT *,
         ROW_NUMBER() OVER (
           PARTITION BY APPLICATION_NAME, USERNAME, ROLE_ID
           ORDER BY CHANGED_DT DESC, CREATED_DT DESC, USERNAME ASC
         ) AS rn
  FROM dbo.TB_T_SC_USER_ROLE
)
DELETE FROM x WHERE rn > 1;
`;

const DEDUPE_ROLE_FUNCTION_SQL = `
WITH y AS (
  SELECT *,
         ROW_NUMBER() OVER (
           PARTITION BY APPLICATION_NAME, ROLE_ID, SCREEN_ID
           ORDER BY CHANGED_DT DESC, CREATED_DT DESC, SCREEN_ID ASC
         ) AS rn
  FROM dbo.TB_T_SC_ROLE_FUNCTION
)
DELETE FROM y WHERE rn > 1;
`;

const DELETE_OLD_USER_ROLE_SQL = `
DELETE r
FROM dbo.TB_R_USER_ROLE r
WHERE 
    -- 1. Delete if the user/role combo is no longer in the temp table
    NOT EXISTS (
        SELECT 1 FROM dbo.TB_T_SC_USER_ROLE t
        WHERE t.NO_REG = r.NO_REG -- Fixed this line
          AND t.ROLE_ID = r.ROLE_ID
          AND t.APPLICATION_NAME = r.APPLICATION_NAME
    )
    -- 2. OR Delete if the user no longer exists in the employee master
    OR NOT EXISTS (
        SELECT 1 FROM dbo.TB_M_EMPLOYEE e
        WHERE e.NOREG = r.NO_REG -- Fixed this line
    );
`;

const DELETE_OLD_ROLE_FUNCTION_SQL = `
DELETE rf
FROM dbo.TB_R_ROLE_FUNCTION rf
WHERE
    -- Delete if the role/function combo is no longer in the temp table
    NOT EXISTS (
        SELECT 1 FROM dbo.TB_T_SC_ROLE_FUNCTION t
        WHERE t.ROLE_ID = rf.ROLE_ID 
          AND t.SCREEN_ID = rf.SCREEN_ID -- Fixed this line
          AND t.APPLICATION_NAME = rf.APPLICATION_NAME
    );
`;

const INSERT_NEW_USER_ROLE_SQL = `
INSERT INTO dbo.TB_R_USER_ROLE (
    APPLICATION_NAME, USERNAME, NO_REG, COMPANY_CODE, 
    ROLE_ID, ROLE_NAME, CREATED_BY, CREATED_DT, CHANGED_BY, CHANGED_DT
)
SELECT 
    t.APPLICATION_NAME,
    t.USERNAME,
    t.NO_REG,
    t.COMPANY_CODE,
    t.ROLE_ID, 
    t.ROLE_NAME,
    t.CREATED_BY, 
    t.CREATED_DT,
    t.CHANGED_BY,
    t.CHANGED_DT
FROM dbo.TB_T_SC_USER_ROLE t 
JOIN dbo.TB_M_EMPLOYEE e ON e.NOREG = t.NO_REG -- Validate against employee master
WHERE NOT EXISTS (
    SELECT 1 FROM dbo.TB_R_USER_ROLE r
    WHERE r.NO_REG = t.NO_REG -- Fixed this line
      AND r.ROLE_ID = t.ROLE_ID
      AND r.APPLICATION_NAME = t.APPLICATION_NAME
);
`;

const INSERT_NEW_ROLE_FUNCTION_SQL = `
INSERT INTO dbo.TB_R_ROLE_FUNCTION (
    APPLICATION_NAME, ROLE_ID, ROLE_NAME, 
    SCREEN_ID, SCREEN_NAME, CREATED_BY, CREATED_DT, CHANGED_BY, CHANGED_DT
)
SELECT DISTINCT 
    t.APPLICATION_NAME,
    t.ROLE_ID, 
    t.ROLE_NAME,
    t.SCREEN_ID,
    t.SCREEN_NAME,
    t.CREATED_BY,
    t.CREATED_DT,
    t.CHANGED_BY,
    t.CHANGED_DT
FROM dbo.TB_T_SC_ROLE_FUNCTION t 
WHERE NOT EXISTS (
    SELECT 1 FROM dbo.TB_R_ROLE_FUNCTION rf
    WHERE rf.ROLE_ID = t.ROLE_ID 
      AND rf.SCREEN_ID = t.SCREEN_ID -- Fixed this line
      AND rf.APPLICATION_NAME = t.APPLICATION_NAME
);
`;

export async function runGlobalSecuritySyncWorker(context: SecuritySyncWorkerContext) {
    const { sarPrisma, scPrisma, log } = context;

    log.info("Starting Security Center (SC) database sync...");

    try {
        log.info("Step 1: Truncating SAR temp tables...");
        await sarPrisma.tB_T_SC_USER_ROLE.deleteMany({});
        await sarPrisma.tB_T_SC_ROLE_FUNCTION.deleteMany({});
        log.info(" -> Temp tables truncated.");


        log.info("Step 2: Extracting data from SC database...");
        const userRoleData: any[] = await scPrisma.$queryRawUnsafe(EXTRACT_USER_ROLE_SQL);
        log.info(` -> Fetched ${userRoleData.length} user-role records.`);

        const roleFuncData: any[] = await scPrisma.$queryRawUnsafe(EXTRACT_ROLE_FUNCTION_SQL);
        log.info(` -> Fetched ${roleFuncData.length} role-function records.`);


        log.info("Step 3: Loading data into SAR temp tables...");
        const now = new Date();
        const userRolesToCreate = userRoleData.map(r => ({
            APPLICATION_NAME: r.APPLICATION_NAME,
            USERNAME: r.USERNAME,
            NO_REG: r.REG_NO,
            COMPANY_CODE: r.COMPANY_CODE,
            ROLE_ID: r.ROLE_ID,
            ROLE_NAME: r.ROLE_NAME,
            CREATED_BY: 'SYSTEM_SYNC',
            CREATED_DT: now,
        }));

        const roleFuncsToCreate = roleFuncData.map(r => ({
            APPLICATION_NAME: r.APPLICATION_NAME,
            ROLE_ID: r.ROLE_ID,
            ROLE_NAME: r.ROLE_NAME,
            SCREEN_ID: r.SCREEN_ID,
            SCREEN_NAME: r.SCREEN_NAME,
            CREATED_BY: 'SYSTEM_SYNC',
            CREATED_DT: now,
        }));

        if (userRolesToCreate.length > 0) {
            await sarPrisma.tB_T_SC_USER_ROLE.createMany({ data: userRolesToCreate });
        }
        log.info(` -> Loaded ${userRolesToCreate.length} user-role records.`);

        if (roleFuncsToCreate.length > 0) {
            await sarPrisma.tB_T_SC_ROLE_FUNCTION.createMany({ data: roleFuncsToCreate });
        }
        log.info(` -> Loaded ${roleFuncsToCreate.length} role-function records.`);


        log.info("Step 4: Validating data in SAR temp tables...");
        log.info(" -> Running deduplication...");
        const userRoleDupes = await sarPrisma.$executeRawUnsafe(DEDUPE_USER_ROLE_SQL);
        log.info(` -> Removed ${userRoleDupes} duplicate user-role records.`);

        const roleFuncDupes = await sarPrisma.$executeRawUnsafe(DEDUPE_ROLE_FUNCTION_SQL);
        log.info(` -> Removed ${roleFuncDupes} duplicate role-function records.`);


        log.info("Step 5: Storing to final transaction tables...");
        log.info(" -> Step 5a: Deleting old permissions...");
        const deletedUserRoles = await sarPrisma.$executeRawUnsafe(DELETE_OLD_USER_ROLE_SQL);
        log.info(` -> Removed ${deletedUserRoles} old records from TB_R_USER_ROLE.`);

        const deletedRoleFuncs = await sarPrisma.$executeRawUnsafe(DELETE_OLD_ROLE_FUNCTION_SQL);
        log.info(` -> Removed ${deletedRoleFuncs} old records from TB_R_ROLE_FUNCTION.`);

        log.info(" -> Step 5b: Adding new permissions...");
        const finalUserRoles = await sarPrisma.$executeRawUnsafe(INSERT_NEW_USER_ROLE_SQL);
        log.info(` -> Inserted ${finalUserRoles} new records into TB_R_USER_ROLE.`);

        const finalRoleFuncs = await sarPrisma.$executeRawUnsafe(INSERT_NEW_ROLE_FUNCTION_SQL);
        log.info(` -> Inserted ${finalRoleFuncs} new records into TB_R_ROLE_FUNCTION.`);

        log.info("Security Center Sync complete.");

    } catch (error) {
        log.error(error, "Security Sync failed");
        throw error;
    }
}