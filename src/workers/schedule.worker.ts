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
import { TB_M_EMPLOYEE } from "../../src/generated/prisma";
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
          UAR_PROCESS_STATUS: "0",
        },
      });

      if (accessMappings.length === 0) {
        app.log.warn(
          `No active access mappings found for ${schedule.APPLICATION_ID} with status '0'.`
        );
        continue;
      }

      const noregs = [
        ...new Set(accessMappings.map((m) => m.NOREG).filter(Boolean)),
      ] as string[];

      const employeeData = await app.prisma.tB_M_EMPLOYEE.findMany({
        where: {
          NOREG: { in: noregs },
          VALID_TO: { gte: now },
        },
        orderBy: {
          VALID_TO: "desc",
        },
      });

      const employeeMap = new Map<string, TB_M_EMPLOYEE>();
      for (const emp of employeeData) {
        if (!employeeMap.has(emp.NOREG)) {
          employeeMap.set(emp.NOREG, emp);
        }
      }
      app.log.info(
        `Enriched ${employeeMap.size} employee records from prisma_sc.`
      );

      const uarPeriod = `${now.getFullYear()}${(now.getMonth() + 1)
        .toString()
        .padStart(2, "0")}`;
      const uarId = `UAR_${uarPeriod.substring(2)}_${
        schedule.APPLICATION_ID
      }`.substring(0, 20);
      const newUarTasks: Prisma.TB_R_UAR_SYSTEM_OWNERCreateManyInput[] =
        accessMappings.map((mapping) => {
          const employee = employeeMap.get(mapping.NOREG ?? "");

          return {
            UAR_PERIOD: uarPeriod,
            UAR_ID: uarId,
            USERNAME: mapping.USERNAME,
            NOREG: mapping.NOREG,
            NAME: `${mapping.FIRST_NAME} ${mapping.LAST_NAME}`,

            POSITION_NAME: employee?.POSITION_NAME ?? null,
            DIVISION_ID: employee?.DIVISION_ID ?? null,
            DEPARTMENT_ID: employee?.DEPARTMENT_ID ?? null,
            SECTION_ID: employee?.SECTION_ID ?? null,

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
          };
        });

      const createResult = await app.prisma.tB_R_UAR_SYSTEM_OWNER.createMany({
        data: newUarTasks,
      });

      app.log.info(`Created ${createResult.count} new UAR tasks.`);
      totalNewUarTasks += createResult.count;

      if (createResult.count > 0) {
        app.log.info(
          `Updating ${accessMappings.length} source auth mappings to 'In Progress' (1)...`
        );
        await app.prisma.tB_M_AUTH_MAPPING.updateMany({
          where: {
            APPLICATION_ID: schedule.APPLICATION_ID,
            UAR_PROCESS_STATUS: "0",
          },
          data: {
            UAR_PROCESS_STATUS: "1",
            CHANGED_BY: "system.UarSOWorker",
            CHANGED_DT: now,
          },
        });
        app.log.info(`Updated source mappings for ${schedule.APPLICATION_ID}.`);
      }

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
        NOREG_SYSTEM_OWNER: string;
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
        await notificationService.queueNotification(app, {
          REQUEST_ID: `${task.UAR_ID}${task.USERNAME}${task.ROLE_ID}`,
          ITEM_CODE: nextReminderCode,
          APPROVER_ID: task.NOREG_SYSTEM_OWNER,
          DUE_DATE: null,
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

export async function runPaPusherWorker(app: FastifyInstance) {
  app.log.info("Running Notification Pusher Worker...");

  let paFlowUrl: string | null = null;
  let defaultCc: string | null = null;

  try {
    const configs = await app.prisma.tB_M_SYSTEM.findMany({
      where: {
        OR: [
          { SYSTEM_TYPE: "PA_FLOW_URL", SYSTEM_CD: "DEFAULT" },
          { SYSTEM_TYPE: "EMAIL", SYSTEM_CD: "DEFAULT_CC" },
        ],
        VALID_TO_DT: { gte: new Date() },
      },
    });

    paFlowUrl =
      configs.find(
        (c) => c.SYSTEM_TYPE === "PA_FLOW_URL" && c.SYSTEM_CD === "DEFAULT"
      )?.VALUE_TEXT ??
      "https://default47c7b16bd4824147b21a04936dd898.75.environment.api.powerplatform.com/powerautomate/automations/direct/workflows/5230e06d1da946f59186c47029a77355/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=-jG539opTKLd4PgrzJgrNTFlfJ5sIG0zKBEp406dpss";
    defaultCc =
      configs.find(
        (c) => c.SYSTEM_TYPE === "EMAIL" && c.SYSTEM_CD === "DEFAULT_CC"
      )?.VALUE_TEXT ?? null;

    if (!paFlowUrl) {
      app.log.error("PA_FLOW_URL is not set in TB_M_SYSTEM. Worker stopping.");
      return;
    }
  } catch (error) {
    app.log.error(error, "Failed to fetch config from TB_M_SYSTEM.");
    return;
  }

  let candidates = [];
  try {
    candidates = await app.prisma.tB_T_CANDIDATE_NOTIFICATION.findMany({
      where: {
        STATUS: "PENDING",
      },
      take: 50,
    });

    if (candidates.length === 0) {
      app.log.info("No pending notifications to push.");
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

    // --- 4. Process Each Job ---
    for (const job of candidates) {
      let finalPayload: Record<string, any> = {};

      try {
        // --- 5. Enrich: Get Recipient Email/Teams ID (INLINE) ---
        let recipientEmail: string | null = null;
        let recipientTeamsId: string | null = null; // Assuming Teams ID is email

        if (job.ITEM_CODE.startsWith("PIC_")) {
          // Logic 1: Get PIC UAR Email
          const pic = await app.prisma.tB_M_UAR_PIC.findFirst({
            where: {
              DIVISION_ID: parseInt(job.APPROVER_ID), // APPROVER_ID is Division ID
            },
          });
          recipientEmail = pic?.MAIL ?? null;
          recipientTeamsId = pic?.MAIL ?? null;
        } else {
          // Logic 2: Get Employee (System Owner/Div User) Email
          if (!app.prisma) {
            throw new Error("Prisma client 'prisma_sc' is not available.");
          }
          const employee = await app.prisma.tB_M_EMPLOYEE.findFirst({
            where: {
              NOREG: job.APPROVER_ID, // APPROVER_ID is NOREG
              VALID_TO: { gte: new Date() },
            },
            orderBy: {
              VALID_TO: "desc",
            },
          });
          recipientEmail = employee?.MAIL ?? null;
          recipientTeamsId = employee?.MAIL ?? null;
        }

        if (!recipientEmail) {
          throw new Error(
            `No email recipient found for ITEM_CODE ${job.ITEM_CODE} and APPROVER_ID ${job.APPROVER_ID}`
          );
        }

        // --- 6. Enrich: Get Templates from TB_M_TEMPLATE (INLINE) ---
        const allTemplates = await app.prisma.tB_M_TEMPLATE.findMany({
          where: {
            ITEM_CODE: job.ITEM_CODE,
            LOCALE: "en-US",
            ACTIVE: true,
          },
        });

        const emailTemplate = allTemplates.find((t) => t.CHANNEL === "EMAIL");
        const teamsTemplate = allTemplates.find((t) => t.CHANNEL === "TEAMS");

        if (!emailTemplate && !teamsTemplate) {
          throw new Error(
            `No active EMAIL or TEAMS templates found for ITEM_CODE: ${job.ITEM_CODE}`
          );
        }

        // --- 7. Build Final Payload for Power Automate ---
        finalPayload = {
          recipientEmail: recipientEmail,
          recipientTeamsId: recipientTeamsId,
          ccEmail: defaultCc ?? "",
          emailSubject: emailTemplate?.SUBJECT_TPL ?? "",
          emailBodyCode: emailTemplate?.BODY_TPL ?? "",
          teamsSubject: teamsTemplate?.SUBJECT_TPL ?? "",
          teamsBodyCode: teamsTemplate?.BODY_TPL ?? "",
          itemCode: job.ITEM_CODE,
          requestId: job.REQUEST_ID,
          dueDate: job.DUE_DATE ?? "null",
        };

        console.log("notifResponse", finalPayload);

        const response = await fetch(paFlowUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(finalPayload),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Power Automate call failed with status ${response.status}: ${errorText}`
          );
        }

        await app.prisma.tB_H_NOTIFICATION.create({
          data: {
            ID: job.ID,
            REQUEST_ID: job.REQUEST_ID,
            ITEM_CODE: job.ITEM_CODE,
            CHANNEL: "EMAIL_TEAMS_PA", // Log the new combined channel
            SYSTEM: "SAR_DB_WORKER",
            RECIPIENT: job.APPROVER_ID,
            STATUS: "SENT_TO_PA",
            SENT_DT: new Date(),
            CREATED_BY: "system.PusherWorker",
            CREATED_DT: new Date(),
          },
        });

        // --- 10. Mark candidate as SENT ---
        await app.prisma.tB_T_CANDIDATE_NOTIFICATION.update({
          where: { ID: job.ID },
          data: { STATUS: "SENT" },
        });
        app.log.info(`Successfully processed and pushed job ID: ${job.ID}`);
      } catch (jobError: any) {
        // --- 11. Handle Job Failure ---
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
