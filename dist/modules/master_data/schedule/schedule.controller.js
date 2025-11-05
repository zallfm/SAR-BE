import { scheduleService } from "./schedule.service";
export const scheduleController = {
    getSchedules: (app) => async (req, reply) => {
        const requestId = req.headers["x-request-id"] || req.id;
        const schedules = await scheduleService.getSchedules(app, req.query);
        return reply.code(200).send({
            requestId,
            ...schedules,
        });
    },
    createSchedule: (app) => async (req, reply) => {
        const requestId = req.headers["x-request-id"] || req.id;
        const body = req.body;
        const username = req.auth?.username ?? req.user?.sub ?? "system";
        body.CREATED_BY = username;
        const schedule = await scheduleService.createSchedule(app, body);
        return reply.code(201).send({ requestId, data: schedule });
    },
    editSchedule: (app) => async (req, reply) => {
        const requestId = req.headers["x-request-id"] || req.id;
        const key = req.params;
        const body = req.body;
        const username = req.auth?.username ?? req.user?.sub ?? "system";
        body.CHANGED_BY = username;
        const schedule = await scheduleService.editSchedule(app, key, body);
        return reply.code(200).send({ requestId, data: schedule });
    },
    updateStatusSchedule: (app) => async (req, reply) => {
        const requestId = req.headers["x-request-id"] || req.id;
        const compoundId = req.params;
        const body = req.body;
        const schedule = await scheduleService.updateStatusSchedule(app, compoundId, body.SCHEDULE_STATUS);
        return reply.code(200).send({ requestId, data: schedule });
    },
};
