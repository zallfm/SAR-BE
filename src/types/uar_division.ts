
export interface UarDivisionBatchUpdateDTO {
    uarId: string;
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
    divisionOwner: string;
    percentComplete: string;
    createdDate: string;
    completedDate: string | null;
    status: null | "1" | "0";
}