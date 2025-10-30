import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { randomUUID } from 'node:crypto';
import { env } from '../../../config/env';

export default fp(async function requestLoggerPlugin(app: FastifyInstance) {
  // request id
  app.addHook('onRequest', async (req, reply) => {
    const existing = (req.headers['x-request-id'] as string) || (req.id as string);
    const id = existing || randomUUID();
    reply.header('X-Request-Id', id);
  });

  // capture response body (only when not production)
  if (!env.NODE_ENV) {
    app.addHook('onSend', async (_req: FastifyRequest, reply: FastifyReply, payload) => {
      try {
        // payload bisa string/buffer/stream
        (reply as any).locals = (reply as any).locals || {};
        (reply as any).locals.responseBody = payload;
      } catch {}
      return payload as any;
    });
  }

  // custom success/error logs
  app.addHook('onResponse', async (req, reply) => {
    const status = reply.statusCode;
    if (status >= 500) {
      app.log.error({ url: req.url, method: req.method, status }, 'request errored');
    } else if (status >= 400) {
      app.log.warn({ url: req.url, method: req.method, status }, 'request failed');
    } else {
      app.log.info({ url: req.url, method: req.method, status }, 'request completed');
    }
  });
});
