import { FastifyInstance } from "fastify";
import { dashboardController } from "../../modules/dashboard/dashboard.controller";
import {
    getDashboardStatsSchema,
    getPeriodOptionsSchema,
    getApplicationOptionsSchema,
    getDepartmentOptionsSchema,
    getDivisionOptionsSchema,
    getDphDashboardStatsSchema,
    getSoDashboardStatsSchema,
    getAdminDashboardStatsSchema
} from "../../modules/dashboard/dashboard.schema";

export async function dashboardRoutes(app: FastifyInstance) {
    app.get("/progress", { schema: getDashboardStatsSchema }, dashboardController.getDashboardStats(app));

    app.get(
        "/admin",
        { schema: getAdminDashboardStatsSchema },
        dashboardController.getAdminDashboardStats(app)
    );

    app.get(
        "/so",
        { schema: getSoDashboardStatsSchema },
        dashboardController.getSoDashboardStats(app)
    );
    app.get(
        "/dph",
        { schema: getDphDashboardStatsSchema },
        dashboardController.getDphDashboardStats(app)
    );

    app.get("/filter-options/periods", { schema: getPeriodOptionsSchema }, dashboardController.getPeriodOptions(app));
    app.get("/filter-options/applications", { schema: getApplicationOptionsSchema }, dashboardController.getApplicationOptions(app));
    app.get("/filter-options/departments", { schema: getDepartmentOptionsSchema }, dashboardController.getDepartmentOptions(app));
    app.get("/filter-options/divisions", { schema: getDivisionOptionsSchema }, dashboardController.getDivisionOptions(app));
}