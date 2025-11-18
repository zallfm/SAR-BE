import type { FastifySchema } from "fastify";

const UarLatestRoleItemSchema = {
  type: "object",
  properties: {
    APPLICATION_ID: { type: "string" },
    USERNAME: { type: "string" },
    NOREG: { type: ["string", "null"] },
    NAME: { type: ["string", "null"] },
    ROLE_ID: { type: "string" },
    ROLE_DESCRIPTION: { type: ["string", "null"] },
    DIVISION_ID: { type: ["number", "null"] },
    DIVISION_NAME: { type: ["string", "null"] },
    DEPARTMENT_ID: { type: ["number", "null"] },
    DEPARTMENT_NAME: { type: ["string", "null"] },
    POSITION_TITLE: { type: ["string", "null"] },
    CREATED_BY: { type: "string" },
    CREATED_DT: { type: "string", format: "date-time" },
    CHANGED_BY: { type: ["string", "null"] },
    CHANGED_DT: { type: ["string", "null"], format: "date-time" },
    NAME_APP: { type: ["string", "null"] },
    ROLE_NAME: { type: ["string", "null"] },
  },
};

export const listUarLatestRoleSchema: FastifySchema = {
  tags: ['UAR Latest Role'],
  description: 'Get list of UAR latest role data with pagination and filtering',
  summary: 'List UAR Latest Role',
  querystring: {
    type: "object",
    properties: {
      page: { type: "number", minimum: 1, default: 1 },
      limit: { type: "number", minimum: 1, maximum: 1000, default: 10 },
      applicationId: { type: "string", maxLength: 20 },
      username: { type: "string", maxLength: 70 },
      noreg: { type: "string", maxLength: 8 },
      roleId: { type: "string", maxLength: 50 },
      divisionId: { type: "number", minimum: 1 },
      departmentId: { type: "number", minimum: 1 },
      search: { type: "string", maxLength: 255 },
      sortBy: {
        type: "string",
        enum: [
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
        ],
        default: "CREATED_DT",
      },
      order: { type: "string", enum: ["asc", "desc"], default: "desc" },
    },
  },
  security: [{ bearerAuth: [] }],
  response: {
    200: {
      type: "object",
      properties: {
        data: { type: "array", items: UarLatestRoleItemSchema },
        meta: {
          type: "object",
          properties: {
            page: { type: "integer" },
            limit: { type: "integer" },
            total: { type: "integer" },
          },
        },
      },
    },
  },
};

export const getUarLatestRoleDetailSchema: FastifySchema = {
  tags: ['UAR Latest Role'],
  description: 'Get detail of a specific UAR latest role by composite key',
  summary: 'Get UAR Latest Role Detail',
  params: {
    type: "object",
    properties: {
      applicationId: { type: "string", minLength: 1, maxLength: 20 },
      username: { type: "string", minLength: 1, maxLength: 70 },
      roleId: { type: "string", minLength: 1, maxLength: 50 },
    },
    required: ["applicationId", "username", "roleId"],
  },
  security: [{ bearerAuth: [] }],
  response: {
    200: {
      type: "object",
      properties: {
        data: UarLatestRoleItemSchema,
      },
    },
    404: {
      type: "object",
      properties: {
        message: { type: "string" },
      },
    },
  },
};

export const exportUarLatestRoleExcelSchema: FastifySchema = {
  tags: ['UAR Latest Role'],
  description: 'Export UAR latest role data to Excel file with filtering',
  summary: 'Export UAR Latest Role to Excel',
  querystring: {
    type: "object",
    properties: {
      applicationId: { type: "string", maxLength: 20 },
      username: { type: "string", maxLength: 70 },
      noreg: { type: "string", maxLength: 8 },
      roleId: { type: "string", maxLength: 50 },
      divisionId: { type: "number", minimum: 1 },
      departmentId: { type: "number", minimum: 1 },
      search: { type: "string", maxLength: 255 },
    },
  },
  security: [{ bearerAuth: [] }],
};

