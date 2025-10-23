import { LogDetail, LogEntry } from "../../types/log_monitoring";
import { mockLogDetails, mockLogs } from "./mock";

type Order = 'asc' | 'desc';
type SortBy = 'NO' | 'START_DATE' | 'END_DATE';

export interface ListLogsQuery {
    page?: number;
    limit?: number;
    status?: LogEntry['STATUS'];
    module?: string;
    userId?: string;
    q?: string;
    startDate?: string;
    endDate?: string;
    sortBy?: SortBy;
    order?: Order;
}

const parseDate = (s: string): Date => {
    const [d, m, rest] = s.split('-');
    const [y, time] = rest.split(' ');
    const [hh, mm, ss] = time.split(':').map(Number);
    return new Date(Number(y), Number(m) - 1, Number(d), hh, mm, ss)
}

function withinRange(dt: string, start?: string, end?: string): boolean {
    const t = parseDate(dt).getTime();
    if (start && t < parseDate(start).getTime()) return false;
    if (end && t > parseDate(end).getTime()) return false
    return true
}

export const logRepository = {
    async listLogs(params: ListLogsQuery) {
        const {
            page = 1,
            limit = 10,
            status,
            module,
            userId,
            q,
            startDate,
            endDate,
            sortBy = "START_DATE",
            order = 'desc'
        } = params;


        let rows: LogEntry[] = mockLogs.slice();


        if (status) rows = rows.filter(r => r.STATUS === status);
        if (module) rows = rows.filter(r => r.MODULE.toLowerCase() === module.toLowerCase())
        if (userId) rows = rows.filter(r => r.USER_ID.toLowerCase() === userId.toLowerCase());
        if (q) {
            const s = q.toLowerCase();
            rows = rows.filter(r =>
                r.DETAILS.toLowerCase().includes(s) ||
                r.FUNCTION_NAME.toLowerCase().includes(s) ||
                r.MODULE.toLowerCase().includes(s) ||
                r.PROCESS_ID.toLowerCase().includes(s)
            );
        }
        if (startDate || endDate) {
            rows = rows.filter(r => withinRange(r.START_DATE, startDate, endDate))
        }

        // sort
        rows.sort((a, b) => {
            let va: number | string, vb: number | string;
            if (sortBy === 'NO') {
                va = a.NO; vb = b.NO;
            } else if (sortBy === 'START_DATE') {
                va = parseDate(a.START_DATE).getTime();
                vb = parseDate(b.START_DATE).getTime();
            } else {
                va = parseDate(a.END_DATE).getTime();
                vb = parseDate(b.END_DATE).getTime();
            }
            const diff = (va as number) - (vb as number)
            return order === 'asc' ? diff : -diff
        })

        // paginate
        const total = rows.length;
        const offset = (page - 1) * limit;
        const data = rows.slice(offset, offset + limit);
        console.log("data", data)

        return {
            data,
            meta: {
                page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit))
            }
        }
    },

    async getLogByProcessId(processId: string) {
        return mockLogs.find(r => r.PROCESS_ID === processId) ?? null
    },

    async listDetailsByProcessId(processId: string, page = 1, limit = 20) {
        const rows: LogDetail[] = mockLogDetails.filter(d => d.PROCESS_ID === processId)

        rows.sort((a, b) => a.ID - b.ID);

        const total = rows.length;
        const offset = (page - 1) * limit;
        const data = rows.slice(offset, offset + limit);

        return {
            data,
            meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) }
        }
    }
}