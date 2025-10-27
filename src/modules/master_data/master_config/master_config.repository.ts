export const systemSchema = {
  body: {
    type: "object",
    required: [
      "SYSTEM_TYPE",
      "SYSTEM_CD",
      "VALID_FROM_DT",
      "VALID_TO_DT",
      "CREATED_BY",
      "CREATED_DT",
    ],
    properties: {
      SYSTEM_TYPE: { type: "string", maxLength: 30 },
      SYSTEM_CD: { type: "string", maxLength: 30 },
      VALID_FROM_DT: { type: "string", format: "date-time" },
      VALID_TO_DT: { type: "string", format: "date-time" },
      VALUE_TEXT: { type: "string", maxLength: 255 },
      VALUE_NUM: { type: "number" },
      VALUE_TIME: { type: "string", format: "date-time" },
      CREATED_BY: { type: "string", maxLength: 20 },
      CREATED_DT: { type: "string", format: "date-time" },
      CHANGED_BY: { type: "string", maxLength: 20 },
      CHANGED_DT: { type: "string", format: "date-time" },
    },
    additionalProperties: false,
  },
} as const;
