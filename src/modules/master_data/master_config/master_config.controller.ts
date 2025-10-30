import type { FastifyRequest, FastifyReply, FastifyInstance } from "fastify";
import { systemService } from "./master_config.service";

export const systemController = {
  getSystem:
    (app: FastifyInstance) =>
    async (req: FastifyRequest, reply: FastifyReply) => {
      const requestId = (req.headers["x-request-id"] as string) || req.id;
      const schedules = await systemService.getSystem(app, req.query);
      return reply.code(200).send({
        requestId,
        ...schedules,
      });
    },
  createSystem:
    (app: FastifyInstance) =>
    async (req: FastifyRequest, reply: FastifyReply) => {
      const requestId = (req.headers["x-request-id"] as string) || req.id;
      const body = req.body as any;
      const schedule = await systemService.createSystem(app, body);
      return reply.code(201).send({ requestId, data: schedule });
    },

  updateSystem:
    (app: FastifyInstance) =>
    async (req: FastifyRequest, reply: FastifyReply) => {
      const requestId = (req.headers["x-request-id"] as string) || req.id;
      const body = req.body as any;
      app.log.info(`Body : ${JSON.stringify(body)}`);

      const schedule = await systemService.updateSystem(app, body);
      return reply.code(200).send({ requestId, data: schedule });
    },

  deleteSystem:
    (app: FastifyInstance) =>
    async (req: FastifyRequest, reply: FastifyReply) => {
      const requestId = (req.headers["x-request-id"] as string) || req.id;
      const compoundId = req.params as any;
      const schedule = await systemService.deleteSystem(app, compoundId);
      return reply.code(200).send({ requestId, data: schedule });
    },
};
