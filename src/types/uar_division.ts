
export interface UarDivisionBatchUpdateDTO {
    uarId: string;
    decision: "Approve" | "Revoke";
    comments?: string;
    items: {
        username: string;
        roleId: string;
    }[];
}


export interface UarHeader {
    uarId: string;
    uarPeriod: string;
    createdDate: string;
    completedDate: string | null;
    status: null | "1" | "0";
}

