import { createTestApp } from "./app.factory";
describe('Log Monitoring - list', () => {
    it('GET /api/sar/log_monitoring (default)', async () => {
        const app = await createTestApp();
        const res = await app.inject({
            method: 'GET',
            url: '/api/sar/log_monitoring', // atau '/api/sar/logs' sesuai routes-mu
        });
        expect(res.statusCode).toBe(200);
        const body = res.json();
        expect(body).toHaveProperty('data');
        expect(body).toHaveProperty('meta');
        expect(Array.isArray(body.data)).toBe(true);
        expect(body.meta).toEqual(expect.objectContaining({
            page: expect.any(Number),
            limit: expect.any(Number),
            total: expect.any(Number),
            totalPages: expect.any(Number),
        }));
        // contoh shape item
        expect(body.data[0]).toEqual(expect.objectContaining({
            NO: expect.any(Number),
            PROCESS_ID: expect.any(String),
            USER_ID: expect.any(String),
            MODULE: expect.any(String),
            FUNCTION_NAME: expect.any(String),
            START_DATE: expect.any(String),
            END_DATE: expect.any(String),
            STATUS: expect.any(String),
            DETAILS: expect.any(Array), // karena list kamu sudah mengisi array
        }));
        await app.close();
    });
    it('GET /api/sar/log_monitoring with filters', async () => {
        const app = await createTestApp();
        const res = await app.inject({
            method: 'GET',
            url: '/api/sar/log_monitoring?status=Error&module=Application&order=desc&sortBy=START_DATE',
        });
        expect(res.statusCode).toBe(200);
        const { data } = res.json();
        expect(Array.isArray(data)).toBe(true);
        // semua item harus memenuhi filter
        for (const row of data) {
            expect(row.STATUS).toBe('Error');
            expect(row.MODULE).toBe('Application');
        }
        await app.close();
    });
});
