import { FastifyInstance } from "fastify";
import { uarSystemOwnerController } from "../../modules/uar_system_owner/uar_system_owner.controller";
import {
    listUarSchema,
    getUarDetailsSchema,
    batchUpdateSchema,
} from "../../modules/uar_system_owner/uar_system_owner.schema";

export async function uarSystemOwnerRoutes(app: FastifyInstance) {
    app.get(
        "",
        { schema: listUarSchema },
        uarSystemOwnerController.list(app)
    );

    app.get(
        "/:uarId/applications/:applicationId",
        { schema: getUarDetailsSchema },
        uarSystemOwnerController.getDetails(app)
    );

    app.post(
        "/batch-update",
        { schema: batchUpdateSchema },
        uarSystemOwnerController.batchUpdate(app)
    );
}