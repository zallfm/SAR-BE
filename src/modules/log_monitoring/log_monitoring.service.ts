import { logRepository, type ListLogsQuery } from './log_monitoring.repository';

export const logMonitoringService  = {
    async listLogs(query: ListLogsQuery) {
        const q = {
            sortBy: 'START_DATE' as const,
            order: 'desc' as const,
            page: 1,
            limit: 10,
            ...query,
        }
        return logRepository.listLogs(q)
    },

    async getLog(processId: string) {
        return logRepository.getLogByProcessId(processId)
    },

    async listDetails(processId: string, page?: number, limit?: number) {
        const p = page ?? 1;
        const l = limit ?? 20;
        return logRepository.listDetailsByProcessId(processId, p, l)
    }
}