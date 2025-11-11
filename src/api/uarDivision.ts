// --- NEW FILE ---

import { http } from "./client";
import { withToken } from "./helper";
import type {
    BackendUarListResponse,
    BackendUarDetailResponse,
    BackendBatchUpdateResponse,
    BatchUpdatePayload,
} from "../types/uarDivision";

// Filters for the UAR List page
export type UarListFilters = {
    page?: number;
    limit?: number;
    period?: string;
    uarId?: string;
    status?: string;
    reviewStatus?: 'pending' | 'reviewed';
};

/**
 * API: Get the list of UAR headers for the division
 */
export const getUarListApi = (params?: UarListFilters, signal?: AbortSignal) =>
    withToken((token) =>
        http<BackendUarListResponse>({
            path: "/sar/uar_division",
            method: "GET",
            token,
            params,
            signal: signal,
        })
    );

/**
 * API: Get the detail items for a single UAR
 */
export const getUarDetailApi = (uarId: string, signal?: AbortSignal) =>
    withToken((token) =>
        http<BackendUarDetailResponse>({
            path: `/sar/uar_division/${uarId}`,
            method: "GET",
            token,
            signal: signal,
        })
    );

/**
 * API: Perform a batch approve or revoke
 */
export const batchUpdateApi = (data: BatchUpdatePayload) =>
    withToken((token) =>
        http<BackendBatchUpdateResponse>({
            path: "/sar/uar_division/batch-update",
            method: "POST",
            token,
            body: data,
        })
    );

