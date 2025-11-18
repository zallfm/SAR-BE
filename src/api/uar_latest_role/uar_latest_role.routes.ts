import type { FastifyInstance } from "fastify";
import { uarLatestRoleController } from "../../modules/uar_latest_role/uar_latest_role.controller";
import {
  listUarLatestRoleSchema,
  getUarLatestRoleDetailSchema,
  exportUarLatestRoleExcelSchema,
} from "../../modules/uar_latest_role/uar_latest_role.schema";

export async function uarLatestRoleRoutes(app: FastifyInstance) {
  app.get(
    "",
    {
      schema: listUarLatestRoleSchema,
      preHandler: [app.authenticate],
    },
    uarLatestRoleController.list(app)
  );

  app.get(
    "/:applicationId/:username/:roleId",
    {
      schema: getUarLatestRoleDetailSchema,
      preHandler: [app.authenticate],
    },
    uarLatestRoleController.getDetail(app)
  );

  app.get(
    "/export",
    {
      schema: exportUarLatestRoleExcelSchema,
      preHandler: [app.authenticate],
    },
    uarLatestRoleController.exportExcel(app)
  );
}

