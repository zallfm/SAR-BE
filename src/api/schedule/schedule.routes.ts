import type { FastifyInstance } from "fastify";
import { errorHandler } from "../../core/errors/errorHandler";

import { scheduleController } from "../../modules/master_data/schedule/schedule.controller";
import { scheduleSchema } from "../../modules/master_data/schedule/schedule.schemas";

type CreateScheduleBody = {
  APPLICATION_ID: string;
  SCHEDULE_SYNC_START_DT: string;
  SCHEDULE_SYNC_END_DT: string;
  SCHEDULE_UAR_DT: string;
  SCHEDULE_STATUS: string;
};

export const scheduleRoutes = async (app: FastifyInstance) => {
  app.get("/", { errorHandler }, async (req, reply) => {
    return scheduleController.getSchedules(app)(req, reply);
  });
  app.post<{ Body: CreateScheduleBody }>(
    "/",
    { schema: scheduleSchema, errorHandler },
    async (req, reply) => {
      return scheduleController.createSchedule(app)(req, reply);
    }
  );
  app.put<{ Params: { id: string }; Body: CreateScheduleBody }>(
    "/:id",
    { schema: scheduleSchema, errorHandler },
    async (req, reply) => {
      return scheduleController.editSchedule(app)(req, reply);
    }
  );
  app.put<{ Params: { id: string }; Body: CreateScheduleBody }>(
    "/:APPLICATION_ID/:SCHEDULE_SYNC_START_DT/:SCHEDULE_UAR_DT/status",
    { errorHandler },
    async (req, reply) => {
      return scheduleController.updateStatusSchedule(app)(req, reply);
    }
  );
};
