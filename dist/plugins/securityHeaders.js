import fp from 'fastify-plugin';
export const securityPlugin = fp(async (app) => {
    app.addHook('onRequest', async (req, reply) => {
        reply.header('x-frame-options', 'DENY');
        reply.header('x-content-type-options', 'nosniff');
        reply.header('referrer-policy', 'no-referrer');
    });
});
