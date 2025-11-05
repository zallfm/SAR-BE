export const uarPicSchema = {
    body: {
        type: "object",
        required: ["PIC_NAME", "DIVISION_ID", "MAIL"],
        properties: {
            ID: { type: "string" },
            PIC_NAME: { type: "string", maxLength: 30 },
            DIVISION_ID: { type: "number" },
            MAIL: { type: "string", maxLength: 50 },
            CREATED_BY: { type: "string", maxLength: 20 },
            CREATED_DT: { type: "string", format: "date-time" },
            CHANGED_BY: { type: "string", maxLength: 20 },
            CHANGED_DT: { type: "string", format: "date-time" },
        },
        additionalProperties: false,
    },
};
