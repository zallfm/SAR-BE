import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { logMonitoringService } from "./log_monitoring.service";

export const logMonitoringController = {
    listLogs: (app: FastifyInstance) => async (
        req: FastifyRequest<{
            Querystring: {
                page?: number; limit?: number; status?: any; module?: string; q: string;
                startDate?: string; endDate?: string; sortBy: any; order?: any;
            };
        }>,
        reply: FastifyReply
    ) => {
        const result = await logMonitoringService.listLogs(req.query);
        return reply.status(200).send(result);
    },

    getLog: (app: FastifyInstance) => async (
        req: FastifyRequest<{ Params: { processId: string } }>,
        reply: FastifyReply
    ) => {
        const data = await logMonitoringService.getLog(req.params.processId)
        if (!data) return reply.status(404).send({ message: 'Log not found' });
        return reply.status(200).send({ data })
    },

    listDetails: (app: FastifyInstance) => async (
        req: FastifyRequest<{Params: {processId :string}; Querystring: {page?:number; limit?:number}}>,
        reply:FastifyReply
    ) => {
        const result = await logMonitoringService.listDetails(
            req.params.processId,
            req.query.page,
            req.query.limit
        );
        return reply.status(200).send(result)
    }
}