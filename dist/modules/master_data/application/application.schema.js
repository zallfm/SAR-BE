const ApplicationItemSchema = {
    type: "object",
    additionalProperties: false,
    properties: {
        APPLICATION_ID: { type: "string" },
        APPLICATION_NAME: { type: "string" },
        DIVISION_ID_OWNER: { type: "string" },
        NOREG_SYSTEM_OWNER: { type: "string" },
        NOREG_SYSTEM_CUST: { type: "string" },
        SECURITY_CENTER: { type: "string" },
        APPLICATION_STATUS: { type: "string" },
        CREATED_BY: { type: "string" },
        CREATED_DT: { type: "string" },
        CHANGED_BY: { type: "string" },
        CHANGED_DT: { type: "string" },
    },
    required: [
        "APPLICATION_ID", "APPLICATION_NAME", "DIVISION_ID_OWNER",
        "NOREG_SYSTEM_OWNER", "NOREG_SYSTEM_CUST", "SECURITY_CENTER",
        "APPLICATION_STATUS", "CREATED_BY", "CREATED_DT", "CHANGED_BY", "CHANGED_DT"
    ],
};
export const listApplicationSchema = {
    querystring: { /* ... */},
    response: {
        200: {
            type: "object",
            properties: {
                data: { type: "array", items: ApplicationItemSchema },
                page: { type: "integer" },
                limit: { type: "integer" },
                total: { type: "integer" },
            },
            required: ["data", "page", "limit", "total"],
        },
    },
};
export const getByIdSchema = {
    params: { /* ... */},
    response: {
        200: {
            type: "object",
            properties: { data: ApplicationItemSchema },
            required: ["data"],
        },
    },
};
export const createApplicationSchema = {
    body: { /* ... */},
    response: {
        201: {
            type: "object",
            properties: {
                message: { type: "string" },
                data: ApplicationItemSchema,
            },
            required: ["message", "data"],
        },
    },
};
export const updateApplicationSchema = {
    params: { /* ... */},
    body: { /* ... */},
    response: {
        200: {
            type: "object",
            properties: {
                message: { type: "string" },
                data: ApplicationItemSchema,
            },
            required: ["message", "data"],
        },
    },
};
