import { FastifyInstance } from "fastify";
import {
  exportExcelSchema,
  getLogSchema,
  listDetailsSchema,
  listLogsSchema,
} from "../../modules/log_monitoring/log_monitoring.schema";
import { logMonitoringController } from "../../modules/log_monitoring/log_monitoring.controller";
import { ListLogsQuery } from "../../types/log_monitoring";

type ProcessParams = { processId: string };

export async function logMonitoringRoutes(app: FastifyInstance) {
  app.get<{ Querystring: ListLogsQuery }>(
    "",
    {
      schema: listLogsSchema,
      preHandler: app.requirePermission("LOG_MONITORING_VIEW"),
    },
    logMonitoringController.listLogs(app)
  );
  app.get<{ Params: ProcessParams }>(
    "/:processId",
    {
      schema: getLogSchema,
      preHandler: app.requirePermission("LOG_MONITORING_VIEW_DETAIL"),
    },
    logMonitoringController.getLog(app)
  );
  app.get(
    "/:processId/details",
    { schema: listDetailsSchema },
    logMonitoringController.listDetails(app)
  );
  app.get(
    "/export",
    { schema: exportExcelSchema },
    logMonitoringController.exportExcel(app)
  );
  app.get(
    "/:processId/details/export",
    logMonitoringController.exportDetailsExcel(app)
  );
  app.post("", logMonitoringController.createLog(app));
  // app.get('/log_monitoring/export?status=Error&module=Application&order=desc&sortBy=START_DATE, {schema: exportExcelSchema}, logMonitoringController.exportExcel(app))
}
