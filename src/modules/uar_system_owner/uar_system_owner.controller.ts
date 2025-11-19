import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { uarSystemOwnerService as svc } from "./uar_system_owner.service";
import type { UarSystemOwnerAddCommentDTO, UarSystemOwnerBatchUpdateDTO } from "../../types/uar_system_owner";

function getAuthInfo(req: FastifyRequest) {
    const auth = req.auth as { noreg: string, divisionId: number, username: string | undefined };
    if (!auth?.noreg) {
        throw new Error(
            "User authentication details (noreg) not found. Check auth plugin."
        );
    }
    return auth;
}

export const uarSystemOwnerController = {

    list: (_app: FastifyInstance) =>
        async (
            req: FastifyRequest<{
                Querystring: {
                    page?: number;
                    limit?: number;
                    period?: string;
                    uarId?: string;
                    applicationId?: string;
                    status?: 'InProgress' | 'Finished';
                    createdDate?: string;
                    completedDate?: string;
                    reviewStatus?: 'pending';
                };
            }>,
            reply: FastifyReply
        ) => {
            const { noreg, divisionId } = getAuthInfo(req);
            const { page = 1, limit = 10, period, uarId, applicationId, completedDate, createdDate, reviewStatus, status } = req.query ?? {};

            const result = await svc.list(
                {
                    page: Number(page),
                    limit: Number(limit),
                    period,
                    uarId,
                    applicationId,
                    createdDate,
                    completedDate,
                    reviewStatus,
                    status
                },
                divisionId,
                noreg,

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
            req: FastifyRequest<{ Params: { uarId: string, applicationId: string } }>,
            reply: FastifyReply
        ) => {
            const { noreg } = getAuthInfo(req);
            const { uarId, applicationId } = req.params;
            const data = await svc.getDetails(uarId, applicationId, noreg);
            return reply.send({ data });
        },

    getUarSo: (_app: FastifyInstance) =>
        async (
            req: FastifyRequest<{ Params: { uarId: string; applicationId: string } }>,
            reply: FastifyReply
        ) => {
            const { noreg } = getAuthInfo(req);
            const { uarId, applicationId } = req.params;

            // service SEKARANG harus return: { header, systemOwnerUsers, divisionUsers }
            const { header, systemOwnerUsers, divisionUsers } =
                await svc.getUarSo(uarId, applicationId, noreg);
            // console.log("controller", header)
            // console.log("systemOwnerUsers", systemOwnerUsers)

            return reply.status(200).send({
                success: true,
                code: 'OK',
                message: 'OK',
                data: { header, systemOwnerUsers, divisionUsers },
            });
        },

    batchUpdate: (_app: FastifyInstance) =>
        async (
            req: FastifyRequest<{ Body: UarSystemOwnerBatchUpdateDTO }>,
            reply: FastifyReply
        ) => {
            const { noreg, username } = getAuthInfo(req);
            const result = await svc.batchUpdate(
                req.body,
                noreg,
                username
            );
            return reply.send({
                message: `Batch update successful.`,
                data: result,
            });
        },

    addComment: (_app: FastifyInstance) =>
        async (
            req: FastifyRequest<{ Body: UarSystemOwnerAddCommentDTO }>,
            reply: FastifyReply
        ) => {
            const { noreg } = getAuthInfo(req);
            const result = await svc.addComment(
                req.body,
                noreg
            );
            return reply.send({
                message: `Comments added successfully.`,
                data: result,
            });
        },
};