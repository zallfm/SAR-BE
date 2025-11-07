import type { FastifySchema } from "fastify";


const UarHeaderItemSchema = {
    type: "object",
    properties: {
        uarId: { type: "string" },
        uarPeriod: { type: "string" },
        applicationId: { type: "string" },
        applicationName: { type: "string" },
        percentComplete: { type: "string" },
        createdDate: { type: "string" },
        completedDate: { type: ["string", "null"] },
        status: { type: ["string", "null"], enum: ["1", "0", null] }, // 1 = Complete, 0 = In Progress
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
            applicationId: { type: "string", description: "Filter by a specific Application ID" },
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
            uarId: { type: "string", description: "The UAR_ID" },
            applicationId: { type: "string", description: "The Application_ID" },
        },
        required: ["uarId", "applicationId"],
    },
    response: {
        200: {
            type: "object",
            properties: {
                // Define the schema for a single TB_R_UAR_DIVISION_USER item
                data: {
                    type: "object",
                    properties: {
                        systemOwnerUsers: { type: "array", items: { type: "object", additionalProperties: true } },
                        divisionUsers: { type: "array", items: { type: "object", additionalProperties: true } },
                    }
                },
            },
        },
    },
};

export const batchUpdateSchema: FastifySchema = {
    body: {
        type: "object",
        properties: {
            uarId: { type: "string" },
            applicationId: { type: "string" },
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
        required: ["uarId", "applicationId", "items"],
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

// In uar_system_owner.schema.ts

export const addCommentSchema: FastifySchema = {
    body: {
        type: "object",
        properties: {
            uarId: { type: "string" },
            applicationId: { type: "string" },
            comments: { type: "string", minLength: 1 }, // Requires a non-empty comment
            items: {
                type: "array",
                minItems: 1, // Must select at least one item
                items: {
                    type: "object",
                    properties: {
                        username: { type: "string" },
                        roleId: { type: "string" },
                    },
                    required: ["username", "roleId"],
                },
            },
        },
        required: ["uarId", "applicationId", "comments", "items"],
    },
    response: {
        200: {
            type: "object",
            properties: {
                message: { type: "string" },
                data: {
                    type: "object",
                    properties: {
                        count: { type: "number" }
                    }
                },
            },
        },
    },
};