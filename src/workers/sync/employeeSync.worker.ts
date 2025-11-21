import { FastifyInstance } from 'fastify';
import { PrismaClient as SarPrismaClient } from '../../generated/prisma/index.js';

export type EmployeeSyncWorker = {
    sarPrisma: SarPrismaClient;
    log: FastifyInstance['log'];
};

export async function runEmployeeSyncWorker(context: EmployeeSyncWorker) {
    const { sarPrisma, log } = context;

    log.info("Starting Employee database sync via Stored Procedure...");

    try {

        await sarPrisma.$executeRaw`EXEC dbo.sp_SYNC05_SYNC_EMPLOYEE_DATA_HISTORY`;
        
        await sarPrisma.$executeRaw`EXEC dbo.sp_SYNC05_SYNC_EMPLOYEE_DATA`;

        log.info("Security Center Sync complete.");

    } catch (error) {
        log.error(error, "Security Sync failed");
        throw error;
    }
}