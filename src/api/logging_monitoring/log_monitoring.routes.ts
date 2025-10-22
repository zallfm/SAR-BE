import { FastifyInstance } from "fastify";
import { getLogSchema, listDetailsSchema, listLogsSchema } from "../../modules/log_monitoring/log_monitoring.schema";
import { logMonitoringController } from "../../modules/log_monitoring/log_monitoring.controller";

export async function logMonitoringRoutes(app: FastifyInstance) {
    app.get('/log_monitoring', { schema: listLogsSchema }, logMonitoringController.listLogs(app));
    app.get('/log_monitoring/:processId', { schema: getLogSchema }, logMonitoringController.getLog(app));
    app.get('/log_monitoring/:processId/details', { schema: listDetailsSchema }, logMonitoringController.listDetails(app));
}