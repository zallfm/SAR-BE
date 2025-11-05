import { ApplicationError } from "../../core/errors/applicationError.js";
import { ERROR_CODES } from "../../core/errors/errorCodes.js";
import { uarDivisionRepository as repo } from "./uar_division.repository";
import { currentRequestId, currentUserId, } from "../../core/requestContext";
import { publishMonitoringLog } from "../log_monitoring/log_publisher";
function mapStatus(isApproved, isRejected) {
    if (isApproved === "Y")
        return "1";
    if (isRejected === "Y")
        return "0";
    return null;
}
export const uarDivisionService = {
    async list(params, userDivisionId) {
        const { data, total, workflowStatus, completionStats } = await repo.listUars({
            ...params,
            userDivisionId,
        });
        const wfStatusMap = new Map(workflowStatus.map((w) => [w.UAR_ID, w]));
        const percentMap = new Map();
        for (const stat of completionStats) {
            const uarId = stat.UAR_ID;
            const count = stat._count._all;
            const status = stat.DIV_APPROVAL_STATUS;
            if (!percentMap.has(uarId)) {
                percentMap.set(uarId, { completed: 0, total: 0 });
            }
            const current = percentMap.get(uarId);
            current.total += count;
            if (status === '1' || status === '0') {
                current.completed += count;
            }
        }
        const headers = data.map((r) => {
            const wf = wfStatusMap.get(r.UAR_ID);
            const stats = percentMap.get(r.UAR_ID);
            let percentCompleteString = "100% (0 of 0)"; // Default if no items
            if (stats) {
                const total = stats.total;
                const completed = stats.completed;
                const percent = (total > 0) ? Math.round((completed / total) * 100) : 100;
                percentCompleteString = `${percent}% (${completed} of ${total})`;
            }
            return {
                uarId: r.UAR_ID,
                uarPeriod: r.UAR_PERIOD,
                divisionOwner: r.TB_M_DIVISION?.DIVISION_NAME ?? 'N/A',
                percentComplete: percentCompleteString,
                createdDate: wf?.CREATED_DT?.toISOString() ?? "",
                completedDate: wf?.APPROVED_DT?.toISOString() ?? null,
                status: mapStatus(wf?.IS_APPROVED, wf?.IS_REJECTED),
            };
        });
        return { data: headers, total };
    },
    async getDetails(uarId, userDivisionId) {
        const rows = await repo.getUarDetails(uarId, userDivisionId);
        if (!rows || rows.length === 0) {
            throw new ApplicationError(ERROR_CODES.APP_NOT_FOUND, "No UAR data found for this ID and your division.", { uarId, userDivisionId }, undefined, 404);
        }
        return rows;
    },
    async batchUpdate(dto, userNoreg, userDivisionId) {
        if (!dto.items || dto.items.length === 0) {
            throw new ApplicationError(ERROR_CODES.VAL_INVALID_FORMAT, "No items selected for update.", dto, undefined, 400);
        }
        const result = await repo.batchUpdate(dto, userNoreg, userDivisionId);
        if (result.workflowUpdateResult.count === 0 &&
            result.userUpdateResult.count === 0) {
            throw new ApplicationError(ERROR_CODES.APP_UPDATE_FAILED, "Update failed. No matching UAR workflow or items found.");
        }
        // Publish monitoring log
        const userId = currentUserId() ?? userNoreg;
        const reqId = currentRequestId();
        publishMonitoringLog(globalThis.app, {
            userId,
            module: "UAR_DIV",
            action: "BATCH_UPDATE",
            status: "Success",
            description: `Batch ${dto.decision} for UAR ${dto.uarId} on ${dto.items.length} items.`,
            location: "/uar-division/batch-update",
        }).catch((e) => console.warn({ e, reqId }, "monitoring log failed"));
        return result;
    },
};
