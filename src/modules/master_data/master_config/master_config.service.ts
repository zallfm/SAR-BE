import { FastifyInstance } from "fastify";
import { Prisma } from "../../../generated/prisma/index.js";
import { ApplicationError } from "../../../core/errors/applicationError";
import { ERROR_CODES } from "../../../core/errors/errorCodes";
import { ERROR_MESSAGES } from "../../../core/errors/errorMessages";
import { MasterSystem } from "../../../types/master_config";
import { publishMonitoringLog } from "../../log_monitoring/log_publisher";
import { currentRequestId, currentUserId } from "../../../core/requestContext";

type SystemWhereInput = Prisma.TB_M_SYSTEMWhereInput;


function convertStringToTime(timeString: string): Date {
  return new Date(`1970-01-01T${timeString}Z`);
}


function convertTimeToString(timeDate: Date): string {
  return timeDate.toISOString().substring(11, 19);
}

export const systemService = {
  async getSystem(app: FastifyInstance, query: any) {
    const {
      page = 1,
      limit = 10,
      q,
      systemType,
      systemCode,
      sortBy = "CREATED_DT",
      order = "desc",
    } = query;

    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    const where: SystemWhereInput = {};
    if (systemType) {
      where.SYSTEM_TYPE = systemType;
    }
    if (systemCode) {
      where.SYSTEM_CD = systemCode;
    }
    if (q) {
      where.OR = [
        { SYSTEM_CD: { contains: q } },
        { SYSTEM_TYPE: { contains: q } },
      ];
    }

    const orderBy: Prisma.TB_M_SYSTEMOrderByWithRelationInput = {
      [sortBy]: order,
    };
    console.log("orderbay", orderBy)
    try {
      const [rawData, total] = await app.prisma.$transaction([
        app.prisma.tB_M_SYSTEM.findMany({
          where,
          orderBy,
          skip,
          take: limitNum,
        }),
        app.prisma.tB_M_SYSTEM.count({ where }),
      ]);

      const data = rawData.map((record) => {
        const { VALUE_TIME, ...rest } = record;
        return {
          ...rest,
          VALUE_TIME: VALUE_TIME ? convertTimeToString(VALUE_TIME) : null,
        };
      });

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

  async createSystem(app: FastifyInstance, data: MasterSystem) {
    const dataForDb: any = { ...data };

    if (typeof dataForDb.VALUE_TIME === "string") {
      dataForDb.VALUE_TIME = convertStringToTime(dataForDb.VALUE_TIME);
    }

    try {
      const newData = await app.prisma.tB_M_SYSTEM.create({
        data: {
          ...dataForDb,
          CREATED_DT: new Date(),
        },
      });

      const { VALUE_TIME, ...rest } = newData;
      const userId = currentUserId();
      const reqId = currentRequestId()
      publishMonitoringLog(globalThis.app as any, {
        userId,
        module: "SO",
        action: "SYSTEM_MASTER_CREATE",
        status: "Success",
        description: `Create system master ${newData.SYSTEM_TYPE}`,
        location: "/applications"
      }).catch(e => console.warn({ e, reqId }, "monitoring log failed"));
      return {
        ...rest,
        VALUE_TIME: VALUE_TIME ? convertTimeToString(VALUE_TIME) : null,
      };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === "P2002") {
          throw new ApplicationError(
            ERROR_CODES.APP_ALREADY_EXISTS,
            ERROR_MESSAGES[ERROR_CODES.APP_ALREADY_EXISTS]
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

  async updateSystem(app: FastifyInstance, data: MasterSystem) {
    const { SYSTEM_CD, SYSTEM_TYPE, VALID_FROM_DT, ...updateData } = data;

    const { NEW_VALID_FROM_DT, ...otherData } = updateData;
    app.log.info(`Finding System: ${JSON.stringify(data)}`);

    const dataForUpdate: any = {
      ...otherData,
      CHANGED_DT: new Date(),
    };

    if (typeof dataForUpdate.VALUE_TIME === "string") {
      dataForUpdate.VALUE_TIME = convertStringToTime(dataForUpdate.VALUE_TIME);
    } else if (dataForUpdate.VALUE_TIME === null) {
      dataForUpdate.VALUE_TIME = null;
    }

    if (NEW_VALID_FROM_DT) {
      dataForUpdate.VALID_FROM_DT = NEW_VALID_FROM_DT;
    }

    try {
      const updatedSystem = await app.prisma.tB_M_SYSTEM.update({
        where: {
          SYSTEM_TYPE_SYSTEM_CD_VALID_FROM_DT: {
            SYSTEM_TYPE,
            SYSTEM_CD,
            VALID_FROM_DT,
          },
        },
        data: dataForUpdate,
      });

      const { VALUE_TIME, ...rest } = updatedSystem;
      const userId = currentUserId();
      const reqId = currentRequestId()
      publishMonitoringLog(globalThis.app as any, {
        userId,
        module: "SO",
        action: "SYSTEM_MASTER_UPDATE",
        status: "Success",
        description: `Update system master ${updatedSystem.SYSTEM_TYPE}`,
        location: "/applications"
      }).catch(e => console.warn({ e, reqId }, "monitoring log failed"));
      return {
        ...rest,
        VALUE_TIME: VALUE_TIME ? convertTimeToString(VALUE_TIME) : null,
      };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === "P2025") {
          app.log.error(
            `Record not found with key: ${SYSTEM_TYPE}, ${SYSTEM_CD}, ${VALID_FROM_DT}`
          );
          throw new ApplicationError(
            ERROR_CODES.APP_NOT_FOUND,
            ERROR_MESSAGES[ERROR_CODES.APP_NOT_FOUND]
          );
        }
        if (e.code === "P2002") {
          app.log.error(
            `Unique constraint violation. The new key may already exist.`
          );
          throw new ApplicationError(
            ERROR_CODES.APP_ALREADY_EXISTS,
            ERROR_MESSAGES[ERROR_CODES.APP_ALREADY_EXISTS]
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
  async deleteSystem(
    app: FastifyInstance,
    compoundId: { SYSTEM_TYPE: string; SYSTEM_CD: string; VALID_FROM_DT: Date }
  ) {
    try {
      const deletedSystem = await app.prisma.tB_M_SYSTEM.delete({
        where: {
          SYSTEM_TYPE_SYSTEM_CD_VALID_FROM_DT: {
            SYSTEM_TYPE: compoundId.SYSTEM_TYPE,
            SYSTEM_CD: compoundId.SYSTEM_CD,
            VALID_FROM_DT: compoundId.VALID_FROM_DT,
          },
        },
      });

      const { VALUE_TIME, ...rest } = deletedSystem;
      const userId = currentUserId();
      const reqId = currentRequestId()
      publishMonitoringLog(globalThis.app as any, {
        userId,
        module: "SO",
        action: "SYSTEM_MASTER_DELETE",
        status: "Success",
        description: `Delete system master ${deletedSystem.SYSTEM_TYPE}`,
        location: "/applications"
      }).catch(e => console.warn({ e, reqId }, "monitoring log failed"));
      return {
        ...rest,
        VALUE_TIME: VALUE_TIME ? convertTimeToString(VALUE_TIME) : null,
      };
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
