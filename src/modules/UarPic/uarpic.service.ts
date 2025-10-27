import type { FastifyInstance } from "fastify";
import { ApplicationError } from "../../core/errors/applicationError";
import { ERROR_CODES } from "../../core/errors/errorCodes";
import { ERROR_MESSAGES } from "../../core/errors/errorMessages";
import { initialUarPic } from "./uarpic.repository";
import { UarPic } from "../../types/uarPic";
import { generateID } from "../../utils/idHelper";

function validateUarPicData(
  PIC_NAME: string,
  DIVISION_ID: number,
  MAIL: string
) {
  if (!MAIL.endsWith("@toyota.co.id")) {
    throw new ApplicationError(
      ERROR_CODES.VAL_INVALID_FORMAT,
      ERROR_MESSAGES[ERROR_CODES.VAL_INVALID_FORMAT],
      400
    );
  }
  if (/\d/.test(PIC_NAME)) {
    throw new ApplicationError(
      ERROR_CODES.VAL_INVALID_FORMAT,
      "PIC_NAME should not contain numbers",
      400
    );
  }
}

function dupeCheck(MAIL: string) {
  const duplicate = initialUarPic.find((item) => item.MAIL === MAIL);
  if (duplicate) {
    throw new ApplicationError(
      ERROR_CODES.APP_ALREADY_EXISTS,
      ERROR_MESSAGES[ERROR_CODES.APP_ALREADY_EXISTS] ||
        "UAR PIC with this MAIL already exists",
      400
    );
  }
}

export const uarPicService = {
  async getUarPics(app: FastifyInstance, query: any) {
    const {
      page = 1,
      limit = 10,
      divisionId, // Added for filtering
      q,
      pic_name,
      startDate,
      endDate,
      sortBy = "CREATED_DT", // Changed default to CREATED_DT
      order = "desc",
    } = query;

    let rows: UarPic[] = initialUarPic.slice();

    // Filter by divisionId
    if (divisionId) {
      rows = rows.filter((r) => r.DIVISION_ID === Number(divisionId));
      console.log("diveision", rows);
    }

    // Filter by general query 'q'
    if (q) {
      const s = String(q).toLowerCase();
      rows = rows.filter(
        (r) =>
          r.PIC_NAME.toLowerCase().includes(s) ||
          r.MAIL.toLowerCase().includes(s) ||
          r.ID.toLowerCase().includes(s)
      );
    }

    if (pic_name) {
      const s = String(pic_name).toLowerCase();
      rows = rows.filter((r) => r.PIC_NAME.toLowerCase().includes(s));
    }

    // Filter by date range (on CREATED_DT)
    if (startDate || endDate) {
      const start = startDate ? new Date(startDate).getTime() : null;
      // Set end date to end of the day to include all items on that day
      const end = endDate ? new Date(endDate).setHours(23, 59, 59, 999) : null;

      rows = rows.filter((r) => {
        const itemDate = new Date(r.CREATED_DT).getTime();
        if (start && itemDate < start) return false;
        if (end && itemDate > end) return false;
        return true;
      });
    }

    rows.sort((a, b) => {
      let va: number | string, vb: number | string;

      switch (sortBy) {
        case "DIVISION_ID":
          va = a.DIVISION_ID;
          vb = b.DIVISION_ID;
          break;
        case "PIC_NAME":
          va = a.PIC_NAME.toLowerCase();
          vb = b.PIC_NAME.toLowerCase();
          break;
        case "MAIL":
          va = a.MAIL.toLowerCase();
          vb = b.MAIL.toLowerCase();
          break;
        case "ID":
          va = a.ID;
          vb = b.ID;
          break;
        case "CREATED_DT":
        default: // Default to CREATED_DT
          va = new Date(a.CREATED_DT).getTime();
          vb = new Date(b.CREATED_DT).getTime();
          break;
      }

      let diff: number;
      if (typeof va === "string" && typeof vb === "string") {
        diff = va.localeCompare(vb);
      } else {
        diff = (va as number) - (vb as number);
      }

      return order === "asc" ? diff : -diff;
    });

    const total = rows.length;
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;
    const offset = (pageNum - 1) * limitNum;
    const data = rows.slice(offset, offset + limitNum);

    return {
      data: data,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.max(1, Math.ceil(total / limitNum)),
      },
    };
  },
  async createUarPic(
    app: FastifyInstance,
    PIC_NAME: string,
    DIVISION_ID: number,
    MAIL: string
  ) {
    dupeCheck(MAIL);
    validateUarPicData(PIC_NAME, DIVISION_ID, MAIL);
    const lowerCaseMail = MAIL.toLowerCase();
    const todayIds = initialUarPic
      .filter((item) => {
        const createdDate = new Date(item.CREATED_DT);
        const now = new Date();
        return (
          createdDate.getFullYear() === now.getFullYear() &&
          createdDate.getMonth() === now.getMonth() &&
          createdDate.getDate() === now.getDate()
        );
      })
      .map((item) => item.ID);

    const uarPicData = {
      ID: generateID("PIC", "CIO", todayIds),
      PIC_NAME,
      DIVISION_ID,
      MAIL: lowerCaseMail,
      CREATED_BY: "Hesti",
      CREATED_DT: new Date().toISOString(),
      CHANGED_BY: "Hesti",
      CHANGED_DT: null,
    };

    initialUarPic.push(uarPicData);

    return uarPicData;
  },

  async editUarPic(
    app: FastifyInstance,
    ID: string,
    PIC_NAME: string,
    DIVISION_ID: number,
    MAIL: string
  ) {
    const uarPic = initialUarPic.find((item) => item.ID === ID);

    if (!uarPic) {
      throw new ApplicationError(
        ERROR_CODES.APP_NOT_FOUND,
        ERROR_MESSAGES[ERROR_CODES.APP_NOT_FOUND],
        400
      );
    }

    validateUarPicData(PIC_NAME, DIVISION_ID, MAIL);
    if (uarPic.MAIL !== MAIL) {
      dupeCheck(MAIL);
    }
    const uarPicData = {
      ID,
      PIC_NAME,
      DIVISION_ID,
      MAIL,
      CHANGED_BY: "Hesti",
      CHANGED_DT: new Date().toISOString(),
    };

    Object.assign(uarPic, uarPicData);

    return uarPicData;
  },

  async deleteUarPic(app: FastifyInstance, ID: string) {
    const uarPicIndex = initialUarPic.findIndex((item) => item.ID === ID);

    if (uarPicIndex === -1) {
      throw new ApplicationError(
        ERROR_CODES.APP_NOT_FOUND,
        ERROR_MESSAGES[ERROR_CODES.APP_NOT_FOUND],
        400
      );
    }

    initialUarPic.splice(uarPicIndex, 1);

    return { message: `UAR PIC with ID ${ID} has been deleted.` };
  },

  async getRunningSchedules(app: FastifyInstance) {
    const today = new Date();
    const runningSchedules = initialUarPic.filter((item) => {
      const createdDate = new Date(item.CREATED_DT);
      return (
        createdDate.getFullYear() === today.getFullYear() &&
        createdDate.getMonth() === today.getMonth() &&
        createdDate.getDate() === today.getDate()
      );
    });
    console.log("Running Schedules:", runningSchedules);
    return runningSchedules;
  },
};
