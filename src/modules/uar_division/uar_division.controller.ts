
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { uarDivisionService as svc } from "./uar_division.service";
import type { UarDivisionBatchUpdateDTO } from "../../types/uar_division";


function getAuthInfo(req: FastifyRequest) {
    const auth = req.auth as { divisionId: number; noreg: string; departmentId: number };
    if (!auth?.divisionId || !auth?.noreg) {
        throw new Error(
            "User authentication details (divisionId, noreg) not found. Check auth plugin."
        );
    }
    return auth;
}

export const uarDivisionController = {

    list: (_app: FastifyInstance) =>
        async (
            req: FastifyRequest<{
                Querystring: {
                    page?: number;
                    limit?: number;
                    period?: string;
                    uarId?: string;
                    status?: 'InProgress' | 'Finished';
                    createdDateStart?: string;
                    createdDateEnd?: string;
                    completedDateStart?: string;
                    completedDateEnd?: string;
                    reviewStatus?: 'pending';
                };
            }>,
            reply: FastifyReply
        ) => {
            const { departmentId, noreg } = getAuthInfo(req);
            const { page = 1, limit = 10, period, uarId, status, reviewStatus, completedDateEnd, completedDateStart, createdDateEnd, createdDateStart } = req.query ?? {};

            const result = await svc.list(
                {
                    page: Number(page),
                    limit: Number(limit),
                    period,
                    uarId,
                    status,
                    reviewStatus,
                    createdDateStart,
                    createdDateEnd,
                    completedDateStart,
                    completedDateEnd,
                },
                Number(departmentId),
                noreg
            );

            return reply.send({
                data: result.data,
                meta: {
                    page: Number(page),
                    limit: Number(limit),
                    total: result.total,
                }
            });
        },


    getDetails: (_app: FastifyInstance) =>
        async (
            req: FastifyRequest<{ Params: { id: string } }>,
            reply: FastifyReply
        ) => {
            const { divisionId } = getAuthInfo(req);
            const uarId = req.params.id;
            const data = await svc.getDetails(uarId, Number(divisionId));
            return reply.send({ data });
        },

    getUar: (_app: FastifyInstance) =>
        async (
            req: FastifyRequest<{ Params: { id: string } }>,
            reply: FastifyReply
        ) => {
            const { divisionId } = getAuthInfo(req);
            const uarId = req.params.id;
            const data = await svc.getUar(uarId, Number(divisionId));
            return reply.send({ data });
        },


    batchUpdate: (_app: FastifyInstance) =>
        async (
            req: FastifyRequest<{ Body: UarDivisionBatchUpdateDTO }>,
            reply: FastifyReply
        ) => {
            const { divisionId, noreg } = getAuthInfo(req);
            const result = await svc.batchUpdate(
                req.body,
                noreg,
                Number(divisionId)
            );
            return reply.send({
                message: `Batch update successful.`,
                data: result,
            });
        },
};