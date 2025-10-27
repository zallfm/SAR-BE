import { FastifyInstance } from "fastify";
import { applicationController } from "../../../modules/master_data/application/application.controller.js";
import {
  listApplicationSchema,
  createApplicationSchema,
  updateApplicationSchema,
  getByIdSchema,
} from "../../../modules/master_data/application/application.schema.js";

export async function applicationRoutes(app: FastifyInstance) {
  // LIST: GET /application?page=&limit=&search=&sortField=&sortOrder=
  app.get(
    "",
    { schema: listApplicationSchema },
    applicationController.list(app)
  );

  // DETAIL: GET /application/:id
  app.get(
    "/:id",
    { schema: getByIdSchema },
    applicationController.getById(app)
  );

  // CREATE: POST /application
  app.post(
    "",
    { schema: createApplicationSchema },
    applicationController.create(app)
  );

  // UPDATE: PUT /application/:id
  app.put(
    "/:id",
    { schema: updateApplicationSchema },
    applicationController.update(app)
  );

  // MASTERS (dropdown FE)
  app.get("/masters/system-users", applicationController.listUsers());
  app.get("/masters/security-centers", applicationController.listSecurityCenters());
}
