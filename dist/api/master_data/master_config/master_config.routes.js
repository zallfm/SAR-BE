import { errorHandler } from "../../../core/errors/errorHandler";
import { systemController } from "../../../modules/master_data/master_config/master_config.controller";
import { systemSchema } from "../../../modules/master_data/master_config/master_config.schema";
export async function systemRoutes(app) {
    app.get("/", async (req, reply) => {
        return systemController.getSystem(app)(req, reply);
    });
    app.post("/", { schema: systemSchema, errorHandler }, async (req, reply) => {
        return systemController.createSystem(app)(req, reply);
    });
    app.put("/:id", { errorHandler }, async (req, reply) => {
        return systemController.updateSystem(app)(req, reply);
    });
    app.delete("/:SYSTEM_TYPE/:SYSTEM_CD/:VALID_FROM_DT", { errorHandler }, async (req, reply) => {
        return systemController.deleteSystem(app)(req, reply);
    });
}
