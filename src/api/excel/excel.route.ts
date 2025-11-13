
import { FastifyInstance } from "fastify";
import {
    exportUarExcelSchema,
} from "../../modules/uar_division/uar_division.schema";
import { uarExcelController } from "../../modules/excel/uar.controller";

export async function excelUarRoutes(app: FastifyInstance) {
    app.get(
        "/export",
        {schema: exportUarExcelSchema},
        uarExcelController.exportExcel(app)
    )
}