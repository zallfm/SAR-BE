import fp from 'fastify-plugin';
import { randomUUID } from 'node:crypto';
import { env } from '../../../config/env';
export default fp(async function requestLoggerPlugin(app) {
    // request id
    app.addHook('onRequest', async (req, reply) => {
        const existing = req.headers['x-request-id'] || req.id;
        const id = existing || randomUUID();
        reply.header('X-Request-Id', id);
    });
    // capture response body (only when not production)
    if (!env.NODE_ENV) {
        app.addHook('onSend', async (_req, reply, payload) => {
            try {
                // payload bisa string/buffer/stream
                reply.locals = reply.locals || {};
                reply.locals.responseBody = payload;
            }
            catch { }
            return payload;
        });
    }
    // custom success/error logs
    app.addHook('onResponse', async (req, reply) => {
        const status = reply.statusCode;
        if (status >= 500) {
            app.log.error({ url: req.url, method: req.method, status }, 'request errored');
        }
        else if (status >= 400) {
            app.log.warn({ url: req.url, method: req.method, status }, 'request failed');
        }
        else {
            app.log.info({ url: req.url, method: req.method, status }, 'request completed');
        }
    });
});
