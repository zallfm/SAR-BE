import { FastifyInstance } from "fastify";
import { Prisma } from "../../../generated/prisma";
import { ApplicationError } from "../../../core/errors/applicationError";
import { ERROR_CODES } from "../../../core/errors/errorCodes";
import { ERROR_MESSAGES } from "../../../core/errors/errorMessages";
import { MasterSystem } from "../../../types/master_config";

type SystemWhereInput = Prisma.TB_M_SYSTEMWhereInput;

export const systemService = {
  async getSystem(app: FastifyInstance, query: any) {
    const {
      page = 1,
      limit = 10,
      q,
      systemType,
      systemCode,
      sortBy = "CREATED_DT",
      order = "asc",
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

    try {
      const [data, total] = await app.prisma.$transaction([
        app.prisma.tB_M_SYSTEM.findMany({
          where,
          orderBy,
          skip,
          take: limitNum,
        }),
        app.prisma.tB_M_SYSTEM.count({ where }),
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

  async createSystem(app: FastifyInstance, data: MasterSystem) {
    try {
      const newData = await app.prisma.tB_M_SYSTEM.create({
        data: {
          ...data,
          CREATED_BY: "Hesti",
          CREATED_DT: new Date(),
        },
      });
      return newData;
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
      CHANGED_BY: "Hesti",
      CHANGED_DT: new Date(),
    };

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
      return updatedSystem;
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
      return deletedSystem;
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
