import { ApplicationError } from "./applicationError.js";
import { ERROR_CODES } from "./errorCodes.js";
import { ERROR_MESSAGES } from "./errorMessages.js";
export async function errorHandler(err, req, reply) {
    const requestId = req.headers["x-request-id"] || req.id;
    // logger selalu ada: pakai this.log kalau tersedia, kalau tidak pakai req.log
    const logger = this?.log ?? req.log;
    if (err instanceof ApplicationError) {
        err.requestId = requestId;
        const status = err.statusCode ?? 400;
        logger.warn({ err, requestId }, `ApplicationError: ${err.code}`);
        return reply.status(status).send(err.toResponse());
    }
    if (err.validation) {
        logger.error({ err, requestId }, "Schema validation error");
        const code = ERROR_CODES.VAL_INVALID_FORMAT;
        const message = err.message;
        return reply.status(400).send({ code, message, requestId });
    }
    logger.error({ err, requestId }, "Unhandled 500-level error");
    const code = ERROR_CODES.SYS_UNKNOWN_ERROR;
    const message = ERROR_MESSAGES[code] || "An unexpected error occurred";
    return reply.status(500).send({ code, message, requestId });
}
