import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

type pagination = {
  totalData: number;
  page: number;
  limit: number;
  totalPage: number;
};
export class ServiceResponse<T = null> {
  readonly success: boolean;
  readonly message: string;
  readonly data: T;
  readonly statusCode: number;
  readonly pagination: undefined | pagination;

  private constructor(
    success: boolean,
    message: string,
    data: T,
    statusCode: number,
    pagination?: pagination,
  ) {
    this.success = success;
    this.message = message;
    this.data = data;
    this.statusCode = statusCode;
    this.pagination = pagination;
  }

  static success<T>(
    message: string,
    data: T,
    statusCode: number = StatusCodes.OK,
    pagination?: pagination,
  ) {
    return new ServiceResponse(true, message, data, statusCode, pagination);
  }

  static failure<T>(
    message: string,
    data: T,
    statusCode: number = StatusCodes.BAD_REQUEST,
    pagination?: pagination,
  ) {
    return new ServiceResponse(true, message, data, statusCode, pagination);
  }
}

export const ServiceResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
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
