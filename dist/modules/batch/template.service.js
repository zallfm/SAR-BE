import { Prisma } from "../../generated/prisma";
import { ApplicationError } from "../../core/errors/applicationError";
import { ERROR_CODES } from "../../core/errors/errorCodes";
import { ERROR_MESSAGES } from "../../core/errors/errorMessages";
export const templateService = {
    async getTemplate(app, query) {
        const { page = 1, limit = 10, q, itemCode, channel, locale, sortBy = "ITEM_CODE", // Default sort by part of PK
        order = "asc", } = query;
        const pageNum = Number(page) || 1;
        const limitNum = Number(limit) || 10;
        const skip = (pageNum - 1) * limitNum;
        const where = {};
        if (itemCode) {
            where.ITEM_CODE = itemCode;
        }
        if (channel) {
            where.CHANNEL = channel;
        }
        if (locale) {
            where.LOCALE = locale;
        }
        if (q) {
            where.OR = [
                { ITEM_CODE: { contains: q } },
                { SUBJECT_TPL: { contains: q } },
                { BODY_TPL: { contains: q } },
            ];
        }
        const orderBy = {
            [sortBy]: order,
        };
        try {
            const [data, total] = await app.prisma.$transaction([
                app.prisma.tB_M_TEMPLATE.findMany({
                    where,
                    orderBy,
                    skip,
                    take: limitNum,
                }),
                app.prisma.tB_M_TEMPLATE.count({ where }),
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
    async createTemplate(app, data) {
        try {
            const newData = await app.prisma.tB_M_TEMPLATE.create({
                data: {
                    ITEM_CODE: data.ITEM_CODE,
                    LOCALE: data.LOCALE,
                    CHANNEL: data.CHANNEL,
                    SUBJECT_TPL: data.SUBJECT_TPL,
                    BODY_TPL: data.BODY_TPL,
                    ACTIVE: data.ACTIVE,
                    // CHANGED_DT is for updates
                },
            });
            return newData;
        }
        catch (e) {
            if (e instanceof Prisma.PrismaClientKnownRequestError) {
                if (e.code === "P2002") {
                    throw new ApplicationError(ERROR_CODES.APP_ALREADY_EXISTS, ERROR_MESSAGES[ERROR_CODES.APP_ALREADY_EXISTS]);
                }
            }
            app.log.error(e);
            throw new ApplicationError(ERROR_CODES.SYS_UNKNOWN_ERROR, ERROR_MESSAGES[ERROR_CODES.SYS_UNKNOWN_ERROR]);
        }
    },
    async updateTemplate(app, data) {
        const { ITEM_CODE, LOCALE, CHANNEL, ...updateData } = data;
        const { NEW_ITEM_CODE, NEW_LOCALE, NEW_CHANNEL, ...otherData } = updateData;
        const dataForUpdate = {
            ...otherData,
            CHANGED_DT: new Date(),
        };
        // Allow changing parts of the composite key, like in the example
        if (NEW_ITEM_CODE) {
            dataForUpdate.ITEM_CODE = NEW_ITEM_CODE;
        }
        if (NEW_LOCALE) {
            dataForUpdate.LOCALE = NEW_LOCALE;
        }
        if (NEW_CHANNEL) {
            dataForUpdate.CHANNEL = NEW_CHANNEL;
        }
        try {
            const updatedTemplate = await app.prisma.tB_M_TEMPLATE.update({
                where: {
                    ITEM_CODE_LOCALE_CHANNEL: {
                        ITEM_CODE,
                        LOCALE,
                        CHANNEL,
                    },
                },
                data: dataForUpdate,
            });
            return updatedTemplate;
        }
        catch (e) {
            if (e instanceof Prisma.PrismaClientKnownRequestError) {
                if (e.code === "P2025") {
                    app.log.error(`Record not found with key: ${ITEM_CODE}, ${LOCALE}, ${CHANNEL}`);
                    throw new ApplicationError(ERROR_CODES.APP_NOT_FOUND, ERROR_MESSAGES[ERROR_CODES.APP_NOT_FOUND]);
                }
                if (e.code === "P2002") {
                    app.log.error(`Unique constraint violation. The new key may already exist.`);
                    throw new ApplicationError(ERROR_CODES.APP_ALREADY_EXISTS, ERROR_MESSAGES[ERROR_CODES.APP_ALREADY_EXISTS]);
                }
            }
            app.log.error(`Possible Error: ${e}`);
            throw new ApplicationError(ERROR_CODES.SYS_UNKNOWN_ERROR, ERROR_MESSAGES[ERROR_CODES.SYS_UNKNOWN_ERROR]);
        }
    },
    async deleteTemplate(app, compoundId) {
        try {
            const deletedTemplate = await app.prisma.tB_M_TEMPLATE.delete({
                where: {
                    ITEM_CODE_LOCALE_CHANNEL: {
                        ITEM_CODE: compoundId.ITEM_CODE,
                        LOCALE: compoundId.LOCALE,
                        CHANNEL: compoundId.CHANNEL,
                    },
                },
            });
            return deletedTemplate;
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
