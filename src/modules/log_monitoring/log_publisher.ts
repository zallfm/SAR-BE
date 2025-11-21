import type { FastifyInstance } from "fastify";
import { logRepository } from "./log_monitoring.repository"; // atau path repo kamu
import { LogEntry } from "../../types/log_monitoring";
import { generateProcessId, normalizeStatus, toGB } from "../../utils/idHelper";
// import type { LogEntry } from "./types";                      // sesuaikan
// import { generateProcessId, toGB, normalizeStatus } from "./utils"; // sesuaikan

type PublishLogInput = {
  userId?: string;
  module?: string;          // contoh: "authentication"
  action?: string;          // contoh: "LOGIN_SUCCESS" | "LOGIN_FAILED"
  status?: "Success" | "Error" | string;
  description?: string;     // detail message
  location?: string;        // URL/page
  timestamp?: Date;         // optional
};

export async function publishMonitoringLog(app: FastifyInstance, input: PublishLogInput) {
  const startAt = input.timestamp ?? new Date();
  const endAt = new Date();
  const processId = String(generateProcessId());
  // console.log("toGB(startAt)", toGB(startAt))
  // console.log("toGB(endAt)", toGB(endAt))

  const newLog: LogEntry = {
    NO: 0,
    PROCESS_ID: processId,
    USER_ID: String(input.userId ?? "anonymous"),
    MODULE: String(input.module ?? "Unknown"),
    FUNCTION_NAME: String(input.action ?? "Unknown"),
    START_DATE: toGB(startAt),
    END_DATE: toGB(endAt),
    STATUS: normalizeStatus(input.status ?? "Success"),
    DETAILS: [
      {
        ID: 1,
        PROCESS_ID: processId,
        MESSAGE_DATE_TIME: toGB(new Date()),
        LOCATION: String(input.location ?? input.module ?? "Unknown"),
        MESSAGE_DETAIL: String(input.description ?? "Action logged"),
        MESSAGE_ID: undefined,
        MESSAGE_TYPE: undefined
      },
    ],
  };
  // console.log("newLog di pulisher", newLog)

  // Fire-and-forget: don't await, let it run in background
  // This prevents blocking the main request flow
  await logRepository.insertLog(newLog).catch((err) => {
    app.log.warn({ err, processId }, "Failed to insert monitoring log (non-blocking)");
  });
  // console.log("newLog", newLog)
  return newLog;
}
