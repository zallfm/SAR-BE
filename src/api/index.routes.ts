import type { FastifyInstance } from "fastify";

import { scheduleRoutes } from "./schedule/schedule.routes";
import { uarRoutes } from "./master_data/uarpic/uarpic.routes";
import { authRoutes } from "./auth/auth.routes";
import { logMonitoringRoutes } from "./logging_monitoring/log_monitoring.routes";
import { applicationRoutes } from "./master_data/application/application";
import { systemRoutes } from "./master_data/master_config/master_config.routes";
import { roleGate } from "../plugins/rbac";

export async function indexRoutes(app: FastifyInstance) {
  // app.register(scheduleRoutes, { prefix: "/schedules" });
  // app.register(uarRoutes, { prefix: "/uarpic" });
  // app.register(logMonitoringRoutes, { prefix: "/log_monitoring" });
  // app.register(applicationRoutes, { prefix: "/application" });

  app.register(async (r) => {
    r.addHook('preHandler', roleGate(['ADMIN', 'SO']));
    await scheduleRoutes(r);
  }, { prefix: "/schedules" });

  app.register(async (r) => {
    r.addHook('preHandler', roleGate(['ADMIN', 'DPH']));
    await uarRoutes(r);
  }, { prefix: "/uarpic" });

  // app.register(async (r) => {
  //   r.addHook('preHandler', roleGate(['ADMIN', 'DPH', 'SO']));
  //   await logMonitoringRoutes(r);
  // }, { prefix: "/log_monitoring" });
  app.register(logMonitoringRoutes, { prefix: "/log_monitoring" });
  app.register(applicationRoutes, { prefix: "/application" });
  app.register(systemRoutes, { prefix: "/master_config" });

  app.register(async (r) => {
    r.addHook('preHandler', roleGate(['ADMIN', 'SO', 'DPH']));
    await applicationRoutes(r);
  }, { prefix: "/application" });
}
