import type { PrismaClient } from "../../generated/prisma";
import type { FastifyBaseLogger } from "fastify";

type TerminationBatchStep =
  | "LOAD_TEMP"
  | "VALIDATE_TEMP"
  | "INSERT_TERMINATION"
  | "FINALIZE";

async function execSp(
  prisma: PrismaClient,
  logger: FastifyBaseLogger,
  step: TerminationBatchStep,
  spName: string
) {
  logger.info({ step, spName }, `[BATCH_TERMINATION] Executing step: ${step} (${spName})`);

  const affected = await prisma.$executeRawUnsafe(
    `EXEC dbo.${spName}`
  );

  logger.info(
    { step, spName, affected },
    `[BATCH_TERMINATION] Finished step: ${step} (${spName}), affected=${affected}`
  );

  return affected;
}

/**
 * Jalankan seluruh proses batch termination SAR.04
 * Urutan:
 *  1. sp_SAR04_LoadTempEmployeeTermination
 *  2. sp_SAR04_ValidateTempEmployeeTermination
 *  3. sp_SAR04_InsertEmployeeTerminationFromTemp
 *  4. sp_SAR04_UpdateMasterEmployeeFromTemp
 */
export async function runBatchTermination(
  prisma: PrismaClient,
  logger: FastifyBaseLogger
) {
  logger.info("[BATCH_TERMINATION] ===== START nightly termination batch =====");

  try {
    await execSp(prisma, logger, "LOAD_TEMP", "SP_SAR04_LOADTEMP_EMPLOYEE_TERMINATION");
    await execSp(prisma, logger, "VALIDATE_TEMP", "SP_SAR04_VALIDATETEMP_EMPLOYEE_TERMINATION");
    await execSp(prisma, logger, "INSERT_TERMINATION", "SP_SAR04_INSERTEMPLOYEETERMINATIONFROMTEMP");
    // await execSp(prisma, logger, "FINALIZE", "sp_SAR04_UpdateMasterEmployeeFromTemp");

    logger.info("[BATCH_TERMINATION] ✅ All steps finished successfully.");
  } catch (err) {
    logger.error({ err }, "[BATCH_TERMINATION] ❌ Batch termination failed");
    throw err;
  }

  logger.info("[BATCH_TERMINATION] ===== END nightly termination batch =====");
}
