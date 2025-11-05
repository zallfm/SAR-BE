import { createTestApp } from "./app.factory";
describe('Log Monitoring - export excel', () => {
    it('GET /api/sar/log_monitoring/export (xlsx)', async () => {
        const app = await createTestApp();
        const res = await app.inject({
            method: 'GET',
            url: '/api/sar/log_monitoring/export?status=Error&module=Application',
        });
        expect(res.statusCode).toBe(200);
        expect(res.headers['content-type']).toMatch(/application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet/);
        expect(res.headers['content-disposition']).toMatch(/attachment; filename="SAR_log_/);
        // konten adalah buffer
        const buf = res.rawPayload;
        expect(Buffer.isBuffer(buf)).toBe(true);
        expect(buf.length).toBeGreaterThan(1000); // heuristik aja
        await app.close();
    });
    it('GET /api/sar/log_monitoring/:processId/details/export (xlsx)', async () => {
        const app = await createTestApp();
        const res = await app.inject({
            method: 'GET',
            url: '/api/sar/log_monitoring/2025011600017/details/export',
        });
        expect(res.statusCode).toBe(200);
        expect(res.headers['content-type']).toMatch(/application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet/);
        const buf = res.rawPayload;
        expect(Buffer.isBuffer(buf)).toBe(true);
        expect(buf.length).toBeGreaterThan(500);
        await app.close();
    });
});
