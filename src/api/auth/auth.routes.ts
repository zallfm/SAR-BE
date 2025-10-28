import type { FastifyInstance } from 'fastify'
import { authController } from '../../modules/auth/auth.controller'
import { getMenuSchema, getProfileSchema, loginSchema } from '../../modules/auth/auth.schemas'
import { errorHandler } from '../../core/errors/errorHandler'
import authorize from '../common/middleware/authorize'

type LoginBody = { username: string; password: string }
type UsernameQuery = { username?: string };

export async function authRoutes(app: FastifyInstance) {
  // LOGIN — pakai error handler khusus hanya di sini
  app.post<{ Body: LoginBody }>(
    '/login',
    { schema: loginSchema, errorHandler },
    async (req, reply) => {
      return authController.login(app)(req, reply)
    }
  )

  // LOGOUT — tanpa error handler
  app.post('/logout', async (req, reply) => {
    return authController.logout(app)(req, reply)
  })

  app.get(
    '/menu',
    {
      preHandler: [app.authenticate],
      schema: getMenuSchema
    },
    async (req, reply) => authController.getMenu(app)(req, reply)
  );

  app.get(
    '/profile',
    {
      preHandler: [app.authenticate],
      schema: getProfileSchema
    },
    async (req, reply) => authController.getProfile(app)(req, reply)
  );
}
