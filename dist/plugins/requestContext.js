import fp from "fastify-plugin";
import { extractUserFromRequest, runWithRequestContext } from "../core/requestContext";
// import { extractUserFromRequest, runWithRequestContext } from "../core/context/requestContext";
export default fp(async function requestContextPlugin(app) {
    app.addHook("onRequest", (req, reply, done) => {
        // requestId dari header atau dari fastify
        const requestId = req.headers["x-request-id"] || req.id;
        // best-effort ambil user (req.user atau decode token)
        const user = extractUserFromRequest(app, req);
        // Bungkus lifecycle request ini dalam ALS
        runWithRequestContext({ userId: user.userId, role: user.role, username: user.username, requestId }, () => {
            done();
        });
    });
});
