import type { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import { authService } from './auth.service';
import { AuditAction } from '../../core/audit/auditActions';
import { env } from '../../config/env';

type LoginBody = { username: string; password: string };
type AppRole = 'admin' | 'so' | 'dph';

const toUpperRole = (val: unknown): AppRole | undefined => {
  if (!val) return undefined;
  return String(val).toUpperCase() as AppRole;
};

type UsernameQuery = { username?: string };
export const authController = {
  login:
    (app: FastifyInstance) =>
      async (req: FastifyRequest<{ Body: LoginBody }>, reply: FastifyReply) => {
        const requestId = (req.headers['x-request-id'] as string) || req.id;
        const { username, password } = req.body;

        const result = await authService.login(app, username, password, requestId);
        // console.log("result",result)

        const normalizedRole = toUpperRole(result?.user?.role) ?? 'ADMIN'
        const userOut = {
          ...result.user,
          role: normalizedRole,
        }

        let finalToken = result.token;
        let finalExpires = env.TOKEN_EXPIRES_IN;

        try {
          if (result.token) {
            const decoded: any = app.jwt.decode(result.token) || {};
            const payload = {
              sub: decoded.sub ?? username,
              name: decoded.name ?? result.user?.username ?? username,
              role: normalizedRole,
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

  getMenu:
    (_app: FastifyInstance) =>
      async (req: FastifyRequest, reply: FastifyReply) => {
        const requestId = (req.headers['x-request-id'] as string) || req.id;

        // Ambil username dari query ?username= atau dari JWT (req.user.sub)
        const query = (req.query ?? {}) as { username?: string };
        const tokenUsername = (req as any).user?.sub as string | undefined;
        const username = query.username ?? tokenUsername;

        if (!username) {
          return reply.status(400).send({
            code: 'BAD_REQUEST',
            message: 'username is required (query ?username= or via JWT)',
            requestId,
          });
        }

        const res = await authService.getMenu(username);
        // ServiceResponse sudah siap kirim apa adanya
        return reply.status(res.statusCode ?? 200).send(res);
      },

  // ------------------ GET PROFILE ------------------
  getProfile:
    (_app: FastifyInstance) =>
      async (req: FastifyRequest, reply: FastifyReply) => {
        const requestId = (req.headers['x-request-id'] as string) || req.id;

        const query = (req.query ?? {}) as { username?: string };
        const tokenUsername = (req as any).user?.sub as string | undefined;
        const username = query.username ?? tokenUsername;

        if (!username) {
          return reply.status(400).send({
            code: 'BAD_REQUEST',
            message: 'username is required (query ?username= or via JWT)',
            requestId,
          });
        }

        const res = await authService.getProfile(username);
        return reply.status(res.statusCode ?? 200).send(res);
      },

};
