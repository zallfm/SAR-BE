import type { FastifySchema } from "fastify";


const UarHeaderItemSchema = {
    type: "object",
    properties: {
        uarId: { type: "string" },
        uarPeriod: { type: "string" },
        applicationId: { type: "string" },
        divisionId: { type: "number" },
        divisionOwner: { type: "string" },
        percentComplete: { type: "string" },
        createdDate: { type: "string" },
        completedDate: { type: ["string", "null"] },
        status: { type: ["string", "null"], enum: ["1", "0", null] }, // 1 = Complete, 0 = In Progress
        source: { type: "string" }
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
            status: {
                type: "string",
                enum: ['InProgress', 'Finished'],
                description: "Filter by completion status"
            },
            createdDate: {
                type: "string",
                format: "date",
                description: "Filter by workflow creation date (YYYY-MM-DD)"
            },
            completedDate: {
                type: "string",
                format: "date",
                description: "Filter by workflow completion date (YYYY-MM-DD)"
            },
            divisionId: {
                type: "number",
                description: "Filter by Division ID"
            },
            reviewStatus: {
                type: "string",
                enum: ['pending', 'reviewed'],
                description: "Filter by review status"
            },
            noreg: {
                type: "string",
                description: "Filter by Reviewer NOREG"
            }
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
export const getUarExcelSchema: FastifySchema = {
    params: {
        type: "object",
        properties: {
            uarId: { type: "string", description: "The UAR_ID" },
            applicationId: { type: "string", description: "The Application_ID" },
        },
        required: ["uarId", "applicationId"],
        additionalProperties: false,
    },
    response: {
        200: {
            type: "object",
            properties: {
                data: {
                    type: "object",
                    properties: {
                        header: {
                            type: "object",
                            description: "UAR header summary",
                            properties: {
                                uarId: { type: "string" },
                                uarPeriod: { type: ["string", "null"] }, // bisa null kalau tidak ada detail
                                applicationId: { type: "string" },
                                applicationName: { type: ["string", "null"] },
                                divisionName: { type: ["string", "null"] },
                                departmentName: { type: ["string", "null"] },
                                percentComplete: { type: "string" },           // contoh: "33% (1 of 3)"
                                createdDate: { type: ["string", "null"], format: "date-time" },
                                completedDate: { type: ["string", "null"], format: "date-time" },
                                status: { type: "string", enum: ["0", "1", "2"] }, // 0=belum,1=progres,2=complete
                            },
                            required: ["uarId", "applicationId", "percentComplete", "status"],
                            additionalProperties: false,
                        },
                        systemOwnerUsers: {
                            type: "array",
                            items: { type: "object", additionalProperties: true },
                            description: "Detail baris System Owner",
                        },
                        divisionUsers: {
                            type: "array",
                            items: { type: "object", additionalProperties: true },
                            description: "Detail baris Division User (yang headernya approved)",
                        },
                    },
                    required: ["header", "systemOwnerUsers", "divisionUsers"],
                    additionalProperties: false,
                },
            },
            required: ["data"],
            additionalProperties: false,
        },

        // Opsional: definisikan bentuk error standar kamu biar konsisten
        403: {
            type: "object",
            properties: {
                success: { type: "boolean", const: false },
                message: { type: "string" },
                data: { type: ["object", "null"] },
                statusCode: { type: "number", const: 403 },
            },
            required: ["success", "message", "statusCode"],
            additionalProperties: true,
        },
        404: {
            type: "object",
            properties: {
                success: { type: "boolean", const: false },
                message: { type: "string" },
                data: { type: ["object", "null"] },
                statusCode: { type: "number", const: 404 },
            },
            required: ["success", "message", "statusCode"],
            additionalProperties: true,
        },
    },
};

export const batchUpdateSchema: FastifySchema = {
    body: {
        type: "object",
        properties: {
            uarId: { type: "string" },
            applicationId: { type: "string" },
            source: { type: "string" },
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
                data: {
                    type: "object",
                    properties: {
                        userUpdateResult: {
                            type: "object",
                            properties: { count: { type: "number" } }
                        },
                        workflowUpdateResult: {
                            type: "object",
                            properties: { count: { type: "number" } }
                        }
                    }
                },
            },
        },
    },
};

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