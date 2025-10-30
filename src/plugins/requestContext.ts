import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { extractUserFromRequest, runWithRequestContext } from "../core/requestContext";
// import { extractUserFromRequest, runWithRequestContext } from "../core/context/requestContext";

export default fp(async function requestContextPlugin(app: FastifyInstance) {
  app.addHook("onRequest", async (req, reply) => {
    // requestId dari header atau dari fastify
    const requestId = (req.headers["x-request-id"] as string) || req.id;

    // best-effort ambil user (req.user atau decode token)
    const user = extractUserFromRequest(app, req);

    // Bungkus lifecycle request ini dalam ALS
    runWithRequestContext(
      { userId: user.userId, role: user.role, username: user.username, requestId },
      () => {
        // kita sengaja tidak menunggu apa-apa di sini; hook lanjut ke handler
      }
    );
  });
});
