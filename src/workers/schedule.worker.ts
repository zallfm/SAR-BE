import { FastifyInstance } from "fastify";
import {
  runCreateOnlySync,
  scheduleService,
  fetchFromDB1,
  fetchFromDB2,
  fetchFromDB3,
  fetchFromDB4,
  fetchFromDB5,
} from "../modules/master_data/schedule/schedule.service";
import { UarPic } from "../types/uarPic";
import { Prisma, TB_R_UAR_SYSTEM_OWNER } from "../../src/generated/prisma"; // Assuming Prisma client is generated
import {
  notificationService,
  REMINDER_CODES,
} from "../modules/batch/notif_history.service";

type UarSystemOwner = TB_R_UAR_SYSTEM_OWNER;

export async function runUarSOWorker(app: FastifyInstance) {
  app.log.info("Checking for UAR schedule jobs...");
  const now = new Date();

  try {
    const runningSchedules = await scheduleService.getRunningUarSchedules(app);
    let totalNewUarTasks = 0;
    console.log("runningSchedules", runningSchedules);

    for (const schedule of runningSchedules) {
      app.log.info(
        `Processing schedule for APPLICATION_ID: ${schedule.APPLICATION_ID}`
      );

      const accessMappings = await app.prisma.tB_M_AUTH_MAPPING.findMany({
        where: {
          APPLICATION_ID: schedule.APPLICATION_ID,
          UAR_PROCESS_STATUS: "1",
        },
      });

      if (accessMappings.length === 0) {
        app.log.warn(
          `No active access mappings found for ${schedule.APPLICATION_ID}`
        );
        continue;
      }

      const uarPeriod = `${now.getFullYear()}${(now.getMonth() + 1)
        .toString()
        .padStart(2, "0")}`;
      const uarId = `UAR_${uarPeriod}_${schedule.APPLICATION_ID}`;

      const newUarTasks: Prisma.TB_R_UAR_SYSTEM_OWNERCreateManyInput[] =
        accessMappings.map((mapping) => ({
          UAR_PERIOD: uarPeriod,
          UAR_ID: uarId,
          USERNAME: mapping.USERNAME,
          NOREG: mapping.NOREG,
          NAME: `${mapping.FIRST_NAME} ${mapping.LAST_NAME}`,
          POSITION_NAME: null, // You would join with TB_M_EMPLOYEE to get this
          DIVISION_ID: null, // You would join with TB_M_EMPLOYEE to get this
          DEPARTMENT_ID: null, // You would join with TB_M_EMPLOYEE to get this
          SECTION_ID: null, // You would join with TB_M_EMPLOYEE to get this
          ORG_CHANGED_STATUS: null,
          COMPANY_CD: mapping.COMPANY_CD,
          APPLICATION_ID: mapping.APPLICATION_ID,
          ROLE_ID: mapping.ROLE_ID,
          REVIEWER_NOREG: null,
          REVIEWER_NAME: null,
          REVIEW_STATUS: null,
          REVIEWED_BY: null,
          REVIEWED_DT: null,
          SO_APPROVAL_STATUS: "0",
          SO_APPROVAL_BY: null,
          SO_APPROVAL_DT: null,
          REMEDIATED_STATUS: null,
          REMEDIATED_DT: null,
          CREATED_BY: "system.UarSOWorker",
          CREATED_DT: now,
          CHANGED_BY: null,
          CHANGED_DT: null,
        }));

      const createResult = await app.prisma.tB_R_UAR_SYSTEM_OWNER.createMany({
        data: newUarTasks,
      });

      app.log.info(`Created ${createResult.count} new UAR tasks.`);
      totalNewUarTasks += createResult.count;

      await notificationService.triggerInitialNotifications(
        app,
        newUarTasks.map((task) => ({
          ...task,
          NOREG: task.NOREG ?? null,
        })) as unknown as any[]
      );
    }

    app.log.info(
      `Ticker: Processed ${totalNewUarTasks} UAR System Owners at ${now.toISOString()}`
    );
  } catch (error) {
    app.log.error(
      error,
      "Ticker: A fatal error occurred during the UAR SO worker run."
    );
  }
}

export async function runUarDailyReminderWorker(app: FastifyInstance) {
  app.log.info("Running Daily UAR Reminder Worker...");
  const now = new Date();

  try {
    const pendingTasks = await app.prisma.$queryRaw<
      {
        UAR_ID: string;
        USERNAME: string;
        ROLE_ID: string;
        APPLICATION_ID: string;
        NOREG_SYSTEM_OWNER: string; // The approver
        DAYS_PENDING: number;
        LAST_REMINDER_CODE: string | null;
      }[]
    >`
        SELECT
            uar.UAR_ID,
            uar.USERNAME,
            uar.ROLE_ID,
            uar.APPLICATION_ID,
            app.NOREG_SYSTEM_OWNER,
            DATEDIFF(DAY, uar.CREATED_DT, GETDATE()) AS DAYS_PENDING,
            (
                SELECT TOP 1 h.ITEM_CODE
                FROM TB_R_NOTIFICATION_HISTORY h
                WHERE h.REQUEST_ID = (uar.UAR_ID + uar.USERNAME + uar.ROLE_ID)
                AND h.ITEM_CODE LIKE 'UAR_REMINDER_%'
                ORDER BY h.SENT_DT DESC
            ) AS LAST_REMINDER_CODE
        FROM
            TB_R_UAR_SYSTEM_OWNER uar
        JOIN
            TB_M_APPLICATION app ON uar.APPLICATION_ID = app.APPLICATION_ID
        WHERE
            uar.SO_APPROVAL_STATUS = '0' -- '0' = Pending
            AND DATEDIFF(DAY, uar.CREATED_DT, GETDATE()) BETWEEN 1 AND 7;
    `;

    app.log.info(
      `Found ${pendingTasks.length} pending tasks to check for reminders.`
    );

    let remindersQueued = 0;
    for (const task of pendingTasks) {
      const nextReminderCode = notificationService.getNextReminderCode(
        task.DAYS_PENDING,
        task.LAST_REMINDER_CODE
      );

      if (nextReminderCode) {
        // 2. Queue the next reminder
        await notificationService.queueNotification(app, {
          REQUEST_ID: `${task.UAR_ID}${task.USERNAME}${task.ROLE_ID}`,
          ITEM_CODE: nextReminderCode,
          APPROVER_ID: task.NOREG_SYSTEM_OWNER, // The approver
          DUE_DATE: null, // Reminders don't have a due date
        });
        remindersQueued++;
      }
    }
    app.log.info(`Queued ${remindersQueued} new reminders.`);
  } catch (error) {
    app.log.error(
      error,
      "A fatal error occurred during the reminder worker run."
    );
  }
}

export async function runNotificationSenderWorker(app: FastifyInstance) {
  app.log.info("Running Notification Sender Worker...");

  let candidates = [];
  try {
    candidates = await app.prisma.tB_T_CANDIDATE_NOTIFICATION.findMany({
      where: {
        STATUS: "PENDING",
      },
      take: 50,
    });

    if (candidates.length === 0) {
      app.log.info("No pending notifications to send.");
      return;
    }

    app.log.info(`Found ${candidates.length} notifications to process.`);

    const candidateIds = candidates.map((c) => c.ID);
    await app.prisma.tB_T_CANDIDATE_NOTIFICATION.updateMany({
      where: {
        ID: { in: candidateIds },
        STATUS: "PENDING",
      },
      data: {
        STATUS: "PROCESSING",
      },
    });

    for (const job of candidates) {
      try {
        const employee = await app.prisma.tB_M_EMPLOYEE.findFirst({
          where: {
            NOREG: job.APPROVER_ID,
          },
          select: {
            MAIL: true,
          },
        });

        if (!employee || !employee.MAIL) {
          throw new Error(`No valid email found for NOREG: ${job.APPROVER_ID}`);
        }

        const template = await app.prisma.tB_M_TEMPLATE.findUnique({
          where: {
            ITEM_CODE_LOCALE_CHANNEL: {
              ITEM_CODE: job.ITEM_CODE,
              LOCALE: "en-US",
              CHANNEL: "EMAIL",
            },
          },
        });

        if (!template) {
          throw new Error(
            `No email template found for ITEM_CODE: ${job.ITEM_CODE}`
          );
        }

        await app.prisma.tB_T_OUTBOUND_EMAIL.create({
          data: {
            ID: BigInt(Date.now()),
            REQUEST_ID: job.REQUEST_ID,
            ITEM_CODE: job.ITEM_CODE,
            TO_EMAIL: employee.MAIL,
            SUBJECT: template.SUBJECT_TPL,
            BODY: template.BODY_TPL,
            DISPATCH_STATUS: "PENDING",
            CREATED_DT: new Date(),
          } as Prisma.TB_T_OUTBOUND_EMAILUncheckedCreateInput,
        });

        await app.prisma.tB_R_NOTIFICATION_HISTORY.create({
          data: {
            ID: BigInt(Date.now()),
            REQUEST_ID: job.REQUEST_ID,
            ITEM_CODE: job.ITEM_CODE,
            CHANNEL: "EMAIL",
            SYSTEM: "SAR_DB",
            RECIPIENT: job.APPROVER_ID,
            STATUS: "SENT",
            SENT_DT: new Date(),
            CREATED_BY: "system_sender_worker",
            CREATED_DT: new Date(),
          },
        });

        await app.prisma.tB_T_CANDIDATE_NOTIFICATION.update({
          where: { ID: job.ID },
          data: { STATUS: "SENT" },
        });
      } catch (jobError: any) {
        app.log.error(jobError, `Failed to process job ID: ${job.ID}`);
        await app.prisma.tB_T_CANDIDATE_NOTIFICATION.update({
          where: { ID: job.ID },
          data: { STATUS: "FAILED" },
        });
      }
    }
  } catch (error) {
    app.log.error(
      error,
      "A fatal error occurred during the sender worker run."
    );
  }
}

export async function triggerCompletionNotification(
  app: FastifyInstance,
  completedTask: UarSystemOwner
) {
  app.log.info(
    `Triggering completion notification for ${completedTask.UAR_ID}`
  );

  try {
    if (!completedTask.NOREG) {
      app.log.warn("Cannot send completion notification: NOREG is missing.");
      return;
    }

    await notificationService.queueNotification(
      app,
      {
        REQUEST_ID: `${completedTask.UAR_ID}${completedTask.USERNAME}${completedTask.ROLE_ID}`,
        ITEM_CODE: "UAR_COMPLETED",
        APPROVER_ID: completedTask.NOREG,
        DUE_DATE: null,
      },
      false
    );
  } catch (error) {
    app.log.error(error, "Failed to trigger completion notification.");
  }
}

export async function runUarSOSyncWorker(app: FastifyInstance) {
  app.log.info("Checking for UAR SO Sync jobs");
  const now = new Date();

  try {
    app.log.info("Fetching pending UAR SO Sync schedules...");
    const pendingSchedules = await scheduleService.getRunningSyncSchedules(app);

    for (const schedule of pendingSchedules) {
      app.log.info(
        `Processing UAR SO Sync for APPLICATION_ID: ${schedule.APPLICATION_ID}`
      );

      app.log.info(
        `Grabbing data from 5 sources for ${schedule.APPLICATION_ID}...`
      );

      const results = await Promise.allSettled([
        fetchFromDB1(app),
        fetchFromDB2(app),
        fetchFromDB3(app),
        fetchFromDB4(app),
        fetchFromDB5(app),
      ]);

      let allSourceData: UarPic[] = [];
      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          app.log.info(
            `Successfully fetched ${result.value.length} records from DB${
              index + 1
            }`
          );
          allSourceData = allSourceData.concat(result.value);
        } else {
          app.log.error(
            `Failed to fetch from DB ${index + 1}: ${
              result.reason?.message || result.reason
            }`
          );
        }
      });

      app.log.info(
        `Total records grabbed from all sources: ${allSourceData.length}`
      );
      await runCreateOnlySync(allSourceData, app);

      await new Promise((resolve) => setTimeout(resolve, 300));
    }
    app.log.info(
      `Processed ${
        pendingSchedules.length
      } UAR SO Sync schedules at ${now.toISOString()}`
    );
  } catch (error) {
    app.log.error(error, "A fatal error occurred during the run.");
  }
}
