import { uarDivisionService as svc } from "./uar_division.service";
function getAuthInfo(req) {
    const auth = req.auth;
    if (!auth?.divisionId || !auth?.noreg) {
        throw new Error("User authentication details (divisionId, noreg) not found. Check auth plugin.");
    }
    return auth;
}
export const uarDivisionController = {
    list: (_app) => async (req, reply) => {
        const { divisionId } = getAuthInfo(req);
        const { page = 1, limit = 10, period, uarId } = req.query ?? {};
        const result = await svc.list({
            page: Number(page),
            limit: Number(limit),
            period,
            uarId,
        }, Number(divisionId));
        return reply.send({
            data: result.data,
            meta: {
                page: Number(page),
                limit: Number(limit),
                total: result.total,
            }
        });
    },
    getDetails: (_app) => async (req, reply) => {
        const { divisionId } = getAuthInfo(req);
        const uarId = req.params.id;
        const data = await svc.getDetails(uarId, Number(divisionId));
        return reply.send({ data });
    },
    batchUpdate: (_app) => async (req, reply) => {
        const { divisionId, noreg } = getAuthInfo(req);
        const result = await svc.batchUpdate(req.body, noreg, Number(divisionId));
        return reply.send({
            message: `Batch ${req.body.decision} successful.`,
            data: result,
        });
    },
};
