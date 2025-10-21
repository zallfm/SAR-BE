import type { FastifyInstance } from 'fastify'
import { authController } from '../../modules/auth/auth.controller'
import { loginSchema } from '../../modules/auth/auth.schemas'
import { errorHandler } from '../../core/errors/errorHandler'

type LoginBody = { username: string; password: string }

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
}
