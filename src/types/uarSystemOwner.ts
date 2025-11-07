// File: src/types/uarSystemOwner.ts

// Tipe Meta Paginasi (Generik, bisa di-share)
export type ApiMeta = {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
};

// Tipe untuk Komentar (Generik, bisa di-share)
export type Comment = {
    user: string;
    text: string;
    timestamp: Date;
};

// --- Tipe Spesifik SystemOwner ---

// Tipe untuk data List (Halaman Utama)
export type SystemOwnerUarHeader = {
    uarId: string;
    uarPeriod: string;
    applicationId: string;
    applicationName: string;
    percentComplete: string;
    createdDate: string; // ISO string
    completedDate: string | null; // ISO string
    status: "1" | "0" | null; // "1" = Finished, "0" = InProgress
};

// Tipe untuk data Detail (Halaman Detail)
export type SystemOwnerUarDetailItem = {
    // Kunci Identifikasi
    UAR_ID: string;
    APPLICATION_ID: string | null;
    USERNAME: string;
    ROLE_ID: string;

    // Info Pengguna
    NOREG: string | null;
    NAME: string | null;
    POSITION_NAME: string | null;
    COMPANY_NAME: string | null;
    DIVISION_NAME: string | null;

    // Info Role
    ROLE_NAME: string | null;

    // Status (dari BE)
    SO_APPROVAL_STATUS?: string | null;
    DIV_APPROVAL_STATUS?: string | null;

    // Untuk pelacakan komentar (Opsional)
    comments?: Comment[];
};

// Tipe untuk Payload Batch Update
export type SystemOwnerBatchUpdateItem = {
    username: string;
    roleId: string;
    decision: "Approved" | "Revoked";
};

export type SystemOwnerBatchUpdatePayload = {
    uarId: string;
    applicationId: string;
    comments?: string;
    items: SystemOwnerBatchUpdateItem[];
};


// --- Tipe Respons Backend (Wrapper) ---

export type BackendSystemOwnerUarListResponse = {
    data: SystemOwnerUarHeader[];
    meta: ApiMeta;
};

export type BackendSystemOwnerUarDetailResponse = {
    data: {
        systemOwnerUsers: SystemOwnerUarDetailItem[]; // Sesuai BE
        divisionUsers: SystemOwnerUarDetailItem[]; // Sesuai BE
    };
};

export type BackendSystemOwnerBatchUpdateResponse = {
    message: string;
    data: {
        count: number; // Sesuai BE
    };
};