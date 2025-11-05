import { logRepository } from "./log_monitoring.repository"; // atau path repo kamu
import { generateProcessId, normalizeStatus, toGB } from "../../utils/idHelper";
export async function publishMonitoringLog(app, input) {
    const startAt = input.timestamp ?? new Date();
    const endAt = new Date();
    const processId = String(generateProcessId());
    // console.log("toGB(startAt)", toGB(startAt))
    // console.log("toGB(endAt)", toGB(endAt))
    const newLog = {
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
    await logRepository.insertLog(newLog);
    return newLog;
}
