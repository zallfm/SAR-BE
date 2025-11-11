// File: src/api/uarSystemOwner.ts

import { http } from "./client"; // Asumsi
import { withToken } from "./helper"; // Asumsi
import type {
    BackendSystemOwnerUarListResponse,
    BackendSystemOwnerUarDetailResponse,
    BackendSystemOwnerBatchUpdateResponse,
    SystemOwnerBatchUpdatePayload,
} from "../types/uarSystemOwner"; // <-- Impor tipe baru

// Filter untuk halaman list
export type SystemOwnerUarListFilters = {
    page?: number;
    limit?: number;
    period?: string;
    uarId?: string;
    applicationId?: string; // Filter dari BE

    // Filter tambahan dari FE
    owner?: string;
    createdDate?: string;
    completedDate?: string;
    status?: string;
    reviewStatus?: 'pending' | 'reviewed';
};

/**
 * API: Get list UAR untuk System Owner
 */
export const getUarListApi = (
    params?: SystemOwnerUarListFilters, // <-- Nama filter baru
    signal?: AbortSignal
) =>
    withToken((token) =>
        http<BackendSystemOwnerUarListResponse>({ // <-- Tipe respons baru
            path: "/sar/uar_system_owner",
            method: "GET",
            token,
            params,
            signal: signal,
        })
    );

/**
 * API: Get detail UAR untuk System Owner
 */
export const getUarDetailApi = (
    uarId: string,
    applicationId: string,
    signal?: AbortSignal
) =>
    withToken((token) =>
        http<BackendSystemOwnerUarDetailResponse>({ // <-- Tipe respons baru
            path: `/sar/uar_system_owner/${uarId}/applications/${applicationId}`,
            method: "GET",
            token,
            signal: signal,
        })
    );

/**
 * API: Batch update (Keep/Revoke) untuk System Owner
 */
export const batchUpdateApi = (data: SystemOwnerBatchUpdatePayload) => // <-- Tipe payload baru
    withToken((token) =>
        http<BackendSystemOwnerBatchUpdateResponse>({ // <-- Tipe respons baru
            path: "/sar/uar_syste_-owner/batch-update",
            method: "POST",
            token,
            body: data,
        })
    );