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
