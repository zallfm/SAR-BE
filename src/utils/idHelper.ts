import { LogEntry } from "../types/log_monitoring";

const BASE_PREFIX = "SAR";

export function generateID(
  appId: string,
  divisionId: string,
  todayIds: string[],
  padLength: number = 4
): string {
  const sectionPrefix = `${BASE_PREFIX}${appId}${divisionId}`;

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const datePart = `${year}${month}${day}`;

  const fullPrefix = `${sectionPrefix}${datePart}`;

  const lastId = todayIds
    .filter((id) => id.startsWith(fullPrefix))
    .sort((a, b) => b.localeCompare(a))[0];

  let nextNumber = 1;
  if (lastId) {
    try {
      const lastNumStr = lastId.slice(-padLength);
      const lastNum = parseInt(lastNumStr);

      if (!isNaN(lastNum)) {
        nextNumber = lastNum + 1;
      }
    } catch (e) {
      console.error("Error parsing last ID number:", e);
    }
  }

  const paddedNumber = String(nextNumber).padStart(padLength, "0");
  return `${fullPrefix}${paddedNumber}`;
}
let seqCounter = 0;
export function generateProcessId() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const seq = String(seqCounter++).padStart(5, "0"); // 00001, 00002, ...
  return `${yyyy}${mm}${dd}${seq}`;
}

export const toGB = (d: Date) =>
  new Intl.DateTimeFormat('en-GB', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false, timeZone: 'Asia/Jakarta'
  }).format(d).replace(',', '');
export const normalizeStatus = (s?: string): LogEntry["STATUS"] => {
  if (!s) return "Success";
  const v = String(s).toLowerCase().trim();
  if (v === "success") return "Success";
  if (v === "failure" || v === "error") return "Error";
  if (v === "warning") return "Warning";
  if (v === "inprogress" || v === "in progress") return "InProgress";
  // fallback aman
  return "Success";
};
