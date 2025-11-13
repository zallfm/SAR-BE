import type { FastifyRequest, FastifyReply, FastifyInstance } from "fastify";
import { scheduleService } from "./schedule.service";

type CreateScheduleBody = {
  APPLICATION_ID: string;
  SCHEDULE_SYNC_START_DT: string;
  SCHEDULE_SYNC_END_DT: string;
  SCHEDULE_UAR_DT: string;
  SCHEDULE_STATUS: string;
  CREATED_BY: string;
  CREATED_DT: string;
  CHANGED_BY: string | null;
  CHANGED_DT: string | null;
};

export const scheduleController = {
  getSchedules:
    (app: FastifyInstance) =>
      async (req: FastifyRequest, reply: FastifyReply) => {
        const requestId = (req.headers["x-request-id"] as string) || req.id;
        const schedules = await scheduleService.getSchedules(app, req.query);
        return reply.code(200).send({
          requestId,
          ...schedules,
        });
      },
  createSchedule:
    (app: FastifyInstance) =>
      async (req: FastifyRequest, reply: FastifyReply) => {
        const requestId = (req.headers["x-request-id"] as string) || req.id;
        const body = req.body as CreateScheduleBody;
        const username = req.auth?.username ?? (req as any).user?.sub ?? "system";
        body.CREATED_BY = username
        const schedule = await scheduleService.createSchedule(app, body);
        return reply.code(201).send({ requestId, data: schedule });
      },
  editSchedule:
    (app: FastifyInstance) =>
      async (req: FastifyRequest, reply: FastifyReply) => {
        const requestId = (req.headers["x-request-id"] as string) || req.id;
        const key = (req.params as any);
        const body = req.body as CreateScheduleBody;
        const username = req.auth?.username ?? (req as any).user?.sub ?? "system";
        body.CHANGED_BY = username
        const schedule = await scheduleService.editSchedule(app, key, body);
        return reply.code(200).send({ requestId, data: schedule });
      },

  updateStatusSchedule:
    (app: FastifyInstance) =>
      async (req: FastifyRequest, reply: FastifyReply) => {
        const requestId = (req.headers["x-request-id"] as string) || req.id;
        const compoundId = req.params as any;
        const body = req.body as CreateScheduleBody;
        const schedule = await scheduleService.updateStatusSchedule(
          app,
          compoundId,
          body.SCHEDULE_STATUS

        );
        return reply.code(200).send({ requestId, data: schedule });
      },
};
