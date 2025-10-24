import type { FastifyRequest, FastifyReply, FastifyInstance } from "fastify";
import { uarPicService } from "./uarpic.service";
import { initialUarPic } from "./uarpic.repository";

type CreateUarBody = {
  PIC_NAME: string;
  DIVISION_ID: number;
  MAIL: string;
};

export const uarController = {
  getUar:
    (app: FastifyInstance) =>
    async (req: FastifyRequest, reply: FastifyReply) => {
      const requestId = (req.headers["x-request-id"] as string) || req.id;

      const uarData = await uarPicService.getUarPics(app);      

      return reply.status(200).send({
        requestId,
        data: uarData,
      });
    },

  createUar:
    (app: FastifyInstance) =>
    async (req: FastifyRequest, reply: FastifyReply) => {
      const requestId = (req.headers["x-request-id"] as string) || req.id;
      const { PIC_NAME, DIVISION_ID, MAIL } = req.body as CreateUarBody;

      const uarPicData = await uarPicService.createUarPic(
        app,
        PIC_NAME,
        DIVISION_ID,
        MAIL
      );

      return reply.status(201).send({
        requestId,
        data: uarPicData,
      });
    },
  editUar:
    (app: FastifyInstance) =>
    async (
      req: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const requestId = (req.headers["x-request-id"] as string) || req.id;
      const ID = req.params.id;
      const { PIC_NAME, DIVISION_ID, MAIL } = req.body as any;
      const uarPicData = await uarPicService.editUarPic(
        app,
        ID,
        PIC_NAME,
        DIVISION_ID,
        MAIL
      );
      return reply.status(200).send({
        requestId,
        data: uarPicData,
      });
    },

  deleteUar:
    (app: FastifyInstance) =>
    async (
      req: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const requestId = (req.headers["x-request-id"] as string) || req.id;
      const ID = req.params.id;
      await uarPicService.deleteUarPic(app, ID);
      return reply.status(200).send({
        requestId,
        message: `UAR PIC with ID ${ID} has been deleted.`,
      });
    },
};
