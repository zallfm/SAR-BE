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
export const listUarSchema = {
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
export const getUarDetailsSchema = {
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
export const batchUpdateSchema = {
    body: {
        type: "object",
        properties: {
            uarId: { type: "string" },
            decision: { type: "string", enum: ["Approve", "Revoke"] },
            comments: { type: "string" },
            items: {
                type: "array",
                minItems: 1,
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
        required: ["uarId", "decision", "items"],
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
