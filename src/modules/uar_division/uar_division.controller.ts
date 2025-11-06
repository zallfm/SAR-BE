
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { uarDivisionService as svc } from "./uar_division.service";
import type { UarDivisionBatchUpdateDTO } from "../../types/uar_division";
import { buildUarExcelTemplate } from "./uar.excel";

type ExportQuery = {
    uar_id: string;
};

function getAuthInfo(req: FastifyRequest) {
    const auth = req.auth as { divisionId: number; noreg: string };
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
                };
            }>,
            reply: FastifyReply
        ) => {
            const { divisionId } = getAuthInfo(req);
            const { page = 1, limit = 10, period, uarId } = req.query ?? {};

            const result = await svc.list(
                {
                    page: Number(page),
                    limit: Number(limit),
                    period,
                    uarId,
                },
                Number(divisionId)
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
                message: `Batch ${req.body.decision} successful.`,
                data: result,
            });
        },

    // exportExcel: (_app: FastifyInstance) =>
    //     async (req: FastifyRequest<{ Querystring: ExportQuery }>, reply: FastifyReply) => {
    //         const { divisionId } = getAuthInfo(req);
    //         const { uar_id } = req.query;

    //         const { buffer, filename } = await buildUarExcelTemplate(uar_id, divisionId);

    //         reply
    //             .header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    //             .header("Content-Disposition", `attachment; filename="${filename}"`)
    //             .send(buffer);
    //     },
};