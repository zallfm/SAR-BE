export type ApiMeta = {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
};

export type UarHeader = {
    uarId: string;
    uarPeriod: string;
    divisionOwner: string;
    percentComplete: string;
    createdDate: string;
    completedDate: string | null;
    status: "1" | "0" | null;
};

export type UarDetailItem = {
    UAR_PERIOD: string;
    UAR_ID: string;
    USERNAME: string;
    NOREG: string | null;
    NAME: string | null;
    APPLICATION_ID: string | null;
    ROLE_ID: string;
    DIV_APPROVAL_STATUS: "1" | "0" | "2";
};

export type BackendUarListResponse = {
    requestId: string;
    data: UarHeader[];
    meta: ApiMeta;
};

export type BackendUarDetailResponse = {
    requestId: string;
    data: UarDetailItem[];
};

export type BatchUpdatePayload = {
    uarId: string;
    decision: "Approve" | "Revoke";
    comments?: string;
    items: {
        username: string;
        roleId: string;
    }[];
};

export type BackendBatchUpdateResponse = {
    requestId: string;
    data: {
        userUpdateResult: { count: number };
        workflowUpdateResult: { count: number };
    };
};

