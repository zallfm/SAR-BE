import { ApplicationError } from "../../../core/errors/applicationError.js";
import { ERROR_CODES } from "../../../core/errors/errorCodes.js";
import { currentRequestId, currentUserId } from "../../../core/requestContext.js";
import { publishMonitoringLog } from "../../log_monitoring/log_publisher.js";
import { applicationRepository as repo } from "./application.repository.js";
import { validateOwnerAndCustodian } from "./application.validator.js";

type SortField = "APPLICATION_ID" | "APPLICATION_NAME" | "CREATED_DT" | "CHANGED_DT";
type SortOrder = "asc" | "desc";

export const applicationService = {
  // Normalisasi status dari berbagai bentuk input FE
  normalizeStatus(input: any): "Active" | "Inactive" | undefined {
    const raw = input?.APPLICATION_STATUS ?? input?.status ?? input?.appStatus ?? input?.applicationStatus;
    if (raw === undefined) return undefined;
    if (typeof raw === "boolean") return raw ? "Active" : "Inactive";
    const s = String(raw).trim().toLowerCase();
    if (s === "active" || s === "aktif" || s === "a" || s === "0") return "Active";
    if (s === "inactive" || s === "inaktif" || s === "i" || s === "1") return "Inactive";
    return undefined;
  },

  async activeList() {
    return repo.activeList()
  },
  async list(params: {
    page: number;
    limit: number;
    search?: string;
    sortField: SortField;
    sortOrder: SortOrder;
  }) {
    return repo.list(params);
  },

  async getById(id: string) {
    const row = await repo.findById(id);
    if (!row) {
      throw new ApplicationError(
        ERROR_CODES.APP_NOT_FOUND,
        "Application not found",
        { id },
        undefined,
        404
      );
    }
    return row;
  },

  async create(input: {
    APPLICATION_ID: string;
    APPLICATION_NAME: string;
    DIVISION_ID_OWNER: string;
    NOREG_SYSTEM_OWNER: string;
    NOREG_SYSTEM_CUST: string;
    SECURITY_CENTER: string;
    APPLICATION_STATUS: "Active" | "Inactive";
  }, auditUser: string) {
    // console.log("input", input)

    const existingApp = await repo.findByCode(input.APPLICATION_ID.toLowerCase());
    if (existingApp) {
      throw new ApplicationError(
        ERROR_CODES.VAL_DUPLICATE_ENTRY,
        "APPLICATION_ID already exists",
        { errors: { APPLICATION_ID: { code: "ALREADY_EXISTS", message: "APPLICATION_ID already exists", value: input.APPLICATION_ID } } },
        // { APPLICATION_ID: input.APPLICATION_ID },
        undefined,
        400
      )
    }

    // 2) Validate owner/custodian existence + eligibility
    // console.log("inputss", input)
    validateOwnerAndCustodian(input.NOREG_SYSTEM_OWNER, input.NOREG_SYSTEM_CUST);
    const owner = await repo.getUserByNoreg(input.NOREG_SYSTEM_OWNER);
    if (!owner) {
      throw new ApplicationError(ERROR_CODES.APP_INVALID_DATA, "System Owner NOREG not found");
    }
    const cust = await repo.getUserByNoreg(input.NOREG_SYSTEM_CUST);
    if (!cust) {
      throw new ApplicationError(ERROR_CODES.APP_INVALID_DATA, "System Custodian NOREG not found");
    }
    const nameUsed = await repo.existsByName(input.APPLICATION_NAME);
    if (nameUsed) {
      throw new ApplicationError(
        ERROR_CODES.VAL_DUPLICATE_ENTRY,
        "APPLICATION_NAME already exists",
        { errors: { APPLICATION_NAME: { code: "APPLICATION_NAME already existst", value: input.APPLICATION_NAME } } },
        // { APPLICATION_NAME: input.APPLICATION_NAME },
        undefined,
        400
      );
    }
    const ownerReg = String(owner.NOREG).trim().toUpperCase();
    const alreadyUsed = await repo.existsByOwnerNoreg(ownerReg);
    if (alreadyUsed) {
      throw new ApplicationError(
        ERROR_CODES.VAL_DUPLICATE_ENTRY,
        "This System Owner is already assigned to another applicationtoh",
        { errors: { NOREG_SYSTEM_OWNER: { code: "This System Owner is already assigned to another applicationtoh", value: ownerReg } } },
        // { NOREG_SYSTEM_OWNER: ownerReg },
        undefined,
        400
      );
    }

    // 3) Security center validity
    if (!(await repo.isValidSecurityCenter(input.SECURITY_CENTER))) {
      throw new ApplicationError(ERROR_CODES.APP_INVALID_DATA, "Invalid Security Center");
    }
    const userId = currentUserId();
    const reqId = currentRequestId()
    publishMonitoringLog(globalThis.app as any, {
      userId,
      module: "APPLI",
      action: "APPLICATION_CREATE",
      status: "Success",
      description: `Create application ${input.APPLICATION_NAME}`,
      location: "/applications"
    }).catch(e => console.warn({ e, reqId }, "monitoring log failed"));

    // Koersi status jika FE kirim varian lain
    const norm = this.normalizeStatus(input);
    if (norm) (input as any).APPLICATION_STATUS = norm;
    return repo.create(input as any, auditUser);
  },

  async update(id: string, updates: Partial<{
    APPLICATION_NAME: string;
    DIVISION_ID_OWNER: string;
    NOREG_SYSTEM_OWNER: string;
    NOREG_SYSTEM_CUST: string;
    SECURITY_CENTER: string;
    APPLICATION_STATUS: "Active" | "Inactive";
  }>, auditUser: string) {
    const existing = await repo.findById(id);
    if (!existing) {
      throw new ApplicationError(
        ERROR_CODES.APP_NOT_FOUND,
        "Application not found",
        { id },
        undefined,
        404
      );
    }
    if (updates.NOREG_SYSTEM_OWNER || updates.NOREG_SYSTEM_CUST) {
      const newOwner = updates.NOREG_SYSTEM_OWNER ?? existing.NOREG_SYSTEM_OWNER;
      const newCust = updates.NOREG_SYSTEM_CUST ?? existing.NOREG_SYSTEM_CUST;
      validateOwnerAndCustodian(newOwner, newCust);
    }
    if (updates.NOREG_SYSTEM_OWNER) {
      const owner = await repo.getUserByNoreg(updates.NOREG_SYSTEM_OWNER);
      if (!owner) {
        throw new ApplicationError(ERROR_CODES.APP_INVALID_DATA, "System Owner NOREG not found");
      }
      // if (!owner.canBeOwner) {
      //   throw new ApplicationError(ERROR_CODES.VAL_INVALID_FORMAT, "Selected Owner is not eligible as Owner");
      // }
      if (updates.APPLICATION_NAME) {
        const nameUsed = await repo.existsByNameExceptApp(id, updates.APPLICATION_NAME);
        if (nameUsed) {
          throw new ApplicationError(
            ERROR_CODES.VAL_DUPLICATE_ENTRY,
            "Duplicate field",
            {
              errors: {
                APPLICATION_NAME: {
                  code: "ALREADY_EXISTS",
                  message: "Application Name already exists",
                  value: updates.APPLICATION_NAME,
                },
              },
            },
            currentRequestId(),
            409
          );
        }
      }


      const ownerReg = String(owner.NOREG).trim().toUpperCase();
      const usedByOther = await repo.existsByOwnerNoregExceptApp(id, ownerReg);
      if (usedByOther) {
        throw new ApplicationError(
          ERROR_CODES.VAL_DUPLICATE_ENTRY,
          "Duplicate field",
          {
            errors: {
              NOREG_SYSTEM_OWNER: {
                code: "ALREADY_EXISTS",
                message: "This System Owner is already assigned to another application",
                value: ownerReg,
              },
            },
          },
          currentRequestId(),
          409
        );
      }
    }

    if (updates.NOREG_SYSTEM_CUST) {
      const cust = await repo.getUserByNoreg(updates.NOREG_SYSTEM_CUST);
      if (!cust) {
        throw new ApplicationError(ERROR_CODES.APP_INVALID_DATA, "System Custodian NOREG not found");
      }
      // if (!cust.canBeCustodian) {
      //   throw new ApplicationError(ERROR_CODES.VAL_INVALID_FORMAT, "Selected Custodian is not eligible as Custodian");
      // }
    }

    if (updates.SECURITY_CENTER) {
      const valid = await repo.isValidSecurityCenter(updates.SECURITY_CENTER);
      if (!valid) {
        throw new ApplicationError(ERROR_CODES.APP_INVALID_DATA, "Invalid Security Center");
      }
    }

    // Koersi status jika FE kirim varian lain
    const norm = this.normalizeStatus(updates as any);
    if (norm) (updates as any).APPLICATION_STATUS = norm;
    const updated = await repo.update(id, updates as any, auditUser);
    if (!updated) {
      throw new ApplicationError(ERROR_CODES.APP_UPDATE_FAILED, "Failed to update application");
    }
    const userId = currentUserId();
    const reqId = currentRequestId()
    publishMonitoringLog(globalThis.app as any, {
      userId,
      module: "APPLI",
      action: "APPLICATION_UPDATE",
      status: "Success",
      description: `Update application ${id}`,
      location: "/applications"
    }).catch(e => console.warn({ e, reqId }, "monitoring log failed"));
    return updated;
  },

  // masters (untuk dropdown FE)
  async listUsers(p?: { q?: string; limit?: number; offset?: number }) {
    return repo.listUsers(p);
  },
  async listSecurityCenters(p?: { q?: string; limit?: number; offset?: number }) {
    return repo.listSecurityCenters(p);
  },
};
