import schedule from "node-schedule";
import { FastifyInstance } from "fastify";

import { WorkerContext } from "../workers/worker.context";

import { runUarTaskCreationWorker } from "../workers/uar/uarTaskCreation.worker";
import { runUarDailyReminderWorker } from "../workers/uar/uarReminder.worker";
import { runUarSOSyncWorker } from "../workers/uar/uarSync.worker";
import { runNotificationPusherWorker } from "../workers/notification/notificationPusher.worker";
import { runSecuritySyncWorker } from "../workers/sync/scSync.worker";
import { PrismaClient as ScPrismaClient } from "../generated/prisma-sc";
import { PrismaClient as TmminRolePrismaClient } from "../generated/prisma-tmmin";
import { PrismaClient as LdapPrismaClient } from "../generated/prisma-ldap";
import { runGlobalSecuritySyncWorker } from "../workers/sync/globalScSync.worker";
import { runLdapSyncWorker } from "../workers/sync/ldapSync.worker";
import { runTmminRoleSyncWorker } from "../workers/sync/tmminRoleSync.worker";

import { initBatchArcScheduler } from "../modules/batch/batch_arc&purg.service";
export async function startScheduler(app: FastifyInstance) {

  const workerContext: WorkerContext = {
    prisma: app.prisma,
    log: app.log,
  };

  const mainScheduledJob = () => {
    app.log.info("Running 1-minute jobs: UAR Task Creation, UAR SO Sync, Notification Pusher");
    Promise.allSettled([
      runUarTaskCreationWorker(workerContext),
      runUarSOSyncWorker(workerContext),
      runNotificationPusherWorker(workerContext)
    ]).then(results => {
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          app.log.error(result.reason, `A worker in the 1-minute job failed (Job index: ${index})`);
        }
      });
    });
  };


  const scheduleNotifReminderJob = () => {
    app.log.info("Running daily notification reminder job.");
    runUarDailyReminderWorker(workerContext).catch(err => {
      app.log.error(err, "Daily Notification Reminder Worker failed");
    });
  };

  const scheduleSecuritySyncJob = () => {
    app.log.info("Running daily security sync job.");

    if (!(app as any).prismaSC) {
      app.log.error("`app.prismaSC` (Security Center DB) not found. Skipping security sync worker.");
      return;
    }

    const securitySyncContext = {
      sarPrisma: app.prisma,
      scPrisma: (app as any).prismaSC as ScPrismaClient,
      log: app.log
    };

    runSecuritySyncWorker(securitySyncContext).catch(err => {
      app.log.error(err, "Security Sync Worker failed");
    });
  };

  const scheduleGlobalSecuritySyncJob = () => {
    app.log.info("Running daily security sync job.");

    if (!(app as any).prismaGlobalSC) {
      app.log.error("`app.prismaGlobalSC` (Global Security Center DB) not found. Skipping security sync worker.");
      return;
    }

    const securitySyncContext = {
      sarPrisma: app.prisma,
      scPrisma: (app as any).prismaSC as ScPrismaClient,
      log: app.log
    };

    runGlobalSecuritySyncWorker(securitySyncContext).catch(err => {
      app.log.error(err, "Global Security Sync Worker failed");
    });
  };

  const scheduleLdapSyncJob = () => {
    app.log.info("Running daily ldap sync job.");

    if (!(app as any).prismaSC) {
      app.log.error("`app.prismaSC` (LDAP DB) not found. Skipping ldap sync worker.");
      return;
    }

    const ldapSyncContext = {
      sarPrisma: app.prisma,
      scPrisma: (app as any).prismaLdap as LdapPrismaClient,
      log: app.log
    };

    runLdapSyncWorker(ldapSyncContext).catch(err => {
      app.log.error(err, "Security Sync Worker failed");
    });
  };
  const scheduleTmminRoleSyncJob = () => {
    app.log.info("Running daily TMMIN ROLE sync job.");

    if (!(app as any).prismaTmmin) {
      app.log.error("`app.prismaTmmin` (TMMIN ROLE DB) not found. Skipping TMMIN ROLE sync worker.");
      return;
    }

    const tmminRoleSyncContext = {
      sarPrisma: app.prisma,
      scPrisma: (app as any).prismaTmmin as TmminRolePrismaClient,
      log: app.log
    };

    runTmminRoleSyncWorker(tmminRoleSyncContext).catch(err => {
      app.log.error(err, "Security Sync Worker failed");
    });
  };

  // schedule.scheduleJob("*/1 * * * *", mainScheduledJob);
  schedule.scheduleJob("0 8 * * *", scheduleNotifReminderJob);

  await initBatchArcScheduler()
  schedule.scheduleJob("0 0 * * 1", scheduleSecuritySyncJob);
  schedule.scheduleJob("0 0 * * 2", scheduleGlobalSecuritySyncJob);
  schedule.scheduleJob("0 0 * * 3", scheduleLdapSyncJob);
  schedule.scheduleJob("0 0 * * 4", scheduleTmminRoleSyncJob);
  app.log.info("Scheduler started: Jobs are now scheduled.");
}