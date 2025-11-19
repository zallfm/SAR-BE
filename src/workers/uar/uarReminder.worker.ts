import { WorkerContext } from "../worker.context"
import { notificationService } from '../../modules/batch/notif_history.service';

// This type must match the exact result of your $queryRaw
type PendingTaskResult = {
    UAR_ID: string;
    USERNAME: string;
    ROLE_ID: string;
    APPLICATION_ID: string;
    NOREG_SYSTEM_OWNER: string;
    DAYS_PENDING: number;
    LAST_REMINDER_CODE: string | null;
};

export async function runUarDailyReminderWorker(context: WorkerContext) {
    const { prisma, log } = context;
    log.info("Running Daily UAR Reminder Worker...");

    try {
        // 1. Raw query column/table names MUST match the database
        //    Do not refactor the query string itself.
        const pendingTasks = await prisma.$queryRaw<PendingTaskResult[]>`
      SELECT
          uar.UAR_ID, uar.USERNAME, uar.ROLE_ID, uar.APPLICATION_ID,
          app.NOREG_SYSTEM_OWNER,
          DATEDIFF(DAY, uar.CREATED_DT, GETDATE()) AS DAYS_PENDING,
          (
              SELECT TOP 1 h.ITEM_CODE
              FROM TB_H_NOTIFICATION h
              WHERE h.REQUEST_ID = (uar.UAR_ID + uar.USERNAME + uar.ROLE_ID)
              AND h.ITEM_CODE LIKE 'UAR_REMINDER_%'
              ORDER BY h.SENT_DT DESC
          ) AS LAST_REMINDER_CODE
      FROM
          TB_R_UAR_SYSTEM_OWNER uar
      JOIN
          TB_M_APPLICATION app ON uar.APPLICATION_ID = app.APPLICATION_ID
      WHERE
          uar.SO_APPROVAL_STATUS = '0'
          AND DATEDIFF(DAY, uar.CREATED_DT, GETDATE()) BETWEEN 1 AND 7;
    `;

        log.info(`Found ${pendingTasks.length} pending tasks to check for reminders.`);
        let remindersQueued = 0;

        for (const task of pendingTasks) {
            const nextReminderCode = notificationService.getNextReminderCode(
                task.DAYS_PENDING,
                task.LAST_REMINDER_CODE
            );

            if (nextReminderCode) {
                // 2. Pass context to the refactored service
                await notificationService.queueNotification(context, {
                    REQUEST_ID: `${task.UAR_ID}${task.USERNAME}${task.ROLE_ID}`,
                    ITEM_CODE: nextReminderCode,
                    APPROVER_ID: task.NOREG_SYSTEM_OWNER,
                    DUE_DATE: null,
                });
                remindersQueued++;
            }
        }
        log.info(`Queued ${remindersQueued} new reminders.`);
    } catch (error) {
        log.error(error, "A fatal error occurred during the reminder worker run.");
    }
}