import { uarPicService } from "./uarpic.service";
export const uarController = {
    getUar: (app) => async (req, reply) => {
        const requestId = req.headers["x-request-id"] || req.id;
        const uarData = await uarPicService.getUarPics(app, req.query);
        return reply.status(200).send({
            requestId,
            ...uarData,
        });
    },
    createUar: (app) => async (req, reply) => {
        const requestId = req.headers["x-request-id"] || req.id;
        const { PIC_NAME, DIVISION_ID, MAIL } = req.body;
        const username = req.auth?.username ?? req.user?.sub ?? "system";
        const uarPicData = await uarPicService.createUarPic(app, PIC_NAME, DIVISION_ID, MAIL, username);
        return reply.status(201).send({
            requestId,
            data: uarPicData,
        });
    },
    editUar: (app) => async (req, reply) => {
        const requestId = req.headers["x-request-id"] || req.id;
        const ID = req.params.id;
        const { PIC_NAME, DIVISION_ID, MAIL } = req.body;
        const username = req.auth?.username ?? req.user?.sub ?? "system";
        const uarPicData = await uarPicService.editUarPic(app, ID, PIC_NAME, DIVISION_ID, MAIL, username);
        return reply.status(200).send({
            requestId,
            data: uarPicData,
        });
    },
    deleteUar: (app) => async (req, reply) => {
        const requestId = req.headers["x-request-id"] || req.id;
        const ID = req.params.id;
        await uarPicService.deleteUarPic(app, ID);
        return reply.status(200).send({
            requestId,
            message: `UAR PIC with ID ${ID} has been deleted.`,
        });
    },
};
