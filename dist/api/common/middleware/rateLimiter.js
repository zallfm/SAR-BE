import fp from 'fastify-plugin';
import rateLimit from '@fastify/rate-limit';
export default fp(async function rateLimiterPlugin(app, opts) {
    await app.register(rateLimit, {
        global: true,
        max: opts?.max ?? 100,
        timeWindow: opts?.timeWindowMs ?? 15 * 60 * 1000,
        allowList: opts?.allowList ?? [],
        hook: 'onRequest',
        addHeaders: {
            'x-ratelimit-limit': true,
            'x-ratelimit-remaining': true,
            'x-ratelimit-reset': true,
            'retry-after': true,
        },
    });
});
