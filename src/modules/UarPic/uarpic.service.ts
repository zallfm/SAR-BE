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
  async getUarPics(app: FastifyInstance) {
    const sortedUarPics = initialUarPic.sort((a, b) => {
      return (
        new Date(b.CREATED_DT).getTime() - new Date(a.CREATED_DT).getTime()
      );
    });
    return sortedUarPics;
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
