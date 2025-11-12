import type { FastifyInstance } from "fastify";

import { scheduleRoutes } from "./schedule/schedule.routes";
import { uarRoutes } from "./master_data/uarpic/uarpic.routes";
import { logMonitoringRoutes } from "./logging_monitoring/log_monitoring.routes";
import { applicationRoutes } from "./master_data/application/application";
import { systemRoutes } from "./master_data/master_config/master_config.routes";
import { uarGenerateRoutes } from "./master_data/uar_generate/uar_generate.routes";
import { uarDivisionRoutes } from "./uar_division/uar_division.routes";
import { excelUarRoutes } from "./excel/excel.route";
import { uarSystemOwnerRoutes } from "./uar_system_owner/uar_system_owner.routes";
import { dashboardRoutes } from "./dashboard/dashboard.api";

export async function indexRoutes(app: FastifyInstance) {
  app.register(async (r) => {
    r.addHook('preHandler', app.requireAnyPermission(['SCHEDULE_VIEW', 'SCHEDULE_MANAGE']));
    await scheduleRoutes(r);
  }, { prefix: "/schedules" });

  app.register(async (r) => {
    r.addHook('preHandler', app.requirePermission('UAR_PIC_VIEW'));
    await uarRoutes(r);
  }, { prefix: "/uarpic" });

  app.register(logMonitoringRoutes, { prefix: "/log_monitoring" });

  app.register(async (r) => {
    r.addHook('preHandler', app.requirePermission('MASTER_CONFIG_MANAGE'));
    await systemRoutes(r);
  }, { prefix: "/master_config" });

  app.register(uarDivisionRoutes, { prefix: "/uar_division" })
  app.register(uarSystemOwnerRoutes, { prefix: "/uar_system_owner" })

  app.register(dashboardRoutes, { prefix: "/dashboard" })
  app.register(excelUarRoutes, { prefix: "/excel_uar" })
  app.register(async (r) => {
    r.addHook('preHandler', app.requireAnyPermission(['APPLICATION_VIEW', 'APPLICATION_MANAGE']));
    await applicationRoutes(r);
  }, { prefix: "/application" });
  app.register(uarGenerateRoutes, { prefix: "/generate" })
}
