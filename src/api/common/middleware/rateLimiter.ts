import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import rateLimit from '@fastify/rate-limit';

type RLOpts = {
  max?: number;
  timeWindowMs?: number;
  allowList?: string[]; // HANYA string[], tidak boleh RegExp
};

export default fp<RLOpts>(async function rateLimiterPlugin(app: FastifyInstance, opts) {
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
