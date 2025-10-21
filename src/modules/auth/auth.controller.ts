import type { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import { authService } from './auth.service';
import { AuditAction } from '../../core/audit/auditActions';

type LoginBody = { username: string; password: string };

export const authController = {
  login:
    (app: FastifyInstance) =>
      async (req: FastifyRequest<{ Body: LoginBody }>, reply: FastifyReply) => {
        const requestId = (req.headers['x-request-id'] as string) || req.id;
        const { username, password } = req.body;

        const result = await authService.login(app, username, password, requestId);
        console.log("result",result)

        return reply.status(200).send({
          code: 'OK',
          message: AuditAction.LOGIN_SUCCESS,
          requestId,
          data: result
        });
      },

  logout:
    (app: FastifyInstance) =>
      async (req: FastifyRequest, reply: FastifyReply) => {
        const requestId = (req.headers['x-request-id'] as string) || req.id;

        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
          return reply.status(400).send({
            code: 'AUTH-ERR-001',
            message: 'Missing or invalid Authorization header',
            requestId,
          });
        }

        const token = authHeader.split(' ')[1];

        await authService.logout(app, token, requestId);

        return reply.status(200).send({
          code: 'OK',
          message: AuditAction.LOGOUT_SUCCESS,
          requestId,
        });
      },

};
