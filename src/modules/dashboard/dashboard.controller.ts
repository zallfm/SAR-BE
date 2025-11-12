import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { dashboardService as svc } from "./dashboard.service";

function getAuthInfo(req: FastifyRequest) {
    const auth = req.auth as { noreg: string, divisionId: number };
    if (!auth?.noreg) {
        throw new Error(
            "User authentication details (noreg) not found. Check auth plugin."
        );
    }
    return auth;
}

export const dashboardController = {


    getDashboardStats: (_app: FastifyInstance) =>
        async (
            req: FastifyRequest<{
                Querystring: {
                    period?: string;
                    divisionId?: number;
                    departmentId?: number;
                    applicationId?: string;
                };
            }>,
            reply: FastifyReply
        ) => {

            const queryFilters = {
                period: req.query.period,
                divisionId: req.query.divisionId ? Number(req.query.divisionId) : undefined,
                departmentId: req.query.departmentId ? Number(req.query.departmentId) : undefined,
                applicationId: req.query.applicationId,
            };

            const dashboardData = await svc.getUarDashboardStats(queryFilters);


            return reply.send(dashboardData);
        },


    getPeriodOptions: (_app: FastifyInstance) =>
        async (
            _req: FastifyRequest,
            reply: FastifyReply
        ) => {
            const data = await svc.getPeriodOptions();
            return reply.send(data);
        },

    getDivisionOptions: (_app: FastifyInstance) =>
        async (
            _req: FastifyRequest,
            reply: FastifyReply
        ) => {
            const data = await svc.getDivisionOptions();
            return reply.send(data);
        },

    getDepartmentOptions: (_app: FastifyInstance) =>
        async (
            req: FastifyRequest<{
                Querystring: {
                    divisionId?: number;
                };
            }>,
            reply: FastifyReply
        ) => {
            const divisionId = req.query.divisionId ? Number(req.query.divisionId) : 0;
            const data = await svc.getDepartmentOptions(divisionId);
            return reply.send(data);
        },

    getApplicationOptions: (_app: FastifyInstance) =>
        async (
            _req: FastifyRequest,
            reply: FastifyReply
        ) => {
            const data = await svc.getApplicationOptions();
            return reply.send(data);
        },
};