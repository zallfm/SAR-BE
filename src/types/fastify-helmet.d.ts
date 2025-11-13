/**
 * Type declarations for @fastify/helmet
 * Since @fastify/helmet doesn't provide TypeScript types, we declare them here
 */

declare module '@fastify/helmet' {
  import { FastifyPluginAsync, FastifyPluginOptions } from 'fastify';
  
  interface FastifyHelmetOptions extends FastifyPluginOptions {
    contentSecurityPolicy?: boolean | {
      directives?: Record<string, string[]>;
    };
    crossOriginEmbedderPolicy?: boolean;
    crossOriginOpenerPolicy?: boolean;
    crossOriginResourcePolicy?: boolean;
    dnsPrefetchControl?: boolean;
    frameguard?: boolean | {
      action?: string;
    };
    hidePoweredBy?: boolean;
    hsts?: boolean | {
      maxAge?: number;
      includeSubDomains?: boolean;
      preload?: boolean;
    };
    ieNoOpen?: boolean;
    noSniff?: boolean;
    originAgentCluster?: boolean;
    permittedCrossDomainPolicies?: boolean;
    referrerPolicy?: boolean | {
      policy?: string;
    };
    xssFilter?: boolean;
  }
  
  const fastifyHelmet: FastifyPluginAsync<FastifyHelmetOptions>;
  export default fastifyHelmet;
}

