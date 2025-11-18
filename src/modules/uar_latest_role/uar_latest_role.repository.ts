import { prisma } from "../../db/prisma";

// Check if Prisma model exists
if (!prisma.tB_M_UAR_LATEST_ROLE) {
  throw new Error(
    "Prisma model 'tB_M_UAR_LATEST_ROLE' is not available. " +
    "Please run 'npx prisma generate' in the prisma/sar directory and restart the server."
  );
}

// Valid sort fields
const VALID_SORT_FIELDS = [
  "APPLICATION_ID",
  "USERNAME",
  "NOREG",
  "NAME",
  "ROLE_ID",
  "ROLE_DESCRIPTION",
  "DIVISION_ID",
  "DIVISION_NAME",
  "DEPARTMENT_ID",
  "DEPARTMENT_NAME",
  "POSITION_TITLE",
  "CREATED_BY",
  "CREATED_DT",
  "CHANGED_BY",
  "CHANGED_DT",
  "NAME_APP",
  "ROLE_NAME",
] as const;

type ListParams = {
  page: number;
  limit: number;
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

// Fields to select for list query (optimized - only needed fields)
const LIST_SELECT_FIELDS = {
  APPLICATION_ID: true,
  USERNAME: true,
  NOREG: true,
  NAME: true,
  ROLE_ID: true,
  ROLE_DESCRIPTION: true,
  DIVISION_ID: true,
  DIVISION_NAME: true,
  DEPARTMENT_ID: true,
  DEPARTMENT_NAME: true,
  POSITION_TITLE: true,
  CREATED_BY: true,
  CREATED_DT: true,
  CHANGED_BY: true,
  CHANGED_DT: true,
  NAME_APP: true,
  ROLE_NAME: true,
} as const;

// Fields to select for detail query
const DETAIL_SELECT_FIELDS = {
  APPLICATION_ID: true,
  USERNAME: true,
  NOREG: true,
  NAME: true,
  ROLE_ID: true,
  ROLE_DESCRIPTION: true,
  DIVISION_ID: true,
  DIVISION_NAME: true,
  DEPARTMENT_ID: true,
  DEPARTMENT_NAME: true,
  POSITION_TITLE: true,
  CREATED_BY: true,
  CREATED_DT: true,
  CHANGED_BY: true,
  CHANGED_DT: true,
  NAME_APP: true,
  ROLE_NAME: true,
} as const;

function validateSortBy(sortBy: string | undefined): string {
  if (!sortBy) return "CREATED_DT";
  const upperSortBy = sortBy.toUpperCase();
  return VALID_SORT_FIELDS.includes(upperSortBy as any) ? upperSortBy : "CREATED_DT";
}

function buildWhereClause(params: {
  applicationId?: string;
  username?: string;
  noreg?: string;
  roleId?: string;
  divisionId?: number;
  departmentId?: number;
  search?: string;
}) {
  const where: any = {};

  if (params.applicationId?.trim()) {
    where.APPLICATION_ID = params.applicationId.trim();
  }

  if (params.username?.trim()) {
    where.USERNAME = { contains: params.username.trim() };
  }

  if (params.noreg?.trim()) {
    where.NOREG = params.noreg.trim();
  }

  if (params.roleId?.trim()) {
    where.ROLE_ID = params.roleId.trim();
  }

  if (params.divisionId != null && params.divisionId > 0) {
    where.DIVISION_ID = params.divisionId;
  }

  if (params.departmentId != null && params.departmentId > 0) {
    where.DEPARTMENT_ID = params.departmentId;
  }

  if (params.search?.trim()) {
    const searchTerm = params.search.trim();
    where.OR = [
      { USERNAME: { contains: searchTerm } },
      { NOREG: { contains: searchTerm } },
      { NAME: { contains: searchTerm } },
      { ROLE_ID: { contains: searchTerm } },
      { ROLE_DESCRIPTION: { contains: searchTerm } },
      { DIVISION_NAME: { contains: searchTerm } },
      { DEPARTMENT_NAME: { contains: searchTerm } },
      { POSITION_TITLE: { contains: searchTerm } },
    ];
  }

  return where;
}

export const uarLatestRoleRepository = {
  async list(params: ListParams) {
    const {
      page,
      limit,
      sortBy = "CREATED_DT",
      order = "desc",
      ...filters
    } = params;

    // Validate and normalize inputs
    const validatedSortBy = validateSortBy(sortBy);
    const validatedOrder = order === "asc" ? "asc" : "desc";
    const validatedPage = Math.max(1, Math.floor(page));
    const validatedLimit = Math.min(Math.max(1, Math.floor(limit)), 1000); // Max 1000 per page
    const skip = (validatedPage - 1) * validatedLimit;

    const where = buildWhereClause(filters);

    // Optimized query with select specific fields only
    const [data, total] = await Promise.all([
      prisma.tB_M_UAR_LATEST_ROLE.findMany({
        where,
        select: LIST_SELECT_FIELDS,
        skip,
        take: validatedLimit,
        orderBy: {
          [validatedSortBy]: validatedOrder,
        },
      }),
      prisma.tB_M_UAR_LATEST_ROLE.count({ where }),
    ]);

    return { data, total };
  },

  async getById(applicationId: string, username: string, roleId: string) {
    // Validate inputs
    if (!applicationId?.trim() || !username?.trim() || !roleId?.trim()) {
      return null;
    }

    return prisma.tB_M_UAR_LATEST_ROLE.findFirst({
      where: {
        APPLICATION_ID: applicationId.trim(),
        USERNAME: username.trim(),
        ROLE_ID: roleId.trim(),
      },
      select: DETAIL_SELECT_FIELDS,
    });
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
    const where = buildWhereClause(filters);

    // Optimized query with select specific fields only
    return prisma.tB_M_UAR_LATEST_ROLE.findMany({
      where,
      select: LIST_SELECT_FIELDS,
      orderBy: {
        CREATED_DT: "desc",
      },
    });
  },
};

