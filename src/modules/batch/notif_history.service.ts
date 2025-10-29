import { FastifyInstance } from "fastify";
import { Prisma } from "../../generated/prisma";
import { ApplicationError } from "../../core/errors/applicationError";
import { ERROR_CODES } from "../../core/errors/errorCodes";
import { ERROR_MESSAGES } from "../../core/errors/errorMessages";

// Placeholder type for create/update payloads
type NotificationHistoryData =
  Prisma.TB_H_NOTIFICATIONUncheckedCreateInput;
type NotificationHistoryWhereInput = Prisma.TB_H_NOTIFICATIONWhereInput;

export const notificationHistoryService = {
  async getNotificationHistory(app: FastifyInstance, query: any) {
    const {
      page = 1,
      limit = 10,
      q,
      requestId,
      channel,
      system,
      status,
      sortBy = "CREATED_DT",
      order = "desc",
    } = query;

    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    const where: NotificationHistoryWhereInput = {};
    if (requestId) {
      where.REQUEST_ID = requestId;
    }
    if (channel) {
      where.CHANNEL = channel;
    }
    if (system) {
      where.SYSTEM = system;
    }
    if (status) {
      where.STATUS = status;
    }
    if (q) {
      where.OR = [
        { REQUEST_ID: { contains: q } },
        { ITEM_CODE: { contains: q } },
        { RECIPIENT: { contains: q } },
        { CREATED_BY: { contains: q } },
      ];
    }

    const orderBy: Prisma.TB_H_NOTIFICATIONOrderByWithRelationInput = {
      [sortBy]: order,
    };

    try {
      const [data, total] = await app.prisma.$transaction([
        app.prisma.tB_H_NOTIFICATION.findMany({
          where,
          orderBy,
          skip,
          take: limitNum,
        }),
        app.prisma.tB_H_NOTIFICATION.count({ where }),
      ]);

      const totalPages = Math.max(1, Math.ceil(total / limitNum));

      return {
        data,
        meta: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages,
        },
      };
    } catch (e) {
      app.log.error(e);
      throw new ApplicationError(
        ERROR_CODES.SYS_UNKNOWN_ERROR,
        ERROR_MESSAGES[ERROR_CODES.SYS_UNKNOWN_ERROR]
      );
    }
  },

  async createNotificationHistory(
    app: FastifyInstance,
    data: NotificationHistoryData
  ) {
    try {
      const dataForDb: any = {
        ...data,
        // Follows the pattern from systemService
        CREATED_BY: "Hesti",
        CREATED_DT: new Date(),
      };

      const newData = await app.prisma.tB_H_NOTIFICATION.create({
        data: dataForDb,
      });

      return newData;
    } catch (e) {
      app.log.error(e);
      throw new ApplicationError(
        ERROR_CODES.SYS_UNKNOWN_ERROR,
        ERROR_MESSAGES[ERROR_CODES.SYS_UNKNOWN_ERROR]
      );
    }
  },

  async updateNotificationHistory(
    app: FastifyInstance,
    data: NotificationHistoryData
  ) {
    const { ID, ...updateData } = data;

    if (!ID) {
      throw new ApplicationError(
        ERROR_CODES.APP_INVALID_DATA,
        "ID is required for update."
      );
    }

    // This table has no CHANGED_BY or CHANGED_DT, so we don't add it
    const dataForUpdate: any = { ...updateData };
    // We must remove CREATED_BY and CREATED_DT from the update payload
    // as they should not be changed.
    delete dataForUpdate.CREATED_BY;
    delete dataForUpdate.CREATED_DT;

    try {
      const updatedHistory = await app.prisma.tB_H_NOTIFICATION.update({
        where: {
          ID: ID,
        },
        data: dataForUpdate,
      });

      return updatedHistory;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === "P2025") {
          app.log.error(`Record not found with ID: ${ID}`);
          throw new ApplicationError(
            ERROR_CODES.APP_NOT_FOUND,
            ERROR_MESSAGES[ERROR_CODES.APP_NOT_FOUND]
          );
        }
      }
      app.log.error(`Possible Error: ${e}`);
      throw new ApplicationError(
        ERROR_CODES.SYS_UNKNOWN_ERROR,
        ERROR_MESSAGES[ERROR_CODES.SYS_UNKNOWN_ERROR]
      );
    }
  },
  async deleteNotificationHistory(app: FastifyInstance, id: bigint) {
    try {
      const deletedHistory = await app.prisma.tB_H_NOTIFICATION.delete({
        where: {
          ID: id,
        },
      });

      return deletedHistory;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === "P2025") {
          throw new ApplicationError(
            ERROR_CODES.APP_NOT_FOUND,
            ERROR_MESSAGES[ERROR_CODES.APP_NOT_FOUND]
          );
        }
      }
      app.log.error(e);
      throw new ApplicationError(
        ERROR_CODES.SYS_UNKNOWN_ERROR,
        ERROR_MESSAGES[ERROR_CODES.SYS_UNKNOWN_ERROR]
      );
    }
  },
};

import { TB_R_UAR_SYSTEM_OWNER } from "../../generated/prisma";

type UarSystemOwner = TB_R_UAR_SYSTEM_OWNER;

export const ITEM_CODES = {
  CREATED: "UAR_CREATED",
  COMPLETED: "UAR_COMPLETED",
  REMINDER_1: "UAR_REMINDER_1",
  REMINDER_2: "UAR_REMINDER_2",
  REMINDER_3: "UAR_REMINDER_3",
  REMINDER_4: "UAR_REMINDER_4",
  REMINDER_5: "UAR_REMINDER_5",
  REMINDER_6: "UAR_REMINDER_6",
  REMINDER_7: "UAR_REMINDER_7",
};

// Map days pending to the correct reminder code
export const REMINDER_CODES: { [key: number]: string } = {
  1: ITEM_CODES.REMINDER_1,
  2: ITEM_CODES.REMINDER_2,
  3: ITEM_CODES.REMINDER_3,
  4: ITEM_CODES.REMINDER_4,
  5: ITEM_CODES.REMINDER_5,
  6: ITEM_CODES.REMINDER_6,
  7: ITEM_CODES.REMINDER_7,
};

/**
 * Main service object for handling notification logic.
 */
export const notificationService = {
  /**
   * Queues a single notification, checking for duplicates first.
   */
  async queueNotification(
    app: FastifyInstance,
    candidate: {
      REQUEST_ID: string;
      ITEM_CODE: string;
      APPROVER_ID: string; // Note: This is the recipient NOREG
      DUE_DATE: Date | null;
    },
    checkDuplicates = true
  ) {
    if (checkDuplicates) {
      const existing = await app.prisma.tB_H_NOTIFICATION.findFirst({
        where: {
          REQUEST_ID: candidate.REQUEST_ID,
          ITEM_CODE: candidate.ITEM_CODE,
        },
      });

      if (existing) {
        app.log.warn(
          `Notification already sent for ${candidate.REQUEST_ID} with code ${candidate.ITEM_CODE}. Skipping.`
        );
        return;
      }
    }

    await app.prisma.tB_T_CANDIDATE_NOTIFICATION.create({
      data: {
        ID: BigInt(Date.now()),
        REQUEST_ID: candidate.REQUEST_ID,
        ITEM_CODE: candidate.ITEM_CODE,
        APPROVER_ID: candidate.APPROVER_ID,
        DUE_DATE: candidate.DUE_DATE,
        STATUS: "PENDING",
        CREATED_DT: new Date(),
      } as Prisma.TB_T_CANDIDATE_NOTIFICATIONUncheckedCreateInput,
    });
  },

  async triggerInitialNotifications(
    app: FastifyInstance,
    newUarTasks: Omit<UarSystemOwner, "ID">[]
  ) {
    app.log.info(
      `Triggering initial notifications for ${newUarTasks.length} tasks...`
    );

    // Get all unique Application IDs from the new tasks
    const appIds = [...new Set(newUarTasks.map((task) => task.APPLICATION_ID))];

    // Fetch all relevant approvers in one query
    const applications = await app.prisma.tB_M_APPLICATION.findMany({
      where: {
        APPLICATION_ID: { in: appIds as string[] },
      },
      select: {
        APPLICATION_ID: true,
        NOREG_SYSTEM_OWNER: true,
      },
    });

    const approverMap = new Map(
      applications.map((app) => [app.APPLICATION_ID, app.NOREG_SYSTEM_OWNER])
    );

    for (const task of newUarTasks) {
      if (!task.APPLICATION_ID) continue;

      const approverNoreg = approverMap.get(task.APPLICATION_ID);
      if (!approverNoreg) {
        app.log.warn(
          `No approver found for APPLICATION_ID: ${task.APPLICATION_ID}. Skipping notification.`
        );
        continue;
      }

      await this.queueNotification(app, {
        REQUEST_ID: `${task.UAR_ID}${task.USERNAME}${task.ROLE_ID}`,
        ITEM_CODE: ITEM_CODES.CREATED,
        APPROVER_ID: approverNoreg,
        DUE_DATE: null, // Or set a 'due date' if you have one
      });
    }
  },

  /**
   * EVENT 2: Logic to determine the next reminder code to send.
   */
  getNextReminderCode(
    daysPending: number,
    lastReminderCode: string | null
  ): string | null {
    const expectedReminderCode = REMINDER_CODES[daysPending];

    // If there is no expected reminder for this day, do nothing
    if (!expectedReminderCode) {
      return null;
    }

    // If the last reminder sent is the one for yesterday, or there are no reminders sent yet
    // and this is day 1, then it's safe to send the new one.
    const yesterdayReminderCode = REMINDER_CODES[daysPending - 1];

    if (
      (daysPending === 1 && !lastReminderCode) || // Day 1, no reminder sent
      lastReminderCode === yesterdayReminderCode // Day X, and last reminder sent was for Day X-1
    ) {
      return expectedReminderCode;
    }

    return null;
  },
};
