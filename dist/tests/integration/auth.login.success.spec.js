import { createTestApp } from './app.factory';
import { env } from '../../config/env';
describe('POST /api/auth/login - success', () => {
    it('returns token and user when credentials are valid', async () => {
        const app = await createTestApp();
        const res = await app.inject({
            method: 'POST',
            url: '/api/auth/login',
            payload: {
                username: env.MOCK_USER_ADMIN_USERNAME,
                password: env.MOCK_USER_ADMIN_PASSWORD
            },
            headers: { 'x-request-id': 'test-req-1' }
        });
        expect(res.statusCode).toBe(200);
        const body = res.json();
        expect(body.code).toBe('OK');
        expect(body.requestId).toBe('test-req-1');
        expect(body.data.token).toBeDefined();
        expect(body.data.user.username).toBe(env.MOCK_USER_ADMIN_USERNAME);
    });
});
