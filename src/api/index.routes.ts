import type { FastifyInstance } from "fastify";

import { scheduleRoutes } from "./schedule/schedule.routes";
import { uarRoutes } from "./uarpic/uarpic.routes";
import { authRoutes } from "./auth/auth.routes";
import { logMonitoringRoutes } from "./logging_monitoring/log_monitoring.routes";

export async function indexRoutes(app: FastifyInstance) {
  app.register(scheduleRoutes, { prefix: "/schedules" });
  app.register(uarRoutes, { prefix: "/uarpic" });
  app.register(logMonitoringRoutes, { prefix: "/log_monitoring" });
}
