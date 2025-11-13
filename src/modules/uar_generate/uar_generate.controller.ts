import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { uarGenerateService } from "./uar_generate.service";

type GenerateBody = {
    period: string; // '2024Q4'
    application_id: string;
    // uarId: number;  // 240401
};

export const uarGenerateController = {
    generate:
        (app: FastifyInstance) =>
            async (req: FastifyRequest<{ Body: GenerateBody }>, reply: FastifyReply) => {
                try {
                    console.log("req.body", req.body)
                    const { period, application_id } = req.body || {};
                    // @ts-ignore — ambil nama user dari JWT kalau ada
                    // const createdBy = (req.user?.name as string) || "generator";

                    const out = await uarGenerateService.generate({ period, application_id });
                    // const out = await uarGenerateService.generate({ period, uarId, createdBy });
                    return reply.code(200).send(out);
                } catch (err: any) {
                    app.log.error({ err }, "Generate UAR gagal");
                    return reply.code(500).send({
                        success: false,
                        message: err?.message ?? "Generate UAR gagal",
                    });
                }
            },
};
