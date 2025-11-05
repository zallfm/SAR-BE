import { uarDivisionController } from "../../modules/uar_division/uar_division.controller";
import { listUarSchema, getUarDetailsSchema, batchUpdateSchema, } from "../../modules/uar_division/uar_division.schema";
export async function uarDivisionRoutes(app) {
    app.get("", { schema: listUarSchema }, uarDivisionController.list(app));
    app.get("/:id", { schema: getUarDetailsSchema }, uarDivisionController.getDetails(app));
    app.post("/batch-update", { schema: batchUpdateSchema }, uarDivisionController.batchUpdate(app));
}
