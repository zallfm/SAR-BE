import { uarGenerateService } from "./uar_generate.service";
export const uarGenerateController = {
    generate: (app) => async (req, reply) => {
        try {
            console.log("req.body", req.body);
            const { period, application_id } = req.body || {};
            // @ts-ignore — ambil nama user dari JWT kalau ada
            // const createdBy = (req.user?.name as string) || "generator";
            const out = await uarGenerateService.generate({ period, application_id });
            // const out = await uarGenerateService.generate({ period, uarId, createdBy });
            return reply.code(200).send(out);
        }
        catch (err) {
            app.log.error({ err }, "Generate UAR gagal");
            return reply.code(500).send({
                success: false,
                message: err?.message ?? "Generate UAR gagal",
            });
        }
    },
};
