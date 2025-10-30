import { FastifyInstance } from "fastify";
import { Prisma } from "../../generated/prisma";
import { ApplicationError } from "../../core/errors/applicationError";
import { ERROR_CODES } from "../../core/errors/errorCodes";
import { ERROR_MESSAGES } from "../../core/errors/errorMessages";

// Placeholder type for create/update payloads
type OutboundEmailData = Prisma.TB_T_OUTBOUND_EMAILUncheckedCreateInput;
type OutboundEmailWhereInput = Prisma.TB_T_OUTBOUND_EMAILWhereInput;

export const outboundEmailService = {
  async getOutboundEmail(app: FastifyInstance, query: any) {
    const {
      page = 1,
      limit = 10,
      q,
      requestId,
      dispatchStatus,
      sortBy = "CREATED_DT",
      order = "desc",
    } = query;

    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    const where: OutboundEmailWhereInput = {};
    if (requestId) {
      where.REQUEST_ID = requestId;
    }
    if (dispatchStatus) {
      where.DISPATCH_STATUS = dispatchStatus;
    }
    if (q) {
      where.OR = [
        { REQUEST_ID: { contains: q } },
        { TO_EMAIL: { contains: q } },
        { CC_EMAIL: { contains: q } },
        { SUBJECT: { contains: q } },
      ];
    }

    const orderBy: Prisma.TB_T_OUTBOUND_EMAILOrderByWithRelationInput = {
      [sortBy]: order,
    };

    try {
      const [data, total] = await app.prisma.$transaction([
        app.prisma.tB_T_OUTBOUND_EMAIL.findMany({
          where,
          orderBy,
          skip,
          take: limitNum,
        }),
        app.prisma.tB_T_OUTBOUND_EMAIL.count({ where }),
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

  async createOutboundEmail(app: FastifyInstance, data: OutboundEmailData) {
    try {
      const dataForDb: any = {
        ...data,
        CREATED_DT: new Date(),
      };

      const newData = await app.prisma.tB_T_OUTBOUND_EMAIL.create({
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

  async updateOutboundEmail(app: FastifyInstance, data: OutboundEmailData) {
    const { ID, ...updateData } = data;

    if (!ID) {
      throw new ApplicationError(
        ERROR_CODES.APP_INVALID_DATA,
        "ID is required for update."
      );
    }

    try {
      const updatedEmail = await app.prisma.tB_T_OUTBOUND_EMAIL.update({
        where: {
          ID: ID,
        },
        data: updateData, // No CHANGED_BY or CHANGED_DT in this table
      });

      return updatedEmail;
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
  async deleteOutboundEmail(app: FastifyInstance, id: bigint) {
    try {
      const deletedEmail = await app.prisma.tB_T_OUTBOUND_EMAIL.delete({
        where: {
          ID: id,
        },
      });

      return deletedEmail;
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


