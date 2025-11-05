import { logRepository } from "../../modules/log_monitoring/log_monitoring.repository";
describe('logRepository.listLogs', () => {
    it('filters by STATUS and MODULE and sorts by START_DATE desc', async () => {
        const { data, meta } = await logRepository.listLogs({
            status: 'Error',
            module: 'Application',
            sortBy: 'START_DATE',
            order: 'desc',
            page: 1,
            limit: 100,
        });
        expect(Array.isArray(data)).toBe(true);
        for (const row of data) {
            expect(row.STATUS).toBe('Error');
            expect(row.MODULE).toBe('Application');
        }
        // cek sort desc
        for (let i = 1; i < data.length; i++) {
            expect(new Date(data[i - 1].START_DATE) >= new Date(data[i].START_DATE)).toBe(true);
        }
        expect(meta.total).toBeGreaterThanOrEqual(data.length);
    });
});
