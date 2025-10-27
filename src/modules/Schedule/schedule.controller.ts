import type { FastifyRequest, FastifyReply, FastifyInstance } from "fastify";
import { scheduleService } from "./schedule.service";
import { initialSchedules } from "./schedule.repository";

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
      const schedule = await scheduleService.createSchedule(
        app,
        body.APPLICATION_ID,
        body.SCHEDULE_SYNC_START_DT,
        body.SCHEDULE_SYNC_END_DT,
        body.SCHEDULE_UAR_DT,
        body.CREATED_BY,
        body.CREATED_DT
      );
      return reply.code(201).send({ requestId, data: schedule });
    },
  editSchedule:
    (app: FastifyInstance) =>
    async (req: FastifyRequest, reply: FastifyReply) => {
      const requestId = (req.headers["x-request-id"] as string) || req.id;
      const ID = (req.params as any).id as string;
      const body = req.body as CreateScheduleBody;
      const schedule = await scheduleService.editSchedule(
        app,
        ID,
        body.APPLICATION_ID,
        body.SCHEDULE_SYNC_START_DT,
        body.SCHEDULE_SYNC_END_DT,
        body.SCHEDULE_UAR_DT,
        body.SCHEDULE_STATUS,
        body.CREATED_BY,
        body.CREATED_DT
      );
      return reply.code(200).send({ requestId, data: schedule });
    },

  updateStatusSchedule:
    (app: FastifyInstance) =>
    async (req: FastifyRequest, reply: FastifyReply) => {
      const requestId = (req.headers["x-request-id"] as string) || req.id;
      const ID = (req.params as any).id as string;
      const body = req.body as CreateScheduleBody;
      const schedule = await scheduleService.updateStatusSchedule(
        app,
        ID,
        body.SCHEDULE_STATUS
      );
      return reply.code(200).send({ requestId, data: schedule });
    },
};
