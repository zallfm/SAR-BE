import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import fastifyJWT from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";

import { env } from "./config/env";
import { securityPlugin } from "./plugins/securityHeaders";
import { requestIdPlugin } from "./core/observability/requestId";
import { errorHandler } from "./core/errors/errorHandler";
import { authRoutes } from "./api/auth/auth.routes";
import { logMonitoringRoutes } from "./api/logging_monitoring/log_monitoring.routes";
import prisma from "./plugins/prisma";
import { indexRoutes } from "./api/index.routes";
import { SECURITY_CONFIG } from "./config/security";
import authorize from "./api/common/middleware/authorize";

export async function buildApp() {
  const app = Fastify({
    logger: { level: env.NODE_ENV === "production" ? "info" : "debug" },
    ajv: {
      customOptions: {
        coerceTypes: true,
      },
    },
  });

  // ==========================================
  // 🔒 1️⃣ Register Security & Utility Plugins
  // ==========================================

  await app.register(prisma);

  await app.register(rateLimit, {
    max: SECURITY_CONFIG.MAX_API_CALLS_PER_MINUTE,
    timeWindow: "1 minute",
  });

  // ✅ 2️⃣ Aktifkan CORS untuk frontend kamu (Vite di port 5173)
  await app.register(cors, {
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "x-request-id",
    ],
    credentials: true,
  });

  // 🧠 Tambahkan Helmet setelah CORS
  await app.register(helmet, { contentSecurityPolicy: false });

  // JWT
  await app.register(fastifyJWT, { secret: env.JWT_SECRET });

  // Plugin internal
  await app.register(requestIdPlugin);
  await app.register(securityPlugin);

  // Custom Error Handler (optional)
  // app.setErrorHandler(errorHandler);

  // ==========================================
  // 🚀 3️⃣ Register Routes
  // ==========================================

  // await app.register(authorize, {
  //   publicPaths: [
  //     "/health",              // health check
  //     "/api/auth/login",
  //     "/api/auth/refresh-token",
  //     // tambah path publik lain kalau ada
  //   ],
  //   autoRegisterJwt: false,   // JWT sudah diregister di atas
  //   // jwtSecret: env.JWT_SECRET, // tidak perlu karena kita sudah register JWT
  //   // prefixBase: '',             // isi kalau kamu pasang base prefix konsisten
  // });
  await app.register(authorize, {
    publicPaths: [
      "/health",
      "/api/auth/login",
      "/api/auth/refresh-token",
    ],
    prefixBase: "", // optional
  });


  await app.register(authRoutes, { prefix: "/api/auth" });
  await app.register(indexRoutes, { prefix: "/api/sar" });

  // ==========================================
  // ❤️ 4️⃣ Health Check
  // ==========================================

  app.get("/health", async (request, reply) => {
    try {
      if (app.hasDecorator("prisma")) {
        await app.prisma.$queryRaw`SELECT 1`;
        return { status: "ok", db: "ok" };
      }
      return { status: "ok", db: "skipped" };
    } catch (e) {
      app.log.error(e, "Database health check failed");
      reply.status(503);
      return { status: "error", db: "unavailable" };
    }
  });

  return app;
}
