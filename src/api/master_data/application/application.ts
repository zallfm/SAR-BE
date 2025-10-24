import { FastifyInstance } from "fastify";
import { applicationController } from "../../../modules/master_data/application/application.controller";
import { ApplicationSchema } from "../../../modules/master_data/application/application.schema";

export async function applicationRoutes(app: FastifyInstance) {
  // app.get(
  //   "",
  //   { schema: ApplicationSchema },
  //   applicationController.listApplication(app)
  // );
}