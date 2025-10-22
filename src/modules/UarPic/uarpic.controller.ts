import type { FastifyRequest, FastifyReply, FastifyInstance } from "fastify";
import { uarPicService } from "./uarpic.service";
import { initialUarPic } from "./uarpic.schemas";

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

      const uarData = initialUarPic;

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
    async (req: FastifyRequest, reply: FastifyReply) => {
      const requestId = (req.headers["x-request-id"] as string) || req.id;
      const { ID, PIC_NAME, DIVISION_ID, MAIL } = req.body as any;
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
};
