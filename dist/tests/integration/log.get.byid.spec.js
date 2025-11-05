import { createTestApp } from "./app.factory";
describe('Log Monitoring - get by processId', () => {
    it('GET /api/sar/log_monitoring/:processId', async () => {
        const app = await createTestApp();
        const res = await app.inject({
            method: 'GET',
            url: '/api/sar/log_monitoring/2025011600017',
        });
        expect(res.statusCode).toBe(200);
        const { data } = res.json();
        expect(data.PROCESS_ID).toBe('2025011600017');
        expect(Array.isArray(data.DETAILS)).toBe(true);
        expect(data.DETAILS.length).toBeGreaterThan(0);
        await app.close();
    });
});
