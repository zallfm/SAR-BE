import { Prisma } from "../../generated/prisma";
import { ApplicationError } from "../../core/errors/applicationError";
import { ERROR_CODES } from "../../core/errors/errorCodes";
import { ERROR_MESSAGES } from "../../core/errors/errorMessages";
export const integrationLogService = {
    async getIntegrationLog(app, query) {
        const { page = 1, limit = 10, q, system, level, sortBy = "LOG_DT", // Default sort by LOG_DT
        order = "desc", // Logs are usually newest first
         } = query;
        const pageNum = Number(page) || 1;
        const limitNum = Number(limit) || 10;
        const skip = (pageNum - 1) * limitNum;
        const where = {};
        if (system) {
            where.SYSTEM = system;
        }
        if (level) {
            where.LEVEL = level;
        }
        if (q) {
            where.OR = [
                { SYSTEM: { contains: q } },
                { LEVEL: { contains: q } },
                { MESSAGE: { contains: q } },
                { DETAIL: { contains: q } },
            ];
        }
        const orderBy = {
            [sortBy]: order,
        };
        try {
            const [data, total] = await app.prisma.$transaction([
                app.prisma.tB_M_INTEGRATION_LOG.findMany({
                    where,
                    orderBy,
                    skip,
                    take: limitNum,
                }),
                app.prisma.tB_M_INTEGRATION_LOG.count({ where }),
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
        }
        catch (e) {
            app.log.error(e);
            throw new ApplicationError(ERROR_CODES.SYS_UNKNOWN_ERROR, ERROR_MESSAGES[ERROR_CODES.SYS_UNKNOWN_ERROR]);
        }
    },
    async createIntegrationLog(app, data) {
        try {
            // This table does not have CREATED_BY or CHANGED_BY
            // LOG_DT is assumed to be part of the payload
            const newData = await app.prisma.tB_M_INTEGRATION_LOG.create({
                data: data,
            });
            return newData;
        }
        catch (e) {
            // No P2002 check as ID is likely auto-increment or provided
            app.log.error(e);
            throw new ApplicationError(ERROR_CODES.SYS_UNKNOWN_ERROR, ERROR_MESSAGES[ERROR_CODES.SYS_UNKNOWN_ERROR]);
        }
    },
    async updateIntegrationLog(app, data) {
        const { ID, ...updateData } = data;
        if (!ID) {
            throw new ApplicationError(ERROR_CODES.APP_INVALID_DATA, "ID is required for update.");
        }
        try {
            const updatedLog = await app.prisma.tB_M_INTEGRATION_LOG.update({
                where: {
                    ID: ID,
                },
                data: updateData,
            });
            return updatedLog;
        }
        catch (e) {
            if (e instanceof Prisma.PrismaClientKnownRequestError) {
                if (e.code === "P2025") {
                    app.log.error(`Record not found with ID: ${ID}`);
                    throw new ApplicationError(ERROR_CODES.APP_NOT_FOUND, ERROR_MESSAGES[ERROR_CODES.APP_NOT_FOUND]);
                }
            }
            app.log.error(`Possible Error: ${e}`);
            throw new ApplicationError(ERROR_CODES.SYS_UNKNOWN_ERROR, ERROR_MESSAGES[ERROR_CODES.SYS_UNKNOWN_ERROR]);
        }
    },
    async deleteIntegrationLog(app, id) {
        try {
            const deletedLog = await app.prisma.tB_M_INTEGRATION_LOG.delete({
                where: {
                    ID: id,
                },
            });
            return deletedLog;
        }
        catch (e) {
            if (e instanceof Prisma.PrismaClientKnownRequestError) {
                if (e.code === "P2025") {
                    throw new ApplicationError(ERROR_CODES.APP_NOT_FOUND, ERROR_MESSAGES[ERROR_CODES.APP_NOT_FOUND]);
                }
            }
            app.log.error(e);
            throw new ApplicationError(ERROR_CODES.SYS_UNKNOWN_ERROR, ERROR_MESSAGES[ERROR_CODES.SYS_UNKNOWN_ERROR]);
        }
    },
};
