import { uarLatestRoleRepository } from "./uar_latest_role.repository";

type ListParams = {
  page?: number;
  limit?: number;
  applicationId?: string;
  username?: string;
  noreg?: string;
  roleId?: string;
  divisionId?: number;
  departmentId?: number;
  search?: string;
  sortBy?: string;
  order?: "asc" | "desc";
};

export const uarLatestRoleService = {
  async list(params: ListParams) {
    // Validation already done in controller, but ensure defaults
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(Math.max(1, params.limit ?? 10), 1000);

    return uarLatestRoleRepository.list({
      page,
      limit,
      applicationId: params.applicationId,
      username: params.username,
      noreg: params.noreg,
      roleId: params.roleId,
      divisionId: params.divisionId,
      departmentId: params.departmentId,
      search: params.search,
      sortBy: params.sortBy,
      order: params.order,
    });
  },

  async getById(applicationId: string, username: string, roleId: string) {
    // Input validation already done in controller
    return uarLatestRoleRepository.getById(applicationId, username, roleId);
  },

  async getAllForExport(filters: {
    applicationId?: string;
    username?: string;
    noreg?: string;
    roleId?: string;
    divisionId?: number;
    departmentId?: number;
    search?: string;
  }) {
    // Input validation already done in controller
    return uarLatestRoleRepository.getAllForExport(filters);
  },
};

