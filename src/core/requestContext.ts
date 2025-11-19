import { AsyncLocalStorage } from "async_hooks";
import type { FastifyInstance, FastifyRequest } from "fastify";

type RequestContextValue = {
  userId: string;
  requestId: string;
  role?: string;
  username?: string;
  noreg?: string;
  divisionId?: number;
  departmentId?: number;
};

const als = new AsyncLocalStorage<RequestContextValue>();

// dipanggil oleh plugin per-request
export function runWithRequestContext<T>(
  value: RequestContextValue,
  fn: () => T
): T {
  return als.run(value, fn);
}

// ambil context di mana saja (service/repo/util)
export function getRequestContext(): RequestContextValue {
  return (
    als.getStore() ?? {
      userId: "unknown",
      requestId: "unknown",
    }
  );
}

// helper cepat
export const currentUserId = () => getRequestContext().userId;
export const currentRequestId = () => getRequestContext().requestId;
export const currentNoreg = () => getRequestContext().noreg;
export const currentDepartmentId = () => getRequestContext().departmentId;
// (opsional) ekstrak user dari fastify request
export function extractUserFromRequest(app: FastifyInstance, req: FastifyRequest) {
  // kalau sudah verify, fastify-jwt isi req.user
  const u: any = (req as any).user ?? null;

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
      const decoded: any = app.jwt.decode(token);
      if (decoded) {
        return {
          userId: String(decoded.sub ?? "unknown"),
          role: decoded.role ? String(decoded.role) : undefined,
          username: decoded.name ? String(decoded.name) : undefined,
          noreg: decoded.noreg ? String(decoded.noreg) : undefined,
          divisionId: decoded.divisionId ? String(decoded.divisionId) : undefined,
          departmentId: decoded.departmentId ? String(decoded.departmentId) : undefined,
        };
      }
    } catch { }
  }

  return { userId: "unknown" };
}
