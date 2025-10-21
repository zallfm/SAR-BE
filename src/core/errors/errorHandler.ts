import { FastifyError, FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ApplicationError } from './applicationError.js';
import { ERROR_CODES } from './errorCodes.js';
import { ERROR_MESSAGES } from './errorMessages.js';

export async function errorHandler(
  this: FastifyInstance,
  err: FastifyError | ApplicationError,
  req: FastifyRequest,
  reply: FastifyReply
) {
  const requestId = (req.headers['x-request-id'] as string) || req.id;

  // logger selalu ada: pakai this.log kalau tersedia, kalau tidak pakai req.log
  const logger = (this as any)?.log ?? req.log;

  if (err instanceof ApplicationError) {
    err.requestId = requestId;
    const status = err.statusCode ?? 400;
    logger.warn({ err, requestId }, `ApplicationError: ${err.code}`);
    return reply.status(status).send(err.toResponse());
  }

  const status = (err as any).statusCode ?? ((err as any).validation ? 422 : 500);

  const code = (err as any).validation
    ? ERROR_CODES.AUTH_INVALID_CREDENTIALS
    : ERROR_CODES.VAL_REQUIRED_FIELD;

  const message = (err as any).validation
    ? ERROR_MESSAGES[ERROR_CODES.AUTH_INVALID_CREDENTIALS]
    : ERROR_MESSAGES[ERROR_CODES.VAL_REQUIRED_FIELD];

  logger.error({ err, requestId }, 'Unhandled error');
  return reply.status(status).send({ code, message, requestId });
}

