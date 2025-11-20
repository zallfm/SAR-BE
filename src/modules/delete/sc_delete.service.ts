import { FastifyBaseLogger } from 'fastify';
import { PrismaClient as SarPrismaClient } from '../../generated/prisma/index.js';
import { PrismaClient as ScPrismaClient } from '../../generated/prisma-sc/index.js';


const SQL_SC_REVOKE_ACCESS = `
DELETE A
FROM dbo.TB_M_AUTHORIZATION A
JOIN dbo.TB_M_USER U ON U.USERNAME = A.USERNAME
WHERE EXISTS (
    SELECT 1 
    FROM [SAR_DB].dbo.TB_R_UAR_DIVISION_USER X 
    WHERE X.USERNAME = A.USERNAME 
      AND X.ROLE_ID = A.ROLE_ID 
      AND X.APPLICATION_ID = A.APPLICATION_ID
      AND X.SO_APPROVAL_STATUS = 'R' 
      AND X.REMEDIATED_STATUS IS NULL
)
OR EXISTS (
    SELECT 1 
    FROM [SAR_DB].dbo.TB_R_UAR_SYSTEM_OWNER Y
    WHERE Y.USERNAME = A.USERNAME 
      AND Y.ROLE_ID = A.ROLE_ID 
      AND Y.APPLICATION_ID = A.APPLICATION_ID
      AND Y.SO_APPROVAL_STATUS = 'R' 
      AND Y.REMEDIATED_STATUS IS NULL
);
`;

const SQL_SC_TERMINATE_ACCESS = `
DELETE A
FROM dbo.TB_M_AUTHORIZATION A
JOIN dbo.TB_M_USER U ON U.USERNAME = A.USERNAME
WHERE EXISTS (
    SELECT 1 
    FROM [SAR_DB].dbo.TB_M_EMPLOYEE_TERMINATION T
    WHERE T.NOREG = U.NOREG -- using NOREG to be safe, or USERNAME if consistent
      AND CAST(T.VALID_TO AS DATE) <= CAST(GETDATE() AS DATE)
      AND T.REMEDIATED_STATUS = '0'
);
`;


const SQL_SAR_REVOKE_DIV = `
DELETE T FROM dbo.TB_R_USER_ROLE T
JOIN dbo.TB_R_UAR_DIVISION_USER U 
  ON T.USERNAME = U.USERNAME AND T.ROLE_ID = U.ROLE_ID AND T.APPLICATION_NAME = U.APPLICATION_ID
WHERE U.SO_APPROVAL_STATUS = 'R' AND U.REMEDIATED_STATUS IS NULL;
`;

const SQL_SAR_REVOKE_SO = `
DELETE T FROM dbo.TB_R_USER_ROLE T
JOIN dbo.TB_R_UAR_SYSTEM_OWNER U 
  ON T.USERNAME = U.USERNAME AND T.ROLE_ID = U.ROLE_ID AND T.APPLICATION_NAME = U.APPLICATION_ID
WHERE U.SO_APPROVAL_STATUS = 'R' AND U.REMEDIATED_STATUS IS NULL;
`;

const SQL_SAR_TERMINATE = `
DELETE T FROM dbo.TB_R_USER_ROLE T
JOIN dbo.TB_M_EMPLOYEE_TERMINATION E ON T.NO_REG = E.NOREG
WHERE CAST(E.VALID_TO AS DATE) <= CAST(GETDATE() AS DATE) AND E.REMEDIATED_STATUS = '0';
`;


export async function executeRemediationBatch(
    sarPrisma: SarPrismaClient,
    scPrisma: ScPrismaClient,
    log: FastifyBaseLogger
) {
    log.info("Starting Full Access Remediation (SC + SAR)...");

    try {

        log.info(" -> Executing SC Deletions...");
        const scRevokeCount = await scPrisma.$executeRawUnsafe(SQL_SC_REVOKE_ACCESS);
        const scTermCount = await scPrisma.$executeRawUnsafe(SQL_SC_TERMINATE_ACCESS);

        log.info(`    SC: Revoked ${scRevokeCount} roles, Terminated ${scTermCount} users.`);



        log.info(" -> Executing SAR Local Cleanup...");

        const sarDivCount = await sarPrisma.$executeRawUnsafe(SQL_SAR_REVOKE_DIV);
        const sarSoCount = await sarPrisma.$executeRawUnsafe(SQL_SAR_REVOKE_SO);
        const sarTermCount = await sarPrisma.$executeRawUnsafe(SQL_SAR_TERMINATE);



        if (scRevokeCount > 0 || sarDivCount > 0 || sarSoCount > 0) {
            await sarPrisma.$executeRawUnsafe(`
                UPDATE dbo.TB_R_UAR_DIVISION_USER SET REMEDIATED_STATUS = 'Y', REMEDIATED_DT = GETDATE()
                WHERE SO_APPROVAL_STATUS = 'R' AND REMEDIATED_STATUS IS NULL;
                
                UPDATE dbo.TB_R_UAR_SYSTEM_OWNER SET REMEDIATED_STATUS = 'Y', REMEDIATED_DT = GETDATE()
                WHERE SO_APPROVAL_STATUS = 'R' AND REMEDIATED_STATUS IS NULL;
            `);
        }

        if (scTermCount > 0 || sarTermCount > 0) {
            await sarPrisma.$executeRawUnsafe(`
                UPDATE dbo.TB_M_EMPLOYEE_TERMINATION SET REMEDIATED_STATUS = '1', REMEDIATED_DT = GETDATE()
                WHERE CAST(VALID_TO AS DATE) <= CAST(GETDATE() AS DATE) AND REMEDIATED_STATUS = '0';
            `);
        }

        return { scRevokeCount, scTermCount, sarDivCount, sarSoCount, sarTermCount };

    } catch (error) {
        log.error(error, "Remediation Failed");
        throw error;
    }
}