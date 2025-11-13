import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { ServiceResponse } from '../models/ServiceResponse';
import { authService } from '../../../modules/auth/auth.service';
import { env } from '../../../config/env';

// Payload JWT yang kamu pakai (sesuaikan kalau ada field lain)
type JwtPayload = {
  sub: string;    // username disimpan di 'sub'
  name?: string;
  role?: string;
  // iat: number;
  // exp: number;
};

// Profil yang diperkaya dari DB untuk guard permission
type GuardedUser = {
  username: string;
  divisionId: number;
  noreg: string;
  features: string[];
  functions: string[];
  roles: string[];
};

// ---- AUGMENT TYPES ----
// Augment milik @fastify/jwt agar req.user dikenali sebagai JwtPayload.
// ⚠️ JANGAN mendeklarasikan ulang req.user di module 'fastify', cukup di sini.
declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JwtPayload;
    user: JwtPayload; // diisi otomatis oleh req.jwtVerify()
  }
}

// Tambahkan property baru di FastifyRequest untuk profil (bukan menimpa 'user')
declare module 'fastify' {
  interface FastifyRequest {
    auth?: GuardedUser;
  }
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requirePermission: (perm: string) =>
      (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireAnyPermission: (perms: string[]) =>
      (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireAllPermissions: (perms: string[]) =>
      (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

type AuthOpts = {
  publicPaths?: string[];
  prefixBase?: string; // opsional
};

const DEFAULT_PUBLIC = [
  '/health-check',
  '/health',
  '/docs',
  '/auth/login',
  '/auth/refresh-token',
  '/job/start',
  '/tools',
];

const dynamicRole = env.DYNAMIC_ROLE

const startsWithAny = (url: string, bases: string[]) =>
  bases.some((p) => url.startsWith(p));

export default fp<AuthOpts>(async function authorizePlugin(app: FastifyInstance, opts) {
  const publicPaths = opts?.publicPaths ?? DEFAULT_PUBLIC;
  const base = opts?.prefixBase ?? '';

  // Hanya verifikasi token (req.user = JwtPayload)
  // Support both Bearer Token and Cookie
  app.decorate('authenticate', async function (req, reply) {
    try {
      // Try to verify JWT - @fastify/jwt will handle both Bearer token and cookie
      await (req as any).jwtVerify(); // dari @fastify/jwt; mengisi req.user
    } catch (e: any) {
      const msg = /expired/i.test(String(e?.message))
        ? 'Unauthorized: Token Expired'
        : 'Unauthorized: Invalid Token';
      return reply.status(401).send(ServiceResponse.failure(msg, null, 401));
    }
  });

  // Global guard: skip public → verify JWT → enrich profile ke req.auth
  app.addHook('onRequest', async (req, reply) => {
    const url = req.raw.url || req.url || '';
    const fullPublic = publicPaths.map((p) => (base ? `${base}${p}` : p));
    if (startsWithAny(url, fullPublic)) return;

    try {
      await app.authenticate(req, reply); // set req.user (JwtPayload)
    } catch {
      return; // authenticate sudah kirim response error
    }

    const payload = (req as any).user as JwtPayload | undefined;
    const username = payload?.sub; // <-- pakai 'sub' bukan 'username'
    if (!username) {
      return reply
        .status(401)
        .send(ServiceResponse.failure('Unauthorized', null, 401));
    }

    try {
      // authService.validate mengembalikan profil (sesuai service kamu)
      const profile: any = await authService.validate(username);

      // Bentuk req.auth untuk permission guards
      req.auth = {
        username: profile?.user?.username ?? username,
        divisionId: 2,
        noreg: "100000",
        features: profile?.features ?? [],
        functions: profile?.functions ?? [],
        roles: profile?.roles ?? [],
      };

      if (!req.auth.username) {
        return reply
          .status(401)
          .send(ServiceResponse.failure('Unauthorized', null, 401));
      }
    } catch {
      return reply
        .status(401)
        .send(ServiceResponse.failure('Unauthorized', null, 401));
    }
  });

  // ===== Permission Guards (pakai req.auth, JANGAN req.user) =====

  app.decorate('requirePermission', function (permission: string) {
    return async (req, reply) => {
      const u = req.auth;
      if (!u) {
        return reply
          .status(401)
          .send(ServiceResponse.failure('Unauthorized', null, 401));
      }
      if (u.roles?.includes(dynamicRole)) return; // super admin bypass
      const ok = u.features?.includes(permission) || u.functions?.includes(permission);
      if (!ok) {
        return reply
          .status(403)
          .send(
            ServiceResponse.failure(
              `Access denied. You don't have permission to access this resource`,
              null,
              403
            )
          );
      }
    };
  });

  app.decorate('requireAnyPermission', function (perms: string[]) {
    return async (req, reply) => {
      const u = req.auth;
      if (!u) {
        return reply
          .status(401)
          .send(ServiceResponse.failure('Unauthorized', null, 401));
      }
      if (u.roles?.includes(dynamicRole)) return;

      const ok = perms.some(
        (p) => u.features?.includes(p) || u.functions?.includes(p)
      );
      if (!ok) {
        return reply
          .status(403)
          .send(
            ServiceResponse.failure(
              `Access denied. Required one of: ${perms.join(', ')}`,
              null,
              403
            )
          );
      }
    };
  });

  app.decorate('requireAllPermissions', function (perms: string[]) {
    return async (req, reply) => {
      const u = req.auth;
      if (!u) {
        return reply
          .status(401)
          .send(ServiceResponse.failure('Unauthorized', null, 401));
      }
      if (u.roles?.includes(dynamicRole)) return;

      const ok = perms.every(
        (p) => u.features?.includes(p) || u.functions?.includes(p)
      );
      if (!ok) {
        return reply
          .status(403)
          .send(
            ServiceResponse.failure(
              `Access denied. Required all of: ${perms.join(', ')}`,
              null,
              403
            )
          );
      }
    };
  });
});
