import schedule from "node-schedule";
import { runWorker } from "../workers/test.worker";
import { FastifyInstance } from "fastify";
import { runUarSOSyncWorker, runUarSOWorker } from "../workers/schedule.worker";
export async function startScheduler(app: FastifyInstance) {
  const scheduledJob = () => {
    // runWorker(app);
    // runUarSOWorker(app);
    runUarSOSyncWorker(app);
  };

  schedule.scheduleJob("*/1 * * * *", scheduledJob);

  app.log.info("Scheduler started: Job scheduled to run every minute.");
}
