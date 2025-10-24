import { FastifyInstance } from "fastify";
import {
  exportExcelSchema,
  getLogSchema,
  listDetailsSchema,
  listLogsSchema,
} from "../../modules/log_monitoring/log_monitoring.schema";
import { logMonitoringController } from "../../modules/log_monitoring/log_monitoring.controller";

export async function logMonitoringRoutes(app: FastifyInstance) {
  app.get(
    "",
    { schema: listLogsSchema },
    logMonitoringController.listLogs(app)
  );
  app.get(
    "/:processId",
    { schema: getLogSchema },
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
