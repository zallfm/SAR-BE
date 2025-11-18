// modules/excel/uar.controller.ts
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { buildUarExcelTemplate } from "./uar.excel";

type ExportQuery = {
  uar_id: string;
  type?: "div_user" | "so_user";
  applicationId?: string;
};

function getAuthInfo(req: FastifyRequest) {
  const auth = req.auth as { divisionId: number; noreg: string };
  if (!auth?.divisionId || !auth?.noreg) {
    throw new Error("User authentication details (divisionId, noreg) not found. Check auth plugin.");
  }
  return auth;
}

export const uarExcelController = {
  exportExcel:
    (_app: FastifyInstance) =>
    async (req: FastifyRequest<{ Querystring: ExportQuery }>, reply: FastifyReply) => {
      const { divisionId, noreg } = getAuthInfo(req);
      const { uar_id, type, applicationId } = req.query;

      const isSo = type === "so_user";
      if (isSo && !applicationId) {
        return reply.code(400).send({
          success: false,
          message: "applicationId is required when type=so_user",
        });
      }

      const { buffer, filename } = await buildUarExcelTemplate(uar_id, divisionId, {
        type: isSo ? "so_user" : "div_user",
        applicationId: isSo ? applicationId : undefined,
        userNoreg: isSo ? noreg : undefined,
      });

      reply
        .header(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
        .header("Content-Disposition", `attachment; filename="${filename}"`)
        .send(Buffer.from(buffer as any));
    },
};
