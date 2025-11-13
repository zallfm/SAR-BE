import type { FastifySchema } from "fastify";






const KpiStatItemSchema = {
    type: "object",
    properties: {
        count: { type: "number" },
        percentage: { type: "number" },
    },
    required: ["count", "percentage"],
};

const KpiStatsSchema = {
    type: "object",
    properties: {
        total: { type: "number" },
        reviewed: KpiStatItemSchema,
        divApproved: KpiStatItemSchema,
        soApproved: KpiStatItemSchema,
        completed: KpiStatItemSchema,
    },
    required: ["total", "reviewed", "divApproved", "soApproved", "completed"],
};

const DivisionChartItemSchema = {
    type: "object",
    properties: {
        divisionId: { type: "number" },
        divisionName: { type: "string" },
        total: { type: "number" },
        reviewedCount: { type: "number" },
        divApprovedCount: { type: "number" },
        soApprovedCount: { type: "number" },
        completedCount: { type: "number" },
    },
    required: [
        "divisionId",
        "divisionName",
        "total",
        "reviewedCount",
        "divApprovedCount",
        "soApprovedCount",
        "completedCount"
    ],
};

const ApplicationChartItemSchema = {
    type: "object",
    properties: {
        applicationId: { type: "string" },
        applicationName: { type: "string" },
        total: { type: "number" },
        reviewedCount: { type: "number" },
        divApprovedCount: { type: "number" },
        soApprovedCount: { type: "number" },
        completedCount: { type: "number" },
    },
    required: [
        "applicationId",
        "applicationName",
        "total",
        "reviewedCount",
        "divApprovedCount",
        "soApprovedCount",
        "completedCount"
    ],
};

const PeriodOptionsSchema = {
    type: "array",
    items: { type: "string" }
};

const DivisionOptionsSchema = {
    type: "array",
    items: {
        type: "object",
        properties: {
            id: { type: "number" },
            name: { type: "string" }
        }
    }
};

const DepartmentOptionsSchema = {
    type: "array",
    items: {
        type: "object",
        properties: {
            id: { type: "number" },
            name: { type: "string" }
        }
    }
};

const ApplicationOptionsSchema = {
    type: "array",
    items: {
        type: "object",
        properties: {
            id: { type: "string" },
            name: { type: "string" }
        }
    }
};
const KpiDashboardStatItemSchema = {
    type: "object",
    properties: {
        count: { type: "number" },
        percentage: { type: "number" },
        trend: { type: "number" },
    },
    required: ["count", "percentage", "trend"],
};

const KpiDashboardTotalStatSchema = {
    type: "object",
    properties: {
        count: { type: "number" },
        trend: { type: "number" },
    },
    required: ["count", "trend"],
};



const AdminSoDashboardResponseSchema = {
    type: "object",
    properties: {
        total: KpiDashboardTotalStatSchema,
        approved: KpiDashboardStatItemSchema,
        revoked: KpiDashboardStatItemSchema,
        accessReviewComplete: KpiDashboardStatItemSchema,
    },

    required: ["total", "approved", "revoked", "accessReviewComplete"],

};

const DphKpiStatsResponseSchema = {
    type: "object",
    properties: {
        total: KpiDashboardTotalStatSchema,
        approved: KpiDashboardStatItemSchema,
        revoked: KpiDashboardStatItemSchema,
        accessReviewComplete: KpiDashboardStatItemSchema
    },
    required: ["total", "approved", "revoked", "accessReviewComplete"],
};



export const getAdminDashboardStatsSchema: FastifySchema = {
    querystring: {
        type: "object",
        properties: {
            period: { type: "string" },
            divisionId: { type: "number" },
            departmentId: { type: "number" },
            applicationId: { type: "string" },
        },
    },
    response: { 200: AdminSoDashboardResponseSchema },
};

export const getSoDashboardStatsSchema: FastifySchema = {
    querystring: {
        type: "object",
        properties: {
            period: { type: "string" },
            applicationId: { type: "string" },
        },
    },
    response: { 200: AdminSoDashboardResponseSchema },
};

export const getDphDashboardStatsSchema: FastifySchema = {
    querystring: {
        type: "object",
        properties: {
            period: { type: "string" },
            applicationId: { type: "string" },
        },
    },
    response: { 200: DphKpiStatsResponseSchema },
};


export const getPeriodOptionsSchema: FastifySchema = {
    response: { 200: PeriodOptionsSchema },
};

export const getDivisionOptionsSchema: FastifySchema = {
    response: { 200: DivisionOptionsSchema },
};

export const getDepartmentOptionsSchema: FastifySchema = {
    querystring: {
        type: 'object',
        properties: {
            divisionId: { type: 'number', description: 'The Division ID to filter by' }
        },
        required: ['divisionId']
    },
    response: { 200: DepartmentOptionsSchema },
};

export const getApplicationOptionsSchema: FastifySchema = {
    response: { 200: ApplicationOptionsSchema },
};


export const getDashboardStatsSchema: FastifySchema = {
    querystring: {
        type: "object",
        properties: {
            period: { type: "string", description: "Filter by UAR Period (YYYYMM)" },
            applicationId: { type: "string", description: "Filter by a specific Application ID (System)" },
        },
        additionalProperties: false,
    },
    response: {
        200: {
            type: "object",
            properties: {
                kpiStats: KpiStatsSchema,
                divisionChart: {
                    type: "array",
                    items: DivisionChartItemSchema,
                },
                applicationChart: {
                    type: "array",
                    items: ApplicationChartItemSchema,
                },
            },
            required: ["kpiStats", "divisionChart", "applicationChart"],
        },
    },
};



