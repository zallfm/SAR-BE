import { ApplicationError } from "../../../core/errors/applicationError.js";
import { ERROR_CODES } from "../../../core/errors/errorCodes.js";
import { currentRequestId, currentUserId } from "../../../core/requestContext.js";
import { publishMonitoringLog } from "../../log_monitoring/log_publisher.js";
import { applicationRepository as repo } from "./application.repository.js";
import { validateOwnerAndCustodian } from "./application.validator.js";

type SortField = "APPLICATION_ID" | "APPLICATION_NAME" | "CREATED_DT" | "CHANGED_DT";
type SortOrder = "asc" | "desc";
const userId = currentUserId();
const reqId = currentRequestId()

export const applicationService = {
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
    APPLICATION_STATUS: "Aktif" | "Inactive";
  }) {
    // console.log("input", input)

    const existingApp = await repo.findByCode(input.APPLICATION_ID.toLowerCase());
    if (existingApp) {
      throw new ApplicationError(
        ERROR_CODES.VAL_DUPLICATE_ENTRY,
        "APPLICATION_ID already exists",
        { APPLICATION_ID: input.APPLICATION_ID },
        undefined,
        400
      )
    }

    // 2) Validate owner/custodian existence + eligibility
    validateOwnerAndCustodian(input.NOREG_SYSTEM_OWNER, input.NOREG_SYSTEM_CUST);
    const owner = await repo.getUserByNoreg(input.NOREG_SYSTEM_OWNER);
    if (!owner) {
      throw new ApplicationError(ERROR_CODES.APP_INVALID_DATA, "System Owner NOREG not found");
    }
    const cust = await repo.getUserByNoreg(input.NOREG_SYSTEM_CUST);
    if (!cust) {
      throw new ApplicationError(ERROR_CODES.APP_INVALID_DATA, "System Custodian NOREG not found");
    }

    if (!owner.canBeOwner) {
      throw new ApplicationError(ERROR_CODES.VAL_INVALID_FORMAT, "Selected Owner is not eligible as Owner");
    }
    if (!cust.canBeCustodian) {
      throw new ApplicationError(ERROR_CODES.VAL_INVALID_FORMAT, "Selected Custodian is not eligible as Custodian");
    }

    // Optional: prevent same person for both roles
    // console.log("owner.NOREG", owner.NOREG)
    // console.log("cust.NOREG", cust.NOREG)
    if (owner.NOREG === cust.NOREG) {
      // console.log("masuk nih")
      throw new ApplicationError(ERROR_CODES.VAL_INVALID_FORMAT, "Owner and Custodian must be different users");
    }

    // 3) Security center validity
    if (!(await repo.isValidSecurityCenter(input.SECURITY_CENTER))) {
      throw new ApplicationError(ERROR_CODES.APP_INVALID_DATA, "Invalid Security Center");
    }
    publishMonitoringLog(globalThis.app as any, {
      userId,
      module: "APPLICATION",
      action: "APPLICATION_CREATE",
      status: "Success",
      description: `Create application ${input.APPLICATION_NAME}`,
      location: "/applications"
    }).catch(e => console.warn({ e, reqId }, "monitoring log failed"));

    return repo.create(input as any);
  },

  async update(id: string, updates: Partial<{
    APPLICATION_NAME: string;
    DIVISION_ID_OWNER: string;
    NOREG_SYSTEM_OWNER: string;
    NOREG_SYSTEM_CUST: string;
    SECURITY_CENTER: string;
    APPLICATION_STATUS: "Aktif" | "Inactive";
  }>) {
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
      if (!owner.canBeOwner) {
        throw new ApplicationError(ERROR_CODES.VAL_INVALID_FORMAT, "Selected Owner is not eligible as Owner");
      }
      if (updates.NOREG_SYSTEM_CUST && updates.NOREG_SYSTEM_CUST === updates.NOREG_SYSTEM_OWNER) {
        throw new ApplicationError(ERROR_CODES.VAL_INVALID_FORMAT, "Owner and Custodian must be different users");
      }
    }

    if (updates.NOREG_SYSTEM_CUST) {
      const cust = await repo.getUserByNoreg(updates.NOREG_SYSTEM_CUST);
      if (!cust) {
        throw new ApplicationError(ERROR_CODES.APP_INVALID_DATA, "System Custodian NOREG not found");
      }
      if (!cust.canBeCustodian) {
        throw new ApplicationError(ERROR_CODES.VAL_INVALID_FORMAT, "Selected Custodian is not eligible as Custodian");
      }
    }

    if (updates.SECURITY_CENTER) {
      const valid = await repo.isValidSecurityCenter(updates.SECURITY_CENTER);
      if (!valid) {
        throw new ApplicationError(ERROR_CODES.APP_INVALID_DATA, "Invalid Security Center");
      }
    }

    const updated = await repo.update(id, updates as any);
    if (!updated) {
      throw new ApplicationError(ERROR_CODES.APP_UPDATE_FAILED, "Failed to update application");
    }
    publishMonitoringLog(globalThis.app as any, {
      userId,
      module: "APPLICATION",
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
