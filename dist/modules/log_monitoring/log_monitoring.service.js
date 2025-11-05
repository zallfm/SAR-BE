import { logRepository } from './log_monitoring.repository';
export const logMonitoringService = {
    async listLogs(query) {
        const q = {
            sortBy: 'START_DATE',
            order: 'desc',
            page: 1,
            limit: 10,
            ...query,
        };
        return logRepository.listLogs(q);
    },
    async getLog(processId) {
        return logRepository.getLogByProcessId(processId);
    },
    async listDetails(processId, page, limit) {
        const p = page ?? 1;
        const l = limit ?? 20;
        return logRepository.listDetailsByProcessId(processId, p, l);
    }
};
