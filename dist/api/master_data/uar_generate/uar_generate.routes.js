import { uarGenerateController } from "../../../modules/uar_generate/uar_generate.controller";
export async function uarGenerateRoutes(app) {
    app.post("", uarGenerateController.generate(app));
}
