
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
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

export const uarExcelController = {
    exportExcel: (_app: FastifyInstance) =>
        async (req: FastifyRequest<{ Querystring: ExportQuery }>, reply: FastifyReply) => {
            const { divisionId } = getAuthInfo(req);
            const { uar_id } = req.query;

            const { buffer, filename } = await buildUarExcelTemplate(uar_id, divisionId);

            reply
                .header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
                .header("Content-Disposition", `attachment; filename="${filename}"`)
                .send(buffer);
        },
};