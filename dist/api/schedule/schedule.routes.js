import { errorHandler } from "../../core/errors/errorHandler";
import { scheduleController } from "../../modules/master_data/schedule/schedule.controller";
import { scheduleSchema } from "../../modules/master_data/schedule/schedule.schemas";
export const scheduleRoutes = async (app) => {
    app.get("/", { errorHandler }, async (req, reply) => {
        return scheduleController.getSchedules(app)(req, reply);
    });
    app.post("/", { schema: scheduleSchema, errorHandler }, async (req, reply) => {
        return scheduleController.createSchedule(app)(req, reply);
    });
    app.put("/:APPLICATION_ID/:SCHEDULE_SYNC_START_DT/:SCHEDULE_UAR_DT", { schema: scheduleSchema, errorHandler }, async (req, reply) => {
        return scheduleController.editSchedule(app)(req, reply);
    });
    app.put("/:APPLICATION_ID/:SCHEDULE_SYNC_START_DT/:SCHEDULE_UAR_DT/status", { errorHandler }, async (req, reply) => {
        return scheduleController.updateStatusSchedule(app)(req, reply);
    });
};
