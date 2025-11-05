import { systemService } from "./master_config.service";
export const systemController = {
    getSystem: (app) => async (req, reply) => {
        const requestId = req.headers["x-request-id"] || req.id;
        const schedules = await systemService.getSystem(app, req.query);
        return reply.code(200).send({
            requestId,
            ...schedules,
        });
    },
    createSystem: (app) => async (req, reply) => {
        const requestId = req.headers["x-request-id"] || req.id;
        const body = req.body;
        const username = req.auth?.username ?? req.user?.sub ?? "system";
        body.CREATED_BY = username;
        const schedule = await systemService.createSystem(app, body);
        return reply.code(201).send({ requestId, data: schedule });
    },
    updateSystem: (app) => async (req, reply) => {
        const requestId = req.headers["x-request-id"] || req.id;
        const body = req.body;
        app.log.info(`Body : ${JSON.stringify(body)}`);
        const username = req.auth?.username ?? req.user?.sub ?? "system";
        body.CREATED_BY = username;
        const schedule = await systemService.updateSystem(app, body);
        return reply.code(200).send({ requestId, data: schedule });
    },
    deleteSystem: (app) => async (req, reply) => {
        const requestId = req.headers["x-request-id"] || req.id;
        const compoundId = req.params;
        const schedule = await systemService.deleteSystem(app, compoundId);
        return reply.code(200).send({ requestId, data: schedule });
    },
};
