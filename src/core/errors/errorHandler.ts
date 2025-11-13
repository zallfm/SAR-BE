import {
  FastifyError,
  FastifyInstance,
  FastifyRequest,
  FastifyReply,
} from "fastify";
import { ApplicationError } from "./applicationError.js";
import { ERROR_CODES } from "./errorCodes.js";
import { ERROR_MESSAGES } from "./errorMessages.js";

export async function errorHandler(
  this: FastifyInstance,
  err: FastifyError | ApplicationError,
  req: FastifyRequest,
  reply: FastifyReply
) {
  const requestId = (req.headers["x-request-id"] as string) || req.id;

  // logger selalu ada: pakai this.log kalau tersedia, kalau tidak pakai req.log
  const logger = (this as any)?.log ?? req.log;
  if (err instanceof ApplicationError) {
    err.requestId = requestId;
    const status = err.statusCode ?? 400;
    logger.warn({ err, requestId }, `ApplicationError: ${err.code}`);

    return reply.status(status).send(err.toResponse());
  }

  if ((err as any).validation) {
    logger.error({ err, requestId }, "Schema validation error");

    const code = ERROR_CODES.VAL_INVALID_FORMAT;

    const message = (err as any).message;

    return reply.status(400).send({ code, message, requestId });
  }

  if (err instanceof Error) {
    const errorMessage = err.message?.toLowerCase() || '';
    if (errorMessage.includes('incorrect') || errorMessage.includes('username or password') || errorMessage.includes('invalid credential')) {
      logger.warn({ err, requestId }, "Credential error caught as generic Error");
      return reply.status(401).send({
        code: ERROR_CODES.AUTH_INVALID_CREDENTIALS,
        message: ERROR_MESSAGES[ERROR_CODES.AUTH_INVALID_CREDENTIALS],
        requestId
      });
    }
  }

  logger.error({ err, requestId }, "Unhandled 500-level error");

  const code = ERROR_CODES.SYS_UNKNOWN_ERROR;
  const message = ERROR_MESSAGES[code] || "An unexpected error occurred";

  return reply.status(500).send({ code, message, requestId });
}
