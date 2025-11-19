import { WorkerContext } from "../../workers/worker.context";

export type SystemConfig = {
    SYSTEM_TYPE: string;
    SYSTEM_CD: string | null;
    VALID_FROM_DT: Date;
    VALID_TO_DT: Date | null;
    VALUE_TEXT: string | null;
    VALUE_NUM: number | null;
    VALUE_TIME: any;
};

function isWithinValidity(cfg: SystemConfig): boolean {
    const now = new Date();
    if (now < cfg.VALID_FROM_DT) return false;
    if (cfg.VALID_TO_DT && now > cfg.VALID_TO_DT) return false;
    return true;
}


export async function getBatchArcConfig(prisma: any): Promise<SystemConfig | null> {
    const now = new Date();

    const cfg = await prisma.tB_M_SYSTEM.findFirst({
        where: {
            SYSTEM_TYPE: process.env.SYSTEM_TYPE,
            VALID_FROM_DT: { lte: now }
        },
        orderBy: { VALID_FROM_DT: "desc" }
    });

    return cfg as unknown as SystemConfig;
}


export function buildBatchArcCron(cfg: SystemConfig): string | null {
    if (!cfg.VALUE_TIME || cfg.VALUE_NUM == null) return null;

    let timeStr: string;

    if (typeof cfg.VALUE_TIME === "string") {
        timeStr = cfg.VALUE_TIME;
    } else if (cfg.VALUE_TIME instanceof Date) {
        const h = cfg.VALUE_TIME.getHours().toString().padStart(2, "0");
        const m = cfg.VALUE_TIME.getMinutes().toString().padStart(2, "0");
        const s = cfg.VALUE_TIME.getSeconds().toString().padStart(2, "0");
        timeStr = `${h}:${m}:${s}`;
    } else {
        return null;
    }

    const [hh, mm] = timeStr.split(":");
    const hour = Number(hh ?? 0);
    const minute = Number(mm ?? 0);
    const every = cfg.VALUE_NUM || 1;

    switch ((cfg.VALUE_TEXT ?? "").toLowerCase()) {
        case "month":
            return `${minute} ${hour} 1 */${every} *`;
        default:
            return null;
    }
}


export async function runBatchArcWorker(context: WorkerContext, cfg: SystemConfig) {
    const { prisma, log } = context;

    if (!isWithinValidity(cfg)) {
        log.info("[BATCH_ARC] Config is outside validity period. Skipping job.");
        return;
    }

    log.info("[BATCH_ARC] ⏳ Start process batch & archive...");

    try {
        log.info("[BATCH_ARC] ▶ EXEC dbo.sp_peff_copy_all_from_SAR");
        await prisma.$executeRawUnsafe(`EXEC dbo.sp_peff_copy_all_from_SAR`);

        log.info("[BATCH_ARC] ▶ EXEC dbo.sp_peff_archive_all_from_config");
        await prisma.$executeRawUnsafe(`EXEC dbo.sp_peff_archive_all_from_config`);

        log.info("[BATCH_ARC] ✅ Complete all processes!");
    } catch (err) {
        log.error(err, "[BATCH_ARC] ❌ Error running SP");
        throw err;
    }
}