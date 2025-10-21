import type { FastifyRequest, FastifyReply } from 'fastify'
import { isTokenBlacklisted } from './session.store'

export async function authGuard(req: FastifyRequest, reply: FastifyReply) {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.status(401).send({ code: 'AUTH-ERR-401', message: 'Missing token' })
    }

    const token = authHeader.split(' ')[1]
    if (isTokenBlacklisted(token)) {
      return reply.status(401).send({ code: 'AUTH-ERR-402', message: 'Token expired or logged out' })
    }

    await req.jwtVerify()
  } catch (err) {
    return reply.status(401).send({ code: 'AUTH-ERR-403', message: 'Invalid token' })
  }
}
