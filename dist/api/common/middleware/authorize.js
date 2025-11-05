import fp from 'fastify-plugin';
import { ServiceResponse } from '../models/ServiceResponse';
import { authService } from '../../../modules/auth/auth.service';
const DEFAULT_PUBLIC = [
    '/health-check',
    '/health',
    '/docs',
    '/auth/login',
    '/auth/refresh-token',
    '/job/start',
    '/tools',
];
const startsWithAny = (url, bases) => bases.some((p) => url.startsWith(p));
export default fp(async function authorizePlugin(app, opts) {
    const publicPaths = opts?.publicPaths ?? DEFAULT_PUBLIC;
    const base = opts?.prefixBase ?? '';
    // Hanya verifikasi token (req.user = JwtPayload)
    app.decorate('authenticate', async function (req, reply) {
        try {
            await req.jwtVerify(); // dari @fastify/jwt; mengisi req.user
        }
        catch (e) {
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
        if (startsWithAny(url, fullPublic))
            return;
        try {
            await app.authenticate(req, reply); // set req.user (JwtPayload)
        }
        catch {
            return; // authenticate sudah kirim response error
        }
        const payload = req.user;
        const username = payload?.sub; // <-- pakai 'sub' bukan 'username'
        if (!username) {
            return reply
                .status(401)
                .send(ServiceResponse.failure('Unauthorized', null, 401));
        }
        try {
            // authService.validate mengembalikan profil (sesuai service kamu)
            const profile = await authService.validate(username);
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
        }
        catch {
            return reply
                .status(401)
                .send(ServiceResponse.failure('Unauthorized', null, 401));
        }
    });
    // ===== Permission Guards (pakai req.auth, JANGAN req.user) =====
    app.decorate('requirePermission', function (permission) {
        return async (req, reply) => {
            const u = req.auth;
            if (!u) {
                return reply
                    .status(401)
                    .send(ServiceResponse.failure('Unauthorized', null, 401));
            }
            if (u.roles?.includes('adminsar'))
                return; // super admin bypass
            const ok = u.features?.includes(permission) || u.functions?.includes(permission);
            if (!ok) {
                return reply
                    .status(403)
                    .send(ServiceResponse.failure(`Access denied. You don't have permission to access this resource`, null, 403));
            }
        };
    });
    app.decorate('requireAnyPermission', function (perms) {
        return async (req, reply) => {
            const u = req.auth;
            if (!u) {
                return reply
                    .status(401)
                    .send(ServiceResponse.failure('Unauthorized', null, 401));
            }
            if (u.roles?.includes('adminsar'))
                return;
            const ok = perms.some((p) => u.features?.includes(p) || u.functions?.includes(p));
            if (!ok) {
                return reply
                    .status(403)
                    .send(ServiceResponse.failure(`Access denied. Required one of: ${perms.join(', ')}`, null, 403));
            }
        };
    });
    app.decorate('requireAllPermissions', function (perms) {
        return async (req, reply) => {
            const u = req.auth;
            if (!u) {
                return reply
                    .status(401)
                    .send(ServiceResponse.failure('Unauthorized', null, 401));
            }
            if (u.roles?.includes('adminsar'))
                return;
            const ok = perms.every((p) => u.features?.includes(p) || u.functions?.includes(p));
            if (!ok) {
                return reply
                    .status(403)
                    .send(ServiceResponse.failure(`Access denied. Required all of: ${perms.join(', ')}`, null, 403));
            }
        };
    });
});
