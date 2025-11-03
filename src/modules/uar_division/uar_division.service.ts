
import { ApplicationError } from "../../core/errors/applicationError.js";
import { ERROR_CODES } from "../../core/errors/errorCodes.js";
import { uarDivisionRepository as repo } from "./uar_division.repository";
import type {
    UarDivisionBatchUpdateDTO,
    UarHeader,
} from "../../types/uar_division";
import {
    currentRequestId,
    currentUserId,
} from "../../core/requestContext";
import { publishMonitoringLog } from "../log_monitoring/log_publisher";

function mapStatus(
    isApproved: string | null | undefined,
    isRejected: string | null | undefined
): null | "1" | "0" {
    if (isApproved === "Y") return "1";
    if (isRejected === "Y") return "0";
    return null;
}

export const uarDivisionService = {

    async list(
        params: {
            page: number;
            limit: number;
            period?: string;
            uarId?: string;
        },
        userDivisionId: number
    ) {
        const { data, total } = await repo.listUars({
            ...params,
            userDivisionId,
        });

        const headers: UarHeader[] = data.map((r) => ({
            uarId: r.UAR_ID,
            uarPeriod: r.UAR_PERIOD,
            createdDate: r.CREATED_DT?.toISOString() ?? "",
            completedDate: r.APPROVED_DT?.toISOString() ?? null,
            status: mapStatus(r.IS_APPROVED, r.IS_REJECTED),
        }));

        return { data: headers, total };
    },

    /**
     * Get all items for a single UAR, filtered by the user's division.
     */
    async getDetails(uarId: string, userDivisionId: number) {
        const rows = await repo.getUarDetails(uarId, userDivisionId);
        if (!rows || rows.length === 0) {
            throw new ApplicationError(
                ERROR_CODES.APP_NOT_FOUND,
                "No UAR data found for this ID and your division.",
                { uarId, userDivisionId },
                undefined,
                404
            );
        }
        return rows;
    },


    async batchUpdate(
        dto: UarDivisionBatchUpdateDTO,
        userNoreg: string,
        userDivisionId: number
    ) {
        if (!dto.items || dto.items.length === 0) {
            throw new ApplicationError(
                ERROR_CODES.VAL_INVALID_FORMAT,
                "No items selected for update.",
                dto,
                undefined,
                400
            );
        }

        const result = await repo.batchUpdate(dto, userNoreg, userDivisionId);

        if (
            result.workflowUpdateResult.count === 0 &&
            result.userUpdateResult.count === 0
        ) {
            throw new ApplicationError(
                ERROR_CODES.APP_UPDATE_FAILED,
                "Update failed. No matching UAR workflow or items found."
            );
        }

        // Publish monitoring log
        const userId = currentUserId() ?? userNoreg;
        const reqId = currentRequestId();
        publishMonitoringLog(globalThis.app as any, {
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