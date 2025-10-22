import type { FastifyInstance } from "fastify";
import { uarController } from "../../modules/UarPic/uarpic.controller";
import { uarPicSchema } from "../../modules/UarPic/uarpic.schemas";
import { errorHandler } from "../../core/errors/errorHandler";

type CreateUarBody = {
  PIC_NAME: string;
  DIVISION_ID: number;
  MAIL: string;
};

export async function uarRoutes(app: FastifyInstance) {
  app.get("/uarpic", async (req, reply) => {
    return uarController.getUar(app)(req, reply);
  });

  app.post<{ Body: CreateUarBody }>(
    "/uarpic",
    { errorHandler },
    async (req, reply) => {
      return uarController.createUar(app)(req, reply);
    }
  );

  app.put("/uarpic", { errorHandler }, async (req, reply) => {
    return uarController.editUar(app)(req, reply);
  });
}
