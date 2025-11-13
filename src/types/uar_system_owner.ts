export interface UarSystemOwnerBatchUpdateDTO {
    uarId: string;
    applicationId: string;
    comments?: string;
    source: 'SYSTEM_OWNER' | 'DIVISION_USER'
    items: {
        username: string;
        roleId: string;
        decision: "Approved" | "Revoked";
    }[];
}

export interface UarSystemOwnerAddCommentDTO {
    uarId: string;
    applicationId: string;
    comments: string;
    items: Array<{
        username: string;
        roleId: string;
    }>;
}

export interface UarHeader {
    uarId: string;
    uarPeriod: string;
    applicationId: string,
    divisionId: number;
    divisionOwner: string;
    percentComplete: string;
    createdDate: string;
    completedDate: string | null;
    status: null | "1" | "0";
}