import schedule from "node-schedule";
import { runPaPusherWorker, runUarDailyReminderWorker, runUarSOSyncWorker, runUarSOWorker, } from "../workers/schedule.worker";
export async function startScheduler(app) {
    const scheduledJob = () => {
        // runWorker(app);
        // runUarDailyReminderWorker(app);
        runUarSOWorker(app);
        runUarSOSyncWorker(app);
        runPaPusherWorker(app);
    };
    const scheduleNotifReminderJob = () => {
        runUarDailyReminderWorker(app);
    };
    schedule.scheduleJob("*/1 * * * *", scheduledJob);
    schedule.scheduleJob("59 7 * * *", scheduleNotifReminderJob);
    app.log.info("Scheduler started: Job scheduled to run every minute.");
}
