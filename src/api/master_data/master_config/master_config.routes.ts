import type { FastifyInstance } from "fastify";
import { errorHandler } from "../../../core/errors/errorHandler";
import { systemController } from "../../../modules/master_data/master_config/master_config.controller";
import { systemSchema } from "../../../modules/master_data/master_config/master_config.schema";

type CreateSystemBody = {
  SYSTEM_TYPE: string;
  SYSTEM_CD: string;
  VALID_FROM_DT: string;
  NEW_VALID_FROM_DT: string | null;
  VALID_TO_DT: string;
  VALUE_TEXT: string | null;
  VALUE_NUM: number | null;
  VALUE_TIME: string | null;
  CREATED_BY: string;
  CREATED_DT: string | null;
  CHANGED_BY: string | null;
  CHANGED_DT: string | null;
};

export async function systemRoutes(app: FastifyInstance) {
  app.get("/", async (req, reply) => {
    return systemController.getSystem(app)(req, reply);
  });

  app.post<{ Body: CreateSystemBody }>(
    "/",
    { schema: systemSchema, errorHandler },
    async (req, reply) => {
      return systemController.createSystem(app)(req, reply);
    }
  );

  app.put<{ Params: { id: string }; Body: CreateSystemBody }>(
    "/:id",
    { errorHandler },
    async (req, reply) => {
      return systemController.updateSystem(app)(req, reply);
    }
  );

  app.delete<{ Params: { id: string }; Body: CreateSystemBody }>(
    "/:SYSTEM_TYPE/:SYSTEM_CD/:VALID_FROM_DT",
    { errorHandler },
    async (req, reply) => {
      return systemController.deleteSystem(app)(req, reply);
    }
  );
}
