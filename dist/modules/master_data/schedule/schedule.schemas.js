export const scheduleSchema = {
    body: {
        type: "object",
        required: [
            "APPLICATION_ID",
            "SCHEDULE_SYNC_START_DT",
            "SCHEDULE_SYNC_END_DT",
            "SCHEDULE_UAR_DT",
        ],
        properties: {
            APPLICATION_ID: { type: "string", maxLength: 20 },
            SCHEDULE_SYNC_START_DT: { type: "string" },
            SCHEDULE_SYNC_END_DT: { type: "string" },
            SCHEDULE_UAR_DT: { type: "string" },
            SCHEDULE_STATUS: { type: "string", maxLength: 1 },
            CREATED_BY: { type: "string", maxLength: 50 },
            CREATED_DT: { type: "string", format: "date-time" },
            CHANGED_BY: { type: "string", maxLength: 50 },
            CHANGED_DT: { type: "string", format: "date-time" },
        },
        additionalProperties: false,
    },
};
