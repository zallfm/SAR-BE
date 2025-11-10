import { ApplicationError } from "../../core/errors/applicationError.js";
import { ERROR_CODES } from "../../core/errors/errorCodes.js";
import { uarSystemOwnerRepository as repo } from "./uar_system_owner.repository";
import type {
    UarSystemOwnerBatchUpdateDTO,
    UarHeader,
    UarSystemOwnerAddCommentDTO,
} from "../../types/uar_system_owner"
import {
    currentRequestId,
    currentUserId,
} from "../../core/requestContext";
import { publishMonitoringLog } from "../log_monitoring/log_publisher";

/**
 * Gets the list of Application IDs owned by the given user (noreg).
 * @param userNoreg The user's NOREG.
 * @returns A promise that resolves to an array of application IDs.
 */
async function getOwnedApplicationIds(userNoreg: string): Promise<string[]> {
    const apps = await repo.findAppsByOwner(userNoreg);
    if (apps.length === 0) {
        throw new ApplicationError(
            ERROR_CODES.API_UNAUTHORIZED, // Using a more standard code
            "You are not registered as a System Owner for any application.",
            { userNoreg },
            undefined,
            403
        );
    }
    return apps.map((app) => app.APPLICATION_ID);
}


export const uarSystemOwnerService = {

    async list(
        params: {
            page: number;
            limit: number;
            period?: string;
            uarId?: string;
            applicationId?: string;
        },
        userNoreg: string
    ) {
        const ownedApplicationIds = await getOwnedApplicationIds(userNoreg);

        // --- FIX 1: Destructure dateStats ---
        const { data, total, completionStats, dateStats } = await repo.listUars({
            ...params,
            ownedApplicationIds,
        });

        // Map completion stats by UAR_ID + APP_ID
        const percentMap = new Map<string, { completed: number; total: number }>();
        for (const stat of completionStats) {
            const key = `${stat.UAR_ID}_${stat.APPLICATION_ID}`;
            const count = stat._count._all;
            const status = stat.SO_APPROVAL_STATUS;

            if (!percentMap.has(key)) {
                percentMap.set(key, { completed: 0, total: 0 });
            }

            const current = percentMap.get(key)!;
            current.total += count;
            // '1' = Approved, '2' = Revoked
            if (status === '1' || status === '2') {
                current.completed += count;
            }
        }

        const headers: UarHeader[] = data.map((r) => {
            const key = `${r.UAR_ID}_${r.APPLICATION_ID}`;
            const stats = percentMap.get(key);

            let percentCompleteString = "100% (0 of 0)";
            let newStatus: "1" | "0" = "1";

            if (stats) {
                const total = stats.total;
                const completed = stats.completed;

                if (total > 0) {
                    const percentNumber = Math.round((completed / total) * 100);
                    percentCompleteString = `${percentNumber}% (${completed} of ${total})`;
                    newStatus = (percentNumber === 100) ? "1" : "0";
                } else {
                    percentCompleteString = "100% (0 of 0)";
                    newStatus = "1";
                }
            }

            // --- FIX 2: Use dateStats for createdDate ---
            const createdDate = dateStats
                .filter(c => c.UAR_ID === r.UAR_ID && c.APPLICATION_ID === r.APPLICATION_ID)
                .map(c => c.CREATED_DT)
                .sort((a, b) => a.getTime() - b.getTime())[0];

            // --- FIX 3: Use dateStats for completedDate ---
            const completedDate = dateStats
                .filter(c => c.UAR_ID === r.UAR_ID && c.APPLICATION_ID === r.APPLICATION_ID && c.SO_APPROVAL_DT !== null)
                .map(c => c.SO_APPROVAL_DT!)
                .sort((a, b) => b.getTime() - a.getTime())[0];

            return {
                uarId: r.UAR_ID,
                uarPeriod: r.UAR_PERIOD,
                applicationId: r.APPLICATION_ID ?? 'N/A', // <-- FIX: Handled potential null
                applicationName: r.TB_M_APPLICATION?.APPLICATION_NAME ?? 'N/A',
                percentComplete: percentCompleteString,
                createdDate: createdDate?.toISOString() ?? "",
                completedDate: completedDate?.toISOString() ?? null,
                status: newStatus
            };
        });

        return { data: headers, total };
    },


    async getDetails(uarId: string, applicationId: string, userNoreg: string) {
        const ownedApplicationIds = await getOwnedApplicationIds(userNoreg);

        // Security check
        if (!ownedApplicationIds.includes(applicationId)) {
            throw new ApplicationError(
                ERROR_CODES.API_UNAUTHORIZED,
                "You are not authorized to view this application.",
                { uarId, applicationId, userNoreg },
                undefined,
                403
            );
        }

        const { systemOwnerUsers, divisionUsers } = await repo.getUarDetails(uarId, applicationId);

        if (systemOwnerUsers.length === 0 && divisionUsers.length === 0) {
            throw new ApplicationError(
                ERROR_CODES.APP_NOT_FOUND,
                "No UAR data found for this ID and application.",
                { uarId, applicationId },
                undefined,
                404
            );
        }

        return { systemOwnerUsers, divisionUsers };
    },

    async getUarSo(uarId: string, applicationId: string, userNoreg: string) {
        console.log("userNoreg", userNoreg)
        const ownedApplicationIds = await getOwnedApplicationIds(userNoreg);

        // Security check
        if (!ownedApplicationIds.includes(applicationId)) {
            throw new ApplicationError(
                ERROR_CODES.API_UNAUTHORIZED,
                "You are not authorized to view this application.",
                { uarId, applicationId, userNoreg },
                undefined,
                403
            );
        }

        const { header, systemOwnerUsers, divisionUsers } = await repo.getUarSo(uarId, applicationId);

        if (systemOwnerUsers.length === 0 && divisionUsers.length === 0) {
            throw new ApplicationError(
                ERROR_CODES.APP_NOT_FOUND,
                "No UAR data found for this ID and application.",
                { uarId, applicationId },
                undefined,
                404
            );
        }
        // console.log("header, systemOwnerUsers, divisionUsers", { header, systemOwnerUsers, divisionUsers })
        return { header, systemOwnerUsers, divisionUsers };
    },


    async batchUpdate(
        dto: UarSystemOwnerBatchUpdateDTO,
        userNoreg: string
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

        const ownedApplicationIds = await getOwnedApplicationIds(userNoreg);

        // Security check
        if (!ownedApplicationIds.includes(dto.applicationId)) {
            throw new ApplicationError(
                ERROR_CODES.API_UNAUTHORIZED,
                "You are not authorized to update this application.",
                dto,
                undefined,
                403
            );
        }

        const result = await repo.batchUpdate(dto, userNoreg);

        if (result.count === 0) {
            throw new ApplicationError(
                ERROR_CODES.APP_UPDATE_FAILED,
                "Update failed. No matching UAR items found."
            );
        }

        const userId = currentUserId() ?? userNoreg;
        const reqId = currentRequestId();
        publishMonitoringLog(globalThis.app as any, {
            userId,
            module: "UAR_SO",
            action: "BATCH_UPDATE",
            status: "Success",
            description: `Batch update for UAR ${dto.uarId} / App ${dto.applicationId} on ${dto.items.length} items.`,
            location: "/uar-system-owner/batch-update",
        }).catch((e) => console.warn({ e, reqId }, "monitoring log failed"));

        return result;
    },

    async addComment(
        dto: UarSystemOwnerAddCommentDTO,
        userNoreg: string
    ) {
        if (!dto.comments || dto.comments.trim().length === 0) {
            throw new ApplicationError(
                ERROR_CODES.VAL_INVALID_FORMAT,
                "Comments cannot be empty.",
                dto, undefined, 400
            );
        }
        if (!dto.items || dto.items.length === 0) {
            throw new ApplicationError(
                ERROR_CODES.VAL_INVALID_FORMAT,
                "You must select at least one item to comment on.",
                dto, undefined, 400
            );
        }

        const ownedApplicationIds = await getOwnedApplicationIds(userNoreg);
        if (!ownedApplicationIds.includes(dto.applicationId)) {
            throw new ApplicationError(
                ERROR_CODES.API_UNAUTHORIZED,
                "You are not authorized to comment on this application.",
                dto, undefined, 403
            );
        }

        const result = await repo.addComment(dto, userNoreg);

        const userId = currentUserId() ?? userNoreg;
        const reqId = currentRequestId();
        publishMonitoringLog(globalThis.app as any, {
            userId,
            module: "UAR_SO",
            action: "ADD_COMMENT",
            status: "Success",
            description: `Added comment for UAR ${dto.uarId} / App ${dto.applicationId} on ${dto.items.length} items.`,
            location: "/uar-system-owner/comment", // <-- Note the new location
        }).catch((e) => console.warn({ e, reqId }, "monitoring log failed"));

        return result;
    },
};