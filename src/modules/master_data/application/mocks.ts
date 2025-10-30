// ===========================================
// Mock Data for Application Management Module
// ===========================================

export interface SystemUser {
  NOREG: string;            // NOREG
  PERSONAL_NAME: string;
  DIVISION_NAME: string;
  MAIL: string;
  DEPARTEMENT_NAME: string;
  canBeOwner: boolean;      // eligible as System Owner
  canBeCustodian: boolean;  // eligible as System Custodian
}

export const systemUsers: SystemUser[] = [
  { NOREG:"00123456", PERSONAL_NAME:"Okubo",     DIVISION_NAME:"Production Planning Control", MAIL:"okubo@toyota.co.id",     DEPARTEMENT_NAME:"PPC Dept", canBeOwner:true,  canBeCustodian:true  }, // BOTH
  { NOREG:"00123457", PERSONAL_NAME:"Yoshida",   DIVISION_NAME:"Production Planning Control", MAIL:"yoshida@toyota.co.id",   DEPARTEMENT_NAME:"PPC Dept", canBeOwner:true,  canBeCustodian:false }, // OWNER only
  { NOREG:"00234567", PERSONAL_NAME:"Tanaka",    DIVISION_NAME:"Production Engineering",      MAIL:"tanaka@toyota.co.id",    DEPARTEMENT_NAME:"PE Dept",  canBeOwner:true, canBeCustodian:false  }, // CUST only
  { NOREG:"00234568", PERSONAL_NAME:"Sato",      DIVISION_NAME:"Production Engineering",      MAIL:"sato@toyota.co.id",      DEPARTEMENT_NAME:"PE Dept",  canBeOwner:true,  canBeCustodian:false  }, // BOTH
  { NOREG:"00345678", PERSONAL_NAME:"Suzuki",    DIVISION_NAME:"Corporate Planning",          MAIL:"suzuki@toyota.co.id",    DEPARTEMENT_NAME:"CP Dept",  canBeOwner:true, canBeCustodian:true  }, // CUST only
  { NOREG:"00345679", PERSONAL_NAME:"Takahashi", DIVISION_NAME:"Corporate Planning",          MAIL:"takahashi@toyota.co.id", DEPARTEMENT_NAME:"CP Dept",  canBeOwner:false, canBeCustodian:true  }, // CUST only
];

// ------------------------
// Security Center Master
// ------------------------
export const securityCenters: string[] = ["SC", "Global SC", "TMMINRole", "LDAP"];

// -----------------------
// Application Mock Data
// -----------------------
export type ApplicationRow = {
  APPLICATION_ID: string;
  APPLICATION_NAME: string;
  DIVISION_ID_OWNER: string;
  NOREG_SYSTEM_OWNER: string; // ref SystemUser.ID
  NOREG_SYSTEM_CUST: string;  // ref SystemUser.ID
  SECURITY_CENTER: string;    // ref securityCenters item
  APPLICATION_STATUS: "Active" | "Inactive";
  CREATED_BY: string;
  CREATED_DT: string; // ISO
  CHANGED_BY: string;
  CHANGED_DT: string; // ISO
};

export const mockApplications: ApplicationRow[] = [
  {
    APPLICATION_ID: "IPPCS",
    APPLICATION_NAME: "Integrated Production Planning Control System",
    DIVISION_ID_OWNER: "Production Planning Control",
    NOREG_SYSTEM_OWNER: "00123456", // Okubo (BOTH)
    NOREG_SYSTEM_CUST: "00234567",  // Tanaka (CUST)
    SECURITY_CENTER: "SC",
    APPLICATION_STATUS: "Active",
    CREATED_BY: "system",
    CREATED_DT: "2024-07-20T10:30:00.000Z",
    CHANGED_BY: "system",
    CHANGED_DT: "2024-07-20T11:00:00.000Z",
  },
  {
    APPLICATION_ID: "PAS",
    APPLICATION_NAME: "Production Achievement System",
    DIVISION_ID_OWNER: "Production Engineering",
    NOREG_SYSTEM_OWNER: "00234568", // Sato (BOTH)
    NOREG_SYSTEM_CUST: "00345679",  // Takahashi (CUST)
    SECURITY_CENTER: "Global SC",
    APPLICATION_STATUS: "Active",
    CREATED_BY: "system",
    CREATED_DT: "2024-07-19T09:00:00.000Z",
    CHANGED_BY: "system",
    CHANGED_DT: "2024-07-19T09:45:00.000Z",
  },
  {
    APPLICATION_ID: "TMS",
    APPLICATION_NAME: "Toyota Management System",
    DIVISION_ID_OWNER: "Corporate Planning",
    NOREG_SYSTEM_OWNER: "00123457", // Yoshida (OWNER only)
    NOREG_SYSTEM_CUST: "00345678",  // Suzuki (CUST)
    SECURITY_CENTER: "TMMINRole",
    APPLICATION_STATUS: "Inactive",
    CREATED_BY: "system",
    CREATED_DT: "2024-07-18T14:00:00.000Z",
    CHANGED_BY: "system",
    CHANGED_DT: "2024-07-18T15:10:00.000Z",
  },
];
