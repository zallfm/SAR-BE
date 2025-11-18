import schedule from "node-schedule";
import { runWorker } from "../workers/test.worker";
import { FastifyInstance } from "fastify";
import {
  runPaPusherWorker,
  runUarDailyReminderWorker,
  runUarSOSyncWorker,
  runUarSOWorker,
} from "../workers/schedule.worker";
import { initBatchArcScheduler } from "../modules/batch/batch_arc&purg.service";
export async function startScheduler(app: FastifyInstance) {
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

  await initBatchArcScheduler()

  app.log.info("Scheduler started: Job scheduled to run every minute.");
}
