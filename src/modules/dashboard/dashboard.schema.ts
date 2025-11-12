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
            DIVISION_ID: { type: "number" },
            DIVISION_NAME: { type: "string" }
        }
    }
};

const DepartmentOptionsSchema = {
    type: "array",
    items: {
        type: "object",
        properties: {
            DEPARTMENT_ID: { type: "number" },
            DEPARTMENT_NAME: { type: "string" }
        }
    }
};

const ApplicationOptionsSchema = {
    type: "array",
    items: {
        type: "object",
        properties: {
            APPLICATION_ID: { type: "string" },
            APPLICATION_NAME: { type: "string" }
        }
    }
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



