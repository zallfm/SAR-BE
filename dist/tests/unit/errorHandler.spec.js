import { buildApp } from '../../app';
import { ApplicationError } from '../../../src/core/errors/applicationError';
import { ERROR_CODES } from '../../../src/core/errors/errorCodes';
import { errorHandler } from "../../core/errors/errorHandler";
describe('errorHandler', () => {
    it('formats ApplicationError', async () => {
        const app = await buildApp();
        app.get('/boom', { errorHandler: errorHandler.bind(app) }, async () => {
            throw new ApplicationError(ERROR_CODES.API_SERVER_ERROR, 'Boom', undefined, undefined, 500);
        });
        const res = await app.inject({ method: 'GET', url: '/boom', headers: { 'x-request-id': 'id-1' } });
        expect(res.statusCode).toBe(500);
        const body = res.json();
        expect(body.code).toBe('API-ERR-403');
        expect(body.requestId).toBe('id-1');
    });
});
