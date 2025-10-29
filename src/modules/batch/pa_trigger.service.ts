import { FastifyInstance } from "fastify";
import { Prisma } from "../../generated/prisma";
import { ApplicationError } from "../../core/errors/applicationError";
import { ERROR_CODES } from "../../core/errors/errorCodes";
import { ERROR_MESSAGES } from "../../core/errors/errorMessages";

import * as crypto from "crypto";


interface PaTriggerPayload {
  REQUEST_ID: string;
  ITEM_CODE: string;
  RECIPIENT_NOREG: string;
  DUE_DATE?: Date | null;
}

export const paService = {

  async queuePaTrigger(app: FastifyInstance, payload: PaTriggerPayload) {
    try {
      const uniqueId = crypto.randomUUID();
      const payloadString = JSON.stringify(payload);

      await app.prisma.tB_T_PA_TRIGGER.create({
        data: {
          ID: BigInt(Date.now()),
          CORRELATION_ID: uniqueId,
          PAYLOAD: payloadString,
          STATUS: "PENDING",
          CREATED_DT: new Date(),
        },
      });

      app.log.info(
        `Queued notification for Power Automate. ITEM_CODE: ${payload.ITEM_CODE}, RECIPIENT: ${payload.RECIPIENT_NOREG}`
      );
    } catch (error) {
      app.log.error(
        error,
        `Failed to queue Power Automate trigger for ITEM_CODE: ${payload.ITEM_CODE}`
      );
    }
  },
};


type PaTriggerData = Prisma.TB_T_PA_TRIGGERUncheckedCreateInput;
type PaTriggerWhereInput = Prisma.TB_T_PA_TRIGGERWhereInput;

export const paTriggerService = {
  async getPaTrigger(app: FastifyInstance, query: any) {
    const {
      page = 1,
      limit = 10,
      q,
      correlationId,
      flowId,
      status,
      sortBy = "CREATED_DT",
      order = "desc",
    } = query;

    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    const where: PaTriggerWhereInput = {};
    if (correlationId) {
      where.CORRELATION_ID = correlationId;
    }
    if (flowId) {
      where.FLOW_ID = flowId;
    }
    if (status) {
      where.STATUS = status;
    }
    if (q) {
      where.OR = [
        { CORRELATION_ID: { contains: q } },
        { FLOW_ID: { contains: q } },
        { STATUS: { contains: q } },
      ];
    }

    const orderBy: Prisma.TB_T_PA_TRIGGEROrderByWithRelationInput = {
      [sortBy]: order,
    };

    try {
      const [data, total] = await app.prisma.$transaction([
        app.prisma.tB_T_PA_TRIGGER.findMany({
          where,
          orderBy,
          skip,
          take: limitNum,
        }),
        app.prisma.tB_T_PA_TRIGGER.count({ where }),
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

  async createPaTrigger(app: FastifyInstance, data: PaTriggerData) {
    try {
      const dataForDb: any = {
        ...data,
        CREATED_DT: new Date(),
      };

      const newData = await app.prisma.tB_T_PA_TRIGGER.create({
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

  async updatePaTrigger(app: FastifyInstance, data: PaTriggerData) {
    const { ID, ...updateData } = data;

    if (!ID) {
      throw new ApplicationError(
        ERROR_CODES.APP_INVALID_DATA,
        "ID is required for update."
      );
    }

    try {
      const updatedTrigger = await app.prisma.tB_T_PA_TRIGGER.update({
        where: {
          ID: ID,
        },
        data: updateData, // No CHANGED_BY or CHANGED_DT in this table
      });

      return updatedTrigger;
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
  async deletePaTrigger(app: FastifyInstance, id: bigint) {
    try {
      const deletedTrigger = await app.prisma.tB_T_PA_TRIGGER.delete({
        where: {
          ID: id,
        },
      });

      return deletedTrigger;
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
