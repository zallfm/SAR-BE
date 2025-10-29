import { FastifyInstance } from "fastify";
import { Prisma } from "../../generated/prisma";
import { ApplicationError } from "../../core/errors/applicationError";
import { ERROR_CODES } from "../../core/errors/errorCodes";
import { ERROR_MESSAGES } from "../../core/errors/errorMessages";

// Placeholder type for create/update payloads
type RuntimeParamData =
  Prisma.TB_M_APPLICATION_RUNTIME_PARAMUncheckedCreateInput & {
    NEW_KEY?: string;
  };
type RuntimeParamWhereInput = Prisma.TB_M_APPLICATION_RUNTIME_PARAMWhereInput;

export const runtimeParamService = {
  async getRuntimeParam(app: FastifyInstance, query: any) {
    const {
      page = 1,
      limit = 10,
      q,
      key,
      sortBy = "KEY", // Default sort by PK
      order = "asc",
    } = query;

    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    const where: RuntimeParamWhereInput = {};
    if (key) {
      where.KEY = key;
    }
    if (q) {
      where.OR = [
        { KEY: { contains: q } },
        { VALUE: { contains: q } },
        { DESCRIPTION: { contains: q } },
      ];
    }

    const orderBy: Prisma.TB_M_APPLICATION_RUNTIME_PARAMOrderByWithRelationInput =
      {
        [sortBy]: order,
      };

    try {
      const [data, total] = await app.prisma.$transaction([
        app.prisma.tB_M_APPLICATION_RUNTIME_PARAM.findMany({
          where,
          orderBy,
          skip,
          take: limitNum,
        }),
        app.prisma.tB_M_APPLICATION_RUNTIME_PARAM.count({ where }),
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

  async createRuntimeParam(app: FastifyInstance, data: RuntimeParamData) {
    try {
      // This table does not have CREATED_BY or CREATED_DT
      const newData = await app.prisma.tB_M_APPLICATION_RUNTIME_PARAM.create({
        data: {
          KEY: data.KEY,
          VALUE: data.VALUE,
          DESCRIPTION: data.DESCRIPTION,
          // CHANGED_DT is for updates
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

  async updateRuntimeParam(app: FastifyInstance, data: RuntimeParamData) {
    const { KEY, ...updateData } = data;
    const { NEW_KEY, ...otherData } = updateData;

    const dataForUpdate: any = {
      ...otherData,
      CHANGED_DT: new Date(),
    };

    if (NEW_KEY) {
      dataForUpdate.KEY = NEW_KEY;
    }

    try {
      const updatedParam =
        await app.prisma.tB_M_APPLICATION_RUNTIME_PARAM.update({
          where: {
            KEY: KEY,
          },
          data: dataForUpdate,
        });

      return updatedParam;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === "P2025") {
          app.log.error(`Record not found with key: ${KEY}`);
          throw new ApplicationError(
            ERROR_CODES.APP_NOT_FOUND,
            ERROR_MESSAGES[ERROR_CODES.APP_NOT_FOUND]
          );
        }
        if (e.code === "P2002") {
          app.log.error(
            `Unique constraint violation. The new key '${NEW_KEY}' may already exist.`
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
  async deleteRuntimeParam(app: FastifyInstance, key: string) {
    try {
      const deletedParam =
        await app.prisma.tB_M_APPLICATION_RUNTIME_PARAM.delete({
          where: {
            KEY: key,
          },
        });

      return deletedParam;
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
