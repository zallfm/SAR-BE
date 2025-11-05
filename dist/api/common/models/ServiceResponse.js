import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';
export class ServiceResponse {
    success;
    message;
    data;
    statusCode;
    pagination;
    constructor(success, message, data, statusCode, pagination) {
        this.success = success;
        this.message = message;
        this.data = data;
        this.statusCode = statusCode;
        this.pagination = pagination;
    }
    static success(message, data, statusCode = StatusCodes.OK, pagination) {
        return new ServiceResponse(true, message, data, statusCode, pagination);
    }
    static failure(message, data, statusCode = StatusCodes.BAD_REQUEST, pagination) {
        return new ServiceResponse(true, message, data, statusCode, pagination);
    }
}
export const ServiceResponseSchema = (dataSchema) => z.object({
    success: z.boolean(),
    message: z.string(),
    data: dataSchema.optional(),
    statusCode: z.number(),
    pagination: z
        .object({
        totalData: z.number(),
        page: z.number(),
        limit: z.number(),
        totalPage: z.number(),
    })
        .optional(),
});
