export type AppStatus = "Active" | "Inactive";

export interface ApplicationEntity {
  ID: string;
  name: string;
  division: string;
  ownerId: string;
  custodianId: string;
  securityCenter: "SC" | "Global SC" | "TMMINRole" | "LDAP";
  status: AppStatus;
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

export interface ApplicationListItem extends ApplicationEntity {
  ownerName: string;
  custodianName: string;
}

export type SortField = "updatedAt" | "createdAt" | "name" | "ID";
export type SortOrder = "asc" | "desc";

export interface ApplicationListQuery {
  page?: number;
  limit?: number;
  sortField?: SortField;
  sortOrder?: SortOrder;
  search?: string;
  status?: AppStatus;
  securityCenter?: ApplicationEntity["securityCenter"];
  division?: string;
  ownerId?: string;
  custodianId?: string;
}

export interface ApplicationListResult {
  data: ApplicationListItem[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasPrev: boolean;
    hasNext: boolean;
  };
  sort: { field: SortField; order: SortOrder };
  requestId: string;
}

export interface SystemUser {
  ID: string;
  name: string;
  division: string;
  email: string;
  department: string;
  roles?: Array<"OWNER" | "CUSTODIAN">; // opsional (untuk masa depan)
}
