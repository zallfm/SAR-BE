// ======================================
// 📦 Application Type Definitions
// ======================================

// --- SystemUser: pemilik & custodian sistem
export interface SystemUser {
  NOREG: string;              // Noreg unik
  DIVISION_ID:any
  PERSONAL_NAME: string;
  DIVISION_NAME: string;
  MAIL: string;
  DEPARTEMENT_NAME: string;
  canBeOwner: boolean;     // eligible sebagai System Owner
  canBeCustodian: boolean; // eligible sebagai System Custodian
}

// --- Security Center master
export type SecurityCenter = "SC" | "Global SC" | "TMMINRole" | "LDAP";

// --- Status aplikasi
export type ApplicationStatus = "Active" | "Inactive";

// --- Application model utama (DB/Repository)
export interface Application {
  APPLICATION_ID: string;
  APPLICATION_NAME: string;
  DIVISION_ID_OWNER: string;
  NOREG_SYSTEM_OWNER: string; // referensi ke SystemUser.ID
  NOREG_SYSTEM_CUST: string;  // referensi ke SystemUser.ID
  SECURITY_CENTER: SecurityCenter;
  APPLICATION_STATUS: ApplicationStatus;
  CREATED_BY: string;
  CREATED_DT: string; // ISO string
  CHANGED_BY: string;
  CHANGED_DT: string; // ISO string
}

// ======================================
// 🧾 DTO (Data Transfer Object) — Request Body
// ======================================

// --- DTO untuk create (POST)
export type ApplicationCreateDTO = {
  APPLICATION_ID: string;
  APPLICATION_NAME: string;
  DIVISION_ID_OWNER: string;
  NOREG_SYSTEM_OWNER: string;
  NOREG_SYSTEM_CUST: string;
  SECURITY_CENTER: SecurityCenter;
  APPLICATION_STATUS: ApplicationStatus;
};

// --- DTO untuk update (PUT)
export type ApplicationUpdateDTO = Partial<ApplicationCreateDTO>;

// --- DTO untuk query list (GET)
export type ApplicationListQuery = {
  page?: number;
  limit?: number;
  search?: string;
  sortField?: "APPLICATION_ID" | "APPLICATION_NAME" | "CREATED_DT" | "CHANGED_DT";
  sortOrder?: "asc" | "desc";
};

// --- Response standar list
export interface ApplicationListResponse {
  data: Application[];
  page: number;
  limit: number;
  total: number;
}
