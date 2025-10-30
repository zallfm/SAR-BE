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
  const now = new Date();
  const processId = String(generateProcessId());

  const newLog: LogEntry = {
    NO: 0, // repo/DB yang set auto-number
    PROCESS_ID: processId,
    USER_ID: String(input.userId ?? "anonymous"),
    MODULE: String(input.module ?? "Unknown"),
    FUNCTION_NAME: String(input.action ?? "Unknown"),
    START_DATE: toGB(input.timestamp ?? now),
    END_DATE: toGB(now),
    STATUS: normalizeStatus(input.status ?? "Success"),
    DETAILS: [
      {
        ID: 1,
        PROCESS_ID: processId,
        MESSAGE_DATE_TIME: toGB(now),
        LOCATION: String(input.location ?? input.module ?? "Unknown"),
        MESSAGE_DETAIL: String(input.description ?? "Action logged"),
      },
    ],
  };

  await logRepository.insertLog(newLog);
  return newLog;
}
