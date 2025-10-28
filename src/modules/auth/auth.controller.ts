import type { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import { authService } from './auth.service';
import { AuditAction } from '../../core/audit/auditActions';

type LoginBody = { username: string; password: string };
type AppRole = 'ADMIN' | 'SO' | 'DPH';

const toUpperRole = (val: unknown): AppRole | undefined => {
  if (!val) return undefined;
  return String(val).toUpperCase() as AppRole;
};

export const authController = {
  login:
    (app: FastifyInstance) =>
      async (req: FastifyRequest<{ Body: LoginBody }>, reply: FastifyReply) => {
        const requestId = (req.headers['x-request-id'] as string) || req.id;
        const { username, password } = req.body;

        const result = await authService.login(app, username, password, requestId);

        const normalizedRole = toUpperRole(result?.user?.role) ?? 'ADMIN'
        const userOut = {
          ...result.user,
          role: normalizedRole,
        }

        let finalToken = result.token;
        let finalExpires = result.expiresIn ?? 15 * 60;

        try {
          if (result.token) {
            const decoded: any = app.jwt.decode(result.token) || {};
            const payload = {
              sub: decoded.sub ?? username,
              name: decoded.name ?? result.user?.username ?? username,
              role: normalizedRole
            };
            finalToken = app.jwt.sign(payload, { expiresIn: finalExpires })
          } else {
            const payload = {
              sub: result.user?.username ?? username,
              name: result.user?.name,
              username: result.user?.username ?? username,
              role: normalizedRole,
            }
            finalToken = app.jwt.sign(payload, { expiresIn: finalExpires })
          }
        } catch {
          const payload = {
            sub: result.user?.username ?? username,
            name: result.user?.name,
            username: result.user?.username ?? username,
            role: normalizedRole,
          }
          finalToken = app.jwt.sign(payload, { expiresIn: finalExpires })
        }

        return reply.status(200).send({
          code: 'OK',
          message: AuditAction.LOGIN_SUCCESS,
          requestId,
          data: {
            token: finalToken,
            expiresIn: finalExpires,
            user: userOut,
          }
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
