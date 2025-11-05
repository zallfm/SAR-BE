import { errorHandler } from "../../../core/errors/errorHandler";
import { uarController } from "../../../modules/master_data/uarpic/uarpic.controller";
import { uarPicSchema } from "../../../modules/master_data/uarpic/uarpic.schemas";
export async function uarRoutes(app) {
    app.get("/", async (req, reply) => {
        return uarController.getUar(app)(req, reply);
    });
    app.post("/", { errorHandler, schema: uarPicSchema }, async (req, reply) => {
        return uarController.createUar(app)(req, reply);
    });
    app.put("/:id", { errorHandler, schema: uarPicSchema }, async (req, reply) => {
        return uarController.editUar(app)(req, reply);
    });
    app.delete("/:id", { errorHandler }, async (req, reply) => {
        return uarController.deleteUar(app)(req, reply);
    });
}
