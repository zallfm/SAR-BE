import { AsyncLocalStorage } from "async_hooks";
const als = new AsyncLocalStorage();
// dipanggil oleh plugin per-request
export function runWithRequestContext(value, fn) {
    return als.run(value, fn);
}
// ambil context di mana saja (service/repo/util)
export function getRequestContext() {
    return (als.getStore() ?? {
        userId: "unknown",
        requestId: "unknown",
    });
}
// helper cepat
export const currentUserId = () => getRequestContext().userId;
export const currentRequestId = () => getRequestContext().requestId;
// (opsional) ekstrak user dari fastify request
export function extractUserFromRequest(app, req) {
    // kalau sudah verify, fastify-jwt isi req.user
    const u = req.user ?? null;
    if (u?.sub) {
        return {
            userId: String(u.sub),
            role: u.role ? String(u.role) : undefined,
            username: u.name ? String(u.name) : undefined,
        };
    }
    // fallback: decode tanpa verify (best-effort)
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (token) {
        try {
            const decoded = app.jwt.decode(token);
            if (decoded) {
                return {
                    userId: String(decoded.sub ?? "unknown"),
                    role: decoded.role ? String(decoded.role) : undefined,
                    username: decoded.name ? String(decoded.name) : undefined,
                };
            }
        }
        catch { }
    }
    return { userId: "unknown" };
}
