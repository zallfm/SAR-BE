import { FastifyInstance } from "fastify";
import { uarGenerateController } from "../../../modules/uar_generate/uar_generate.controller";

export async function uarGenerateRoutes(app: FastifyInstance) {
    app.post(
        "",
        uarGenerateController.generate(app)
    )
}