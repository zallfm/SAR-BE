export interface UarSystemOwnerBatchUpdateDTO {
    uarId: string;
    applicationId: string;
    comments?: string;
    items: {
        username: string;
        roleId: string;
        decision: "Approved" | "Revoked";
    }[];
}

export interface UarHeader {
    uarId: string;
    uarPeriod: string;
    applicationId: string;
    applicationName: string;
    percentComplete: string;
    createdDate: string;
    completedDate: string | null;
    status: null | "1" | "0";
}