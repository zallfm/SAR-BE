import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import fastifyJWT from '@fastify/jwt';
import { env } from './config/env';
import { securityPlugin } from './plugins/securityHeaders';
import { requestIdPlugin } from './core/observability/requestId';
import { errorHandler } from './core/errors/errorHandler';
import { authRoutes } from './api/auth/auth.routes';
import rateLimit from '@fastify/rate-limit';
import { SECURITY_CONFIG } from './config/security';
import { logMonitoringRoutes } from './api/logging_monitoring/log_monitoring.routes';

export async function buildApp() {
  const app = Fastify({
    logger: { level: env.NODE_ENV === 'production' ? 'info' : 'debug' }
  });

  await app.register(rateLimit, {
    max: SECURITY_CONFIG.MAX_API_CALLS_PER_MINUTE,
    timeWindow: '1 minute'
  })

  await app.register(cors, { origin: true });
  await app.register(helmet, { contentSecurityPolicy: false });

  await app.register(fastifyJWT, { secret: env.JWT_SECRET });

  await app.register(requestIdPlugin);
  await app.register(securityPlugin);

  // app.setErrorHandler(errorHandler);

  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(logMonitoringRoutes, { prefix: '/api/sar' });

  app.get('/health', async () => ({ status: 'ok' }));
  // console.log('== ROUTES ==');
  // console.log(app.printRoutes());

  return app;
}