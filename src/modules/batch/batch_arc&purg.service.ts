import cron from "node-cron";
import { prisma } from "../../db/prisma";

type SystemConfig = {
    SYSTEM_TYPE: string;
    SYSTEM_CD: string | null;
    VALID_FROM_DT: Date;
    VALID_TO_DT: Date | null;
    VALUE_TEXT: string | null;
    VALUE_NUM: number | null;
    VALUE_TIME: any;
};

async function getBatchArcConfig(): Promise<SystemConfig | null> {
    const now = new Date();

    const cfg = await prisma.tB_M_SYSTEM.findFirst({
        where: {
            SYSTEM_TYPE: process.env.SYSTEM_TYPE,
            VALID_FROM_DT: { lte: now }
            // ❌ tidak usah filter VALID_TO_DT di sini
        },
        orderBy: { VALID_FROM_DT: "desc" }
    });

    return cfg as unknown as SystemConfig;
}

function isWithinValidity(cfg: SystemConfig): boolean {
    const now = new Date();
    if (now < cfg.VALID_FROM_DT) return false;
    if (cfg.VALID_TO_DT && now > cfg.VALID_TO_DT) return false;
    return true;
}

function buildCron(cfg: SystemConfig): string | null {
    if (!cfg.VALUE_TIME || cfg.VALUE_NUM == null) {
        console.error("[BATCH_ARC] VALUE_TIME or VALUE_NUM is empty!");
        return null;
    }

    let timeStr: string;

    if (typeof cfg.VALUE_TIME === "string") {
        timeStr = cfg.VALUE_TIME; // sudah string → aman
    } else if (cfg.VALUE_TIME instanceof Date) {
        // SQL TIME → Prisma Date object
        // Format ke HH:mm:ss
        const h = cfg.VALUE_TIME.getHours().toString().padStart(2, "0");
        const m = cfg.VALUE_TIME.getMinutes().toString().padStart(2, "0");
        const s = cfg.VALUE_TIME.getSeconds().toString().padStart(2, "0");
        timeStr = `${h}:${m}:${s}`;
    } else {
        console.error("[BATCH_ARC] VALUE_TIME unknown type:", cfg.VALUE_TIME);
        return null;
    }

    // Sekarang pasti string format HH:mm:ss
    const [hh, mm] = timeStr.split(":");

    const hour = Number(hh ?? 0);
    const minute = Number(mm ?? 0);
    const every = cfg.VALUE_NUM || 1;

    switch ((cfg.VALUE_TEXT ?? "").toLowerCase()) {
        case "month":
            return `${minute} ${hour} 1 */${every} *`;
        default:
            console.warn(`[BATCH_ARC] VALUE_TEXT '${cfg.VALUE_TEXT}' not supported yet!`);
            return null;
    }
}

let isRunning = false;

async function runBatchArc(): Promise<void> {
    if (isRunning) {
        console.log("[BATCH_ARC] Job is still running, skip…");
        return;
    }

    isRunning = true;
    console.log("[BATCH_ARC] ⏳ Start proses batch & archive...");

    try {
        console.log("[BATCH_ARC] ▶ EXEC dbo.sp_peff_copy_all_from_SAR");
        await prisma.$executeRawUnsafe(`EXEC dbo.sp_peff_copy_all_from_SAR`);

        console.log("[BATCH_ARC] ▶ EXEC dbo.sp_peff_archive_all_from_config");
        await prisma.$executeRawUnsafe(`EXEC dbo.sp_peff_archive_all_from_config`);

        console.log("[BATCH_ARC] ✅ Complete all processes!");
    } catch (err) {
        console.error("[BATCH_ARC] ❌ Error running SP:", err);
    } finally {
        isRunning = false;
    }
}

export async function initBatchArcScheduler(): Promise<void> {
    const cfg = await getBatchArcConfig();

    if (!cfg) {
        console.warn("[BATCH_ARC] Found no active configuration.");
        return;
    }

    let cronExpr = buildCron(cfg);
    if (!cronExpr) {
        console.warn("[BATCH_ARC] Cron expression failed to create.");
        return;
    }

    if (process.env.NODE_ENV === "development") {
        console.log("[BATCH_ARC] DEV MODE: override schedule to every 1 minute.");
        cronExpr = "* * * * *";
    }

    console.log("=========================================");
    console.log("     BATCH & ARCHIVE SCHEDULER READY     ");
    console.log("=========================================");
    console.log("SYSTEM_TYPE  :", cfg.SYSTEM_TYPE);
    console.log("VALUE_TEXT   :", cfg.VALUE_TEXT);
    console.log("VALUE_NUM    :", cfg.VALUE_NUM);
    console.log("VALUE_TIME   :", cfg.VALUE_TIME);
    console.log("VALID_FROM   :", cfg.VALID_FROM_DT);
    console.log("VALID_TO     :", cfg.VALID_TO_DT ?? "∞");
    console.log("CRON         :", cronExpr);
    console.log("=========================================");

    cron.schedule(
        cronExpr,
        async () => {
            if (!isWithinValidity(cfg)) {
                console.log("[BATCH_ARC] Config is invalid, skip job.");
                return;
            }
            await runBatchArc();
        },
        {
            timezone: "Asia/Jakarta"
        }
    );

    console.log("[BATCH_ARC] Scheduler successfully activated.");
}
