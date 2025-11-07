export type Application = {
  APPLICATION_ID: string;
  APPLICATION_NAME: string;
  DIVISION_ID_OWNER: number;
  NOREG_SYSTEM_OWNER: string;
  NOREG_SYSTEM_CUST: string;
  SECURITY_CENTER: string;
  APPLICATION_STATUS: "Active" | "Inactive";
  CREATED_BY: string
  CREATED_DT: string; // ISO
  CHANGED_BY: string;
  CHANGED_DT: string; // ISO
};

export type BackendCreateApplicationResponse = {
  requestId: string;
  data: Application;
}

export type BackendEditApplicationResponse = {
  requestId: string;
  data: Application;
}

export type BackendGetApplicationResponse = {
  data: Application[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type SystemUser = {
  NOREG: string;
  DIVISION_ID:number;
  DEPARTMENT_ID: number;
  PERSONAL_NAME: string;
  DIVISION_NAME: string;
  MAIL: string;
  DEPARTMENT_NAME: string;
  canBeOwner: boolean;      // eligible as System Owner
  canBeCustodian: boolean;
}
