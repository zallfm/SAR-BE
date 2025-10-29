import type { FastifyReply, FastifyRequest } from 'fastify';
import { ERROR_CODES } from '../core/errors/errorCodes';
import { ERROR_MESSAGES } from '../core/errors/errorMessages';
export type AppRole = 'ADMINISTRATOR' | 'SO' | 'DPH';

export const roleGate =
  (allowed: AppRole[]) =>
  async (req: FastifyRequest, reply: FastifyReply) => {
    // error
    const code = ERROR_CODES.AUTH_TOKEN_INVALID
    const messagge = ERROR_MESSAGES[ERROR_CODES.API_UNAUTHORIZED]
    try {
      await req.jwtVerify();
    } catch {
      return reply.code(401).send({ code, messagge });
    }

    const currentRole = String((req.user as any)?.role ?? '').toUpperCase();
    const allowedUpper = allowed.map(r => r.toUpperCase());

    

    if (!currentRole || !allowedUpper.includes(currentRole)) {
      return reply.code(403).send({
        code: code,
        message: `Access denied for role: ${currentRole || 'UNKNOWN'}`,
        allowedRoles: allowed,
      });
    }
  };
