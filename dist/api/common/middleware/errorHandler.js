import fp from 'fastify-plugin';
import { ServiceResponse } from '../models/ServiceResponse';
// import { ServiceResponse } from '@/api/common/models/ServiceResponse';
export default fp(async function errorHandlerPlugin(app) {
    // 404 handler
    app.setNotFoundHandler((req, reply) => {
        const res = ServiceResponse.failure('Not Found', null, 404);
        reply.status(404).send(res);
    });
    // global error handler
    app.setErrorHandler((err, _req, reply) => {
        const status = Number(err.statusCode || 500);
        const message = status === 400
            ? err.message || 'Bad Request'
            : status === 401
                ? 'Unauthorized'
                : status === 403
                    ? 'Forbidden'
                    : status === 404
                        ? 'Not Found'
                        : 'Internal Server Error';
        const res = ServiceResponse.failure(message, null, status);
        if (status >= 500)
            app.log.error(err);
        return reply.status(status).send(res);
    });
});
