import { WorkerContext } from '../worker.context';
import { scheduleService } from '../../modules/master_data/schedule/schedule.service';
import { notificationService } from '../../modules/batch/notif_history.service';
import { TB_M_EMPLOYEE } from '../../generated/prisma';

export const UarProcessStatus = {
  Pending: "0",
  InProgress: "1",
} as const;

export const ApprovalStatus = {
  Pending: "0",
  Approved: "1",
  Rejected: "2",
} as const;

export const NotificationStatus = {
  Pending: "PENDING",
  Processing: "PROCESSING",
  Sent: "SENT",
  SentToPA: "SENT_TO_PA",
  Failed: "FAILED",
} as const;

export const SystemUsers = {
  UarSOWorker: "system.UarSOWorker",
  UarReminderWorker: "system.UarReminderWorker",
  PusherWorker: "system.PusherWorker",
  UarSyncWorker: "system.UarSyncWorker",
} as const;

export const SystemConfig = {
  PaFlowUrlType: "PA_FLOW_URL",
  PaFlowUrlCd: "DEFAULT",
  EmailType: "EMAIL",
  DefaultEmailCcCd: "DEFAULT_CC",
} as const;

export async function runUarTaskCreationWorker(context: WorkerContext) {
  const { prisma, log } = context;
  log.info("Checking for UAR schedule jobs...");
  const now = new Date();
  let totalNewUarTasks = 0;

  try {
    // 1. Get schedules. We assume this service returns objects 
    //    with uppercase fields, matching the schema.
    const runningSchedules = await scheduleService.getRunningUarSchedules(context);
    log.info(`Found ${runningSchedules.length} running schedules.`);

    for (const schedule of runningSchedules) {
      try {
        log.info(`Processing schedule for APPLICATION_ID: ${schedule.APPLICATION_ID}`);

        // 2. Use the ACTUAL Prisma model name: tB_M_AUTH_MAPPING
        const accessMappings = await prisma.tB_M_AUTH_MAPPING.findMany({
          where: {
            // Use UPPERCASE field names
            APPLICATION_ID: schedule.APPLICATION_ID,
            UAR_PROCESS_STATUS: UarProcessStatus.Pending,
          },
        });

        if (accessMappings.length === 0) {
          log.warn(`No active access mappings found for ${schedule.APPLICATION_ID}.`);
          continue;
        }

        // 3. Use UPPERCASE field name
        const noregs = [...new Set(accessMappings.map((m) => m.NOREG).filter(Boolean))];

        // 4. Use the ACTUAL Prisma model name: tB_M_EMPLOYEE
        const employeeData = await prisma.tB_M_EMPLOYEE.findMany({
          where: {
            // Use UPPERCASE field names
            NOREG: { in: noregs as string[] },
            VALID_TO: { gte: now },
          },
          orderBy: { VALID_TO: 'desc' },
        });

        // 5. Map creation
        const employeeMap = new Map<string, TB_M_EMPLOYEE>();
        for (const emp of employeeData) {
          // Use UPPERCASE field name
          if (!employeeMap.has(emp.NOREG)) {
            employeeMap.set(emp.NOREG, emp);
          }
        }

        // 6. Build new tasks
        const uarPeriod = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}`;
        const uarId = `UAR_${uarPeriod.substring(2)}_${schedule.APPLICATION_ID}`.substring(0, 20);

        // The data for createMany MUST match the database column names
        const newUarTasks = accessMappings.map((mapping) => {
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
            ORG_CHANGED_STATUS: null, // Defaulting nulls
            COMPANY_CD: mapping.COMPANY_CD,
            APPLICATION_ID: mapping.APPLICATION_ID,
            ROLE_ID: mapping.ROLE_ID,
            REVIEWER_NOREG: null,
            REVIEWER_NAME: null,
            REVIEW_STATUS: null,
            REVIEWED_BY: null,
            REVIEWED_DT: null,
            SO_APPROVAL_STATUS: ApprovalStatus.Pending,
            SO_APPROVAL_BY: null,
            SO_APPROVAL_DT: null,
            REMEDIATED_STATUS: null,
            REMEDIATED_DT: null,
            CREATED_BY: SystemUsers.UarSOWorker,
            CREATED_DT: now,
            CHANGED_BY: null,
            CHANGED_DT: null,
          };
        });

        // 7. Create tasks and update source mappings in a transaction
        const [createResult] = await prisma.$transaction([
          // Use ACTUAL model name: tB_R_UAR_SYSTEM_OWNER
          prisma.tB_R_UAR_SYSTEM_OWNER.createMany({
            data: newUarTasks,
          }),
          // Use ACTUAL model name: tB_M_AUTH_MAPPING
          prisma.tB_M_AUTH_MAPPING.updateMany({
            where: {
              APPLICATION_ID: schedule.APPLICATION_ID,
              UAR_PROCESS_STATUS: UarProcessStatus.Pending,
            },
            data: {
              UAR_PROCESS_STATUS: UarProcessStatus.InProgress,
              CHANGED_BY: SystemUsers.UarSOWorker,
              CHANGED_DT: now,
            },
          }),
        ]);

        log.info(`Created ${createResult.count} new UAR tasks for ${schedule.APPLICATION_ID}.`);
        totalNewUarTasks += createResult.count;

        // 8. Trigger notifications
        if (createResult.count > 0) {
          // We cast to 'any' because the notification service 
          // might be expecting a different type
          await notificationService.triggerInitialNotifications(
            context,
            newUarTasks as any
          );
        }
      } catch (scheduleError) {
        log.error(scheduleError, `Failed to process schedule ${schedule.APPLICATION_ID}. Continuing...`);
      }
    }

    log.info(`Ticker: Processed ${totalNewUarTasks} total UAR System Owners at ${now.toISOString()}`);
  } catch (fatalError) {
    log.error(fatalError, "A fatal error occurred during the UAR SO worker run.");
  }
}