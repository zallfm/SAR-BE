import type { FastifySchema } from "fastify";


const UarHeaderItemSchema = {
  type: "object",
  properties: {
    uarId: { type: "string" },
    uarPeriod: { type: "string" },
    divisionOwner: { type: "string" },
    percentComplete: { type: "string" },
    createdDate: { type: "string" },
    completedDate: { type: ["string", "null"] },
    status: { type: ["string", "null"], enum: ["1", "0", null] },
  },
};

export const listUarSchema: FastifySchema = {
  querystring: {
    type: "object",
    properties: {
      page: { type: "number", default: 1 },
      limit: { type: "number", default: 10 },
      period: { type: "string", description: "Filter by UAR Period (YYYYMM)" },
      uarId: { type: "string", description: "Filter by UAR ID (contains)" },
    },
  },
  response: {
    200: {
      type: "object",
      properties: {
        data: { type: "array", items: UarHeaderItemSchema },
        meta: {
          page: { type: "integer" },
          limit: { type: "integer" },
          total: { type: "integer" },
        }
      },
    },
  },
};

export const getUarDetailsSchema: FastifySchema = {
  params: {
    type: "object",
    properties: {
      id: { type: "string", description: "The UAR_ID" },
    },
    required: ["id"],
  },
  response: {
    200: {
      type: "object",
      properties: {
        // Define the schema for a single TB_R_UAR_DIVISION_USER item
        data: { type: "array", items: { type: "object", additionalProperties: true } },
      },
    },
  },
};

export const getUarSchema: FastifySchema = {
  params: {
    type: "object",
    properties: {
      id: { type: "string", description: "UAR_ID" },
    },
    required: ["id"],
    additionalProperties: false,
  },
  response: {
    200: {
      type: "object",
      properties: {
        data: {
          type: "object",
          properties: {
            header: { type: ["object", "null"], additionalProperties: true },
            details: {
              type: "array",
              items: { type: "object", additionalProperties: true },
            },
          },
          required: ["header", "details"],
          additionalProperties: false,
        },
      },
      required: ["data"],
      additionalProperties: false,
    },
  },
};

export const batchUpdateSchema: FastifySchema = {
  body: {
    type: "object",
    properties: {
      uarId: { type: "string" },
      comments: { type: "string" },
      items: {
        type: "array",
        minItems: 1,
        items: {
          type: "object",
          properties: {
            username: { type: "string" },
            roleId: { type: "string" },
            decision: { type: "string", enum: ["Approved", "Revoked"] }
          },
          required: ["username", "roleId", "decision"],
        },
      },
    },
    required: ["uarId", "items"],
  },
  response: {
    200: {
      type: "object",
      properties: {
        message: { type: "string" },
        data: { type: "object", additionalProperties: true },
      },
    },
  },
};

export const exportUarExcelSchema = {
  description: "Export template UAR Division (cek tampilan)",
  tags: ["UAR Division"],
  querystring: {
    type: "object",
    properties: {
      uar_id: { type: "string", description: "ID UAR" },
      type: {
        type: "string",
        description: "Tipe export",
        enum: ["div_user", "so_user"],
        default: "div_user"
      }
    },
    required: ["uar_id"],
    additionalProperties: false,
  },
  response: {
    200: { type: "string", format: "binary" },
  },
} as const;

