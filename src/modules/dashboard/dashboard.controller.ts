import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { dashboardService as svc } from "./dashboard.service";

function getAuthInfo(req: FastifyRequest) {
    const { roles, ...rest } = req.auth as {
        noreg: string,
        divisionId: number,
        departmentId: number,
        roles: string[]
    };

    const auth = {
        ...rest,
        role: roles[0]
    };
    if (!auth?.noreg) {
        throw new Error("User authentication details (noreg) not found.");
    }
    if (!auth?.role) {
        throw new Error("User role not found.");
    }
    if (auth.divisionId === undefined) {
        throw new Error("User divisionId not found.");
    }
    if (auth.departmentId === undefined) {
        throw new Error("User departmentId not found.");
    }

    return auth;
}

export const dashboardController = {
    getAdminDashboardStats: (_app: FastifyInstance) =>
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

            const dashboardData = await svc.getAdminDashboardStats(queryFilters);
            return reply.send(dashboardData);
        },


    getSoDashboardStats: (_app: FastifyInstance) =>
        async (
            req: FastifyRequest<{
                Querystring: {
                    period?: string;
                    applicationId?: string;
                };
            }>,
            reply: FastifyReply
        ) => {
            const auth = getAuthInfo(req);

            const queryFilters = {
                period: req.query.period,
                applicationId: req.query.applicationId,
            };

            const dashboardData = await svc.getSoDashboardStats(auth, queryFilters);
            return reply.send(dashboardData);
        },


    getDphDashboardStats: (_app: FastifyInstance) =>
        async (
            req: FastifyRequest<{
                Querystring: {
                    period?: string;
                    applicationId?: string;
                };
            }>,
            reply: FastifyReply
        ) => {
            const auth = getAuthInfo(req);

            const queryFilters = {
                period: req.query.period,
                applicationId: req.query.applicationId,
            };

            const dashboardData = await svc.getDphDashboardStats(auth, queryFilters);
            return reply.send(dashboardData);
        },

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