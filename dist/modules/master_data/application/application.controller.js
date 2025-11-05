import { applicationService as svc } from "./application.service.js";
export const applicationController = {
    activeList: (_app) => async (req, reply) => {
        const result = await svc.activeList();
        return reply.send({
            data: result.data,
        });
    },
    list: (_app) => async (req, reply) => {
        const { page = 1, limit = 10, search, sortField = "CREATED_DT", sortOrder = "asc", } = req.query ?? {};
        const result = await svc.list({
            page: Number(page),
            limit: Number(limit),
            search,
            sortField,
            sortOrder,
        });
        // console.log("result", result)
        return reply.send({
            data: result.data,
            page: Number(page),
            limit: Number(limit),
            total: result.total,
        });
    },
    getById: (_app) => async (req, reply) => {
        const row = await svc.getById(req.params.id);
        return reply.send({ data: row });
    },
    create: (_app) => async (req, reply) => {
        const username = req.auth?.username ?? req.user?.sub ?? "system";
        const created = await svc.create(req.body, username);
        return reply.code(201).send({ message: "Application created", data: created });
    },
    update: (_app) => async (req, reply) => {
        const username = req.auth?.username ?? req.user?.sub ?? "system";
        const updated = await svc.update(req.params.id, req.body, username);
        return reply.send({ message: "Application updated", data: updated });
    },
    // masters
    listUsers: () => async (req, reply) => {
        const { q = "", limit = 10, offset = 0 } = req.query ?? {};
        const result = await svc.listUsers({ q, limit: Number(limit), offset: Number(offset) });
        return reply.send({ data: result.items, total: result.total });
    },
    listSecurityCenters: () => async (req, reply) => {
        const { q = "", limit = 10, offset = 0 } = req.query ?? {};
        const result = await svc.listSecurityCenters({
            q,
            limit: Number(limit),
            offset: Number(offset),
        });
        return reply.send({ data: result.items, total: result.total });
    },
};
