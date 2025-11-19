// modules/excel/uar.controller.ts
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { buildUarExcelTemplate } from "./uar.excel";
import { env } from "../../config/env";

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

        const isSo = type === env.UAR_TYPE_SO_USER;
        if (isSo && !applicationId) {
          return reply.code(400).send({
            success: false,
            message: "applicationId is required when type=so_user",
          });
        }
        // console.log("uar_id", uar_id)
        const { buffer, filename } = await buildUarExcelTemplate(uar_id, divisionId, {
          type: isSo ? env.UAR_TYPE_SO_USER : env.UAR_TYPE_DIV_USER,
          applicationId: isSo ? applicationId : undefined,
          userNoreg: isSo ? noreg : undefined,
        });
        // console.log("buffer", buffer)

        reply
          .header(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          )
          .header("Content-Disposition", `attachment; filename="${filename}"`)
          .send(Buffer.from(buffer as any));
      },
};
