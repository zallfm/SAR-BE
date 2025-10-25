import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { applicationService as svc } from "./application.service.js";
import { ApplicationCreateDTO, ApplicationUpdateDTO } from "../../../types/application.js";

export const applicationController = {
  list: (_app: FastifyInstance) =>
    async (req: FastifyRequest<{
      Querystring: {
        page?: number;
        limit?: number;
        search?: string;
        sortField?: "APPLICATION_ID" | "APPLICATION_NAME" | "CREATED_DT" | "CHANGED_DT";
        sortOrder?: "asc" | "desc";
      };
    }>, reply: FastifyReply) => {
      const {
        page = 1,
        limit = 10,
        search,
        sortField = "CREATED_DT",
        sortOrder = "desc",
      } = req.query ?? {};

      const result = await svc.list({
        page: Number(page),
        limit: Number(limit),
        search,
        sortField,
        sortOrder,
      });
      console.log("result", result)

      return reply.send({
        data: result.data,
        page: Number(page),
        limit: Number(limit),
        total: result.total,
      });
    },

  getById: (_app: FastifyInstance) =>
    async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const row = await svc.getById(req.params.id);
      return reply.send({ data: row });
    },

  create: (_app: FastifyInstance) =>
    async (req: FastifyRequest<{ Body: ApplicationCreateDTO }>, reply: FastifyReply) => {
      const created = await svc.create(req.body);
      return reply.code(201).send({ message: "Application created", data: created });
    },

  update: (_app: FastifyInstance) =>
    async (req: FastifyRequest<{ Params: { id: string }; Body: ApplicationUpdateDTO }>, reply: FastifyReply) => {
      const updated = await svc.update(req.params.id, req.body);
      return reply.send({ message: "Application updated", data: updated });
    },

  // masters
  listUsers: () => async (_req: FastifyRequest, reply: FastifyReply) => {
    const users = await svc.listUsers();
    return reply.send({ data: users });
  },

  listSecurityCenters: () => async (_req: FastifyRequest, reply: FastifyReply) => {
    const centers = await svc.listSecurityCenters();
    return reply.send({ data: centers });
  },
};
