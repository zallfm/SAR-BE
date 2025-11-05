const monthNameToNumber: { [key: string]: string } = {
  january: "01",
  jan: "01",
  february: "02",
  feb: "02",
  march: "03",
  mar: "03",
  april: "04",
  apr: "04",
  may: "05",
  june: "06",
  jun: "06",
  july: "07",
  jul: "07",
  august: "08",
  aug: "08",
  september: "09",
  sep: "09",
  october: "10",
  oct: "10",
  november: "11",
  nov: "11",
  december: "12",
  dec: "12",
};

const monthNumberToName: { [key: string]: string } = {
  "01": "January",
  "02": "February",
  "03": "March",
  "04": "April",
  "05": "May",
  "06": "June",
  "07": "July",
  "08": "August",
  "09": "September",
  "10": "October",
  "11": "November",
  "12": "December",
};

/**
 * Converts a display date string (e.g., "07 June") to "dd/mm" format.
 * If the string is already in "dd/mm" format, it ensures padding and returns it.
 * @param dateStr - The date string to format.
 * @returns The date string in "dd/mm" format, or an empty string if invalid.
 */
export const formatDisplayDateToDdMm = (dateString: string): string => {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "";

  const options: Intl.DateTimeFormatOptions = {
    month: 'long',
    day: '2-digit',
  };

  return date.toLocaleString('en-GB', options);
};

/**
 * Converts a "dd/mm" date string to "dd Month" format (e.g., "10/12" to "10 Desember").
 * @param ddMm - The date string in "dd/mm" format.
 * @returns The date string in "dd Month" format, or the original string if invalid.
 */
export const formatDdMmToDisplayDate = (ddMm: string): string => {
  if (!isValidDdMm(ddMm)) return ddMm;
  const [day, month] = ddMm.split("/");
  const monthName = monthNumberToName[month.padStart(2, "0")];
  if (monthName) {
    return `${parseInt(day, 10)} ${monthName}`;
  }
  return ddMm;
};

/**
 * Validates if a string is in "dd/mm" format and represents a plausible date.
 * @param ddMm - The string to validate.
 * @returns True if valid, false otherwise.
 */
export const isValidDdMm = (ddMm: string): boolean => {
  if (!ddMm) return false;
  const trimmedDdMm = ddMm.trim();
  if (!/^\d{1,2}\/\d{1,2}$/.test(trimmedDdMm)) return false;

  const parts = trimmedDdMm.split("/");
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);

  if (isNaN(day) || isNaN(month)) return false;

  return day > 0 && day <= 31 && month > 0 && month <= 12;
};



/**
 * Validates if UAR date is after Sync End date.
 * @param syncEndDate - The sync end date in "dd/mm" format.
 * @param uarDate - The UAR date in "dd/mm" format.
 * @returns True if UAR date is after sync end date, false otherwise.
 */
const parseDdMm = (dateStr: string): number => {
  const [day, month] = dateStr.split("/").map(Number);
  return month * 100 + day;
};

// --- NEW "IN BETWEEN" FUNCTION ---
/**
 * Checks if a date is between two other dates (inclusive).
 * All dates are "DD/MM" format.
 */
const isDateBetween = (
  startDate: string,
  endDate: string,
  checkDate: string
): boolean => {
  const start = parseDdMm(startDate);
  const end = parseDdMm(endDate);
  const check = parseDdMm(checkDate);

  if (start <= end) {
    // Normal range (e.g., 01/03 to 01/05)
    // Check is between start AND end
    return check >= start && check <= end;
  } else {
    // Year-crossing range (e.g., 10/12 to 10/01)
    // Check is after start OR before end
    return check >= start || check <= end;
  }
};

// --- UPDATED isUarDateValid FUNCTION ---
/**
 * Checks if the UAR date is VALID.
 * A date is considered INVALID if it falls between the sync start and end dates.
 * @param syncStartDate - "DD/MM"
 * @param syncEndDate - "DD/MM"
 * @param uarDate - "DD/MM"
 * @returns {boolean} - `true` if valid (outside range), `false` if invalid (inside range).
 */

export const formatDateTimeToDdMm = (dateInput: string | Date): string => {
  const date = new Date(dateInput);

  // Check if the date is valid
  if (isNaN(date.getTime())) {
    return "";
  }

  // getMonth() is 0-indexed (0=Jan, 11=Dec), so we add 1.
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");

  return `${day}/${month}`;
};

export const isUarDateValid = (
  syncStartDate: string,
  syncEndDate: string,
  uarDate: string
): boolean => {
  // If any date is not in the correct "DD/MM" format, consider it valid to avoid blocking the user.
  if (
    !isValidDdMm(syncStartDate) ||
    !isValidDdMm(syncEndDate) ||
    !isValidDdMm(uarDate)
  ) {
    return true;
  }

  // The date is INVALID if it's in between.
  // So, the function should return the opposite of isDateBetween.
  return !isDateBetween(syncStartDate, syncEndDate, uarDate);
};
export const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "";

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${day}-${month}-${year}`;
};

export const formatDateTime = (dateString: string | null) => {
  if (dateString) {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";

    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");

    return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
  } else {
    return ""
  }

};
