// ===========================================
// Mock Data for Application Management Module
// ===========================================

export interface SystemUser {
  ID: string;            // NOREG
  name: string;
  division: string;
  email: string;
  department: string;
  canBeOwner: boolean;      // eligible as System Owner
  canBeCustodian: boolean;  // eligible as System Custodian
}

export const systemUsers: SystemUser[] = [
  { ID:"00123456", name:"Okubo",     division:"Production Planning Control", email:"okubo@toyota.co.id",     department:"PPC Dept", canBeOwner:true,  canBeCustodian:true  }, // BOTH
  { ID:"00123457", name:"Yoshida",   division:"Production Planning Control", email:"yoshida@toyota.co.id",   department:"PPC Dept", canBeOwner:true,  canBeCustodian:false }, // OWNER only
  { ID:"00234567", name:"Tanaka",    division:"Production Engineering",      email:"tanaka@toyota.co.id",    department:"PE Dept",  canBeOwner:true, canBeCustodian:false  }, // CUST only
  { ID:"00234568", name:"Sato",      division:"Production Engineering",      email:"sato@toyota.co.id",      department:"PE Dept",  canBeOwner:true,  canBeCustodian:false  }, // BOTH
  { ID:"00345678", name:"Suzuki",    division:"Corporate Planning",          email:"suzuki@toyota.co.id",    department:"CP Dept",  canBeOwner:false, canBeCustodian:true  }, // CUST only
  { ID:"00345679", name:"Takahashi", division:"Corporate Planning",          email:"takahashi@toyota.co.id", department:"CP Dept",  canBeOwner:false, canBeCustodian:true  }, // CUST only
];

// ------------------------
// Security Center Master
// ------------------------
export const securityCenters: string[] = ["SC", "Global SC", "TMMINRole", "LDAP"];

// -----------------------
// Application Mock Data
// -----------------------
export type ApplicationRow = {
  ID: string; // akan dinormalisasi ke format SARAPPLICATIONYYYYMMDD0001
  APPLICATION_ID: string;
  APPLICATION_NAME: string;
  DIVISION_ID_OWNER: string;
  NOREG_SYSTEM_OWNER: string; // ref SystemUser.ID
  NOREG_SYSTEM_CUST: string;  // ref SystemUser.ID
  SECURITY_CENTER: string;    // ref securityCenters item
  APPLICATION_STATUS: "Aktif" | "Inactive";
  CREATED_BY: string;
  CREATED_DT: string; // ISO
  CHANGED_BY: string;
  CHANGED_DT: string; // ISO
};

export const mockApplications: ApplicationRow[] = [
  {
    ID: "1",
    APPLICATION_ID: "IPPCS",
    APPLICATION_NAME: "Integrated Production Planning Control System",
    DIVISION_ID_OWNER: "Production Planning Control",
    NOREG_SYSTEM_OWNER: "00123456", // Okubo (BOTH)
    NOREG_SYSTEM_CUST: "00234567",  // Tanaka (CUST)
    SECURITY_CENTER: "SC",
    APPLICATION_STATUS: "Aktif",
    CREATED_BY: "system",
    CREATED_DT: "2024-07-20T10:30:00.000Z",
    CHANGED_BY: "system",
    CHANGED_DT: "2024-07-20T11:00:00.000Z",
  },
  {
    ID: "2",
    APPLICATION_ID: "PAS",
    APPLICATION_NAME: "Production Achievement System",
    DIVISION_ID_OWNER: "Production Engineering",
    NOREG_SYSTEM_OWNER: "00234568", // Sato (BOTH)
    NOREG_SYSTEM_CUST: "00345679",  // Takahashi (CUST)
    SECURITY_CENTER: "Global SC",
    APPLICATION_STATUS: "Aktif",
    CREATED_BY: "system",
    CREATED_DT: "2024-07-19T09:00:00.000Z",
    CHANGED_BY: "system",
    CHANGED_DT: "2024-07-19T09:45:00.000Z",
  },
  {
    ID: "3",
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
