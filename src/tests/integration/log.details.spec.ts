import { createTestApp } from "./app.factory";

describe('Log Monitoring - details', () => {
    it('GET /api/sar/log_monitoring/:processId/details (paginated)', async () => {
        const app = await createTestApp();

        const res = await app.inject({
            method: 'GET',
            url: '/api/sar/log_monitoring/2025011600017/details?page=1&limit=5',
        });

        expect(res.statusCode).toBe(200);
        const body = res.json();
        expect(Array.isArray(body.data)).toBe(true);
        expect(body.data.length).toBeLessThanOrEqual(5);
        expect(body.meta).toEqual(
            expect.objectContaining({
                page: 1,
                limit: 5,
                total: expect.any(Number),
                totalPages: expect.any(Number),
            })
        );
        await app.close();
    });

    it('GET /api/sar/log_monitoring/:processId/details (paginated)', async () => {
        const app = await createTestApp();
        const res = await app.inject({
            method: 'GET',
            url: '/api/sar/log_monitoring/2025011600017/details?page=1&limit=20',
        });
        expect(res.statusCode).toBe(200);
        const body = res.json();
        expect(Array.isArray(body.data)).toBe(true);
        expect(body.meta).toEqual(
            expect.objectContaining({ page: 1, limit: 20, total: expect.any(Number), totalPages: expect.any(Number) })
        );
        await app.close();
    });
});
