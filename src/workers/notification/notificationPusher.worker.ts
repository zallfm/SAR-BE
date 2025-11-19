import { WorkerContext } from "../worker.context";
import { NotificationStatus, SystemConfig, SystemUsers } from '../uar/uarTaskCreation.worker';

export async function runNotificationPusherWorker(context: WorkerContext) {
    const { prisma, log } = context;
    log.info("Running Notification Pusher Worker...");

    let paFlowUrl: string | null = null;
    let defaultCc: string | null = null;

    try {
        const configs = await prisma.tB_M_SYSTEM.findMany({
            where: {
                OR: [
                    { SYSTEM_TYPE: SystemConfig.PaFlowUrlType, SYSTEM_CD: SystemConfig.PaFlowUrlCd },
                    { SYSTEM_TYPE: SystemConfig.EmailType, SYSTEM_CD: SystemConfig.DefaultEmailCcCd },
                ],
                VALID_TO_DT: { gte: new Date() },
            },
        });

        paFlowUrl = configs.find(c => c.SYSTEM_TYPE === SystemConfig.PaFlowUrlType)?.VALUE_TEXT ?? null;
        defaultCc = configs.find(c => c.SYSTEM_TYPE === SystemConfig.EmailType)?.VALUE_TEXT ?? null;

        if (!paFlowUrl) {
            log.error("PA_FLOW_URL is not set in TB_M_SYSTEM. Worker stopping.");
            return;
        }
    } catch (error) {
        log.error(error, "Failed to fetch config from TB_M_SYSTEM.");
        return;
    }

    let candidates = [];
    try {
        candidates = await prisma.tB_T_CANDIDATE_NOTIFICATION.findMany({
            where: { STATUS: NotificationStatus.Pending },
            take: 50,
        });

        if (candidates.length === 0) {
            log.info("No pending notifications to push.");
            return;
        }
        log.info(`Found ${candidates.length} notifications to process.`);

        const candidateIds = candidates.map((c) => c.ID);
        await prisma.tB_T_CANDIDATE_NOTIFICATION.updateMany({
            where: {
                ID: { in: candidateIds },
                STATUS: NotificationStatus.Pending,
            },
            data: { STATUS: NotificationStatus.Processing },
        });

        for (const job of candidates) {
            const jobId = job.ID;
            try {
                let recipientEmail: string | null = null;
                let recipientTeamsId: string | null = null;

                if (job.ITEM_CODE.startsWith("PIC_")) {
                    const pic = await prisma.tB_M_UAR_PIC.findFirst({
                        where: { DIVISION_ID: parseInt(job.APPROVER_ID) },
                    });
                    recipientEmail = pic?.MAIL ?? null;
                    recipientTeamsId = pic?.MAIL ?? null;
                } else {
                    const employee = await prisma.tB_M_EMPLOYEE.findFirst({
                        where: { NOREG: job.APPROVER_ID },
                        orderBy: { VALID_TO: 'desc' },
                    });
                    recipientEmail = employee?.MAIL ?? null;
                    recipientTeamsId = employee?.MAIL ?? null;
                }

                if (!recipientEmail) {
                    throw new Error(`No email recipient found for APPROVER_ID ${job.APPROVER_ID}`);
                }
                const allTemplates = await prisma.tB_M_TEMPLATE.findMany({
                    where: { ITEM_CODE: job.ITEM_CODE, LOCALE: "en-US", ACTIVE: true },
                });
                const emailTemplate = allTemplates.find((t) => t.CHANNEL === "EMAIL");
                const teamsTemplate = allTemplates.find((t) => t.CHANNEL === "TEAMS");

                if (!emailTemplate && !teamsTemplate) {
                    throw new Error(`No active templates found for ITEM_CODE: ${job.ITEM_CODE}`);
                }

                const taskCount = parseInt(job.LINK_DETAIL ?? "1", 10) || 1;
                const finalPayload = {
                    recipientEmail,
                    recipientTeamsId,
                    ccEmail: defaultCc ?? "",
                    emailSubject: emailTemplate?.SUBJECT_TPL ?? "",
                    emailBodyCode: emailTemplate?.BODY_TPL ?? "",
                    teamsSubject: teamsTemplate?.SUBJECT_TPL ?? "",
                    teamsBodyCode: teamsTemplate?.BODY_TPL ?? "",
                    itemCode: job.ITEM_CODE,
                    requestId: job.REQUEST_ID,
                    dueDate: job.DUE_DATE ? job.DUE_DATE.toISOString() : "null",
                    taskCount,
                };

                const response = await fetch(paFlowUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(finalPayload),
                });

                if (!response.ok) {
                    throw new Error(`Power Automate call failed: ${response.statusText}`);
                }

                await prisma.$transaction([
                    prisma.tB_H_NOTIFICATION.create({
                        data: {
                            ID: job.ID,
                            REQUEST_ID: job.REQUEST_ID,
                            ITEM_CODE: job.ITEM_CODE,
                            CHANNEL: "EMAIL_TEAMS_PA",
                            SYSTEM: "SAR_DB_WORKER",
                            RECIPIENT: job.APPROVER_ID,
                            STATUS: NotificationStatus.SentToPA,
                            SENT_DT: new Date(),
                            CREATED_BY: SystemUsers.PusherWorker,
                            CREATED_DT: new Date(),
                            PROVIDER_MSG_ID: null,
                            PAYLOAD_HASH: null
                        },
                    }),
                    prisma.tB_T_CANDIDATE_NOTIFICATION.update({
                        where: { ID: jobId },
                        data: { STATUS: NotificationStatus.Sent },
                    }),
                ]);

                log.info(`Successfully processed and pushed job ID: ${jobId}`);
            } catch (jobError: any) {
                log.error(jobError, `Failed to process job ID: ${jobId}`);
                await prisma.tB_T_CANDIDATE_NOTIFICATION.update({
                    where: { ID: jobId },
                    data: { STATUS: NotificationStatus.Failed },
                });
            }
        }
    } catch (error) {
        log.error(error, "A fatal error occurred during the sender worker run.");
    }
}