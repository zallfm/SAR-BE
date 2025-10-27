import type { FastifyInstance } from "fastify";
import { errorHandler } from "../../../core/errors/errorHandler";
import { uarController } from "../../../modules/UarPic/uarpic.controller";
import { uarPicSchema } from "../../../modules/UarPic/uarpic.schemas";

type CreateUarBody = {
  PIC_NAME: string;
  DIVISION_ID: number;
  MAIL: string;
};

export async function uarRoutes(app: FastifyInstance) {
  app.get("/", async (req, reply) => {
    console.log("req.query", req.query);

    return uarController.getUar(app)(req, reply);
  });

  app.post<{ Body: CreateUarBody }>(
    "/",
    { errorHandler, schema: uarPicSchema },
    async (req, reply) => {
      return uarController.createUar(app)(req, reply);
    }
  );

  app.put<{ Params: { id: string }; Body: CreateUarBody }>(
    "/:id",
    { errorHandler, schema: uarPicSchema },
    async (req, reply) => {
      return uarController.editUar(app)(req, reply);
    }
  );

  app.delete<{ Params: { id: string }; Body: CreateUarBody }>(
    "/:id",
    { errorHandler },
    async (req, reply) => {
      return uarController.deleteUar(app)(req, reply);
    }
  );
}
