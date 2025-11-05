import { createTestApp } from './app.factory';
describe('RequestId propagation', () => {
    it('echoes x-request-id header', async () => {
        const app = await createTestApp();
        const res = await app.inject({
            method: 'GET',
            url: '/health',
            headers: { 'x-request-id': 'abc-123' }
        });
        expect(res.headers['x-request-id']).toBe('abc-123');
        expect(res.statusCode).toBe(200);
    });
});
