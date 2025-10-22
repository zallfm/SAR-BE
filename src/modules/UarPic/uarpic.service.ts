import type { FastifyInstance } from "fastify";
import { ApplicationError } from "../../core/errors/applicationError";
import { ERROR_CODES } from "../../core/errors/errorCodes";
import { ERROR_MESSAGES } from "../../core/errors/errorMessages";
import { initialUarPic } from "./uarpic.schemas";

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
}

export const uarPicService = {
  async createUarPic(
    app: FastifyInstance,
    PIC_NAME: string,
    DIVISION_ID: number,
    MAIL: string
  ) {
    validateUarPicData(PIC_NAME, DIVISION_ID, MAIL);
    const uarPicData = {
      PIC_ID: 1,
      PIC_NAME,
      DIVISION_ID,
      MAIL,
      CREATED_BY: "Hesti",
      CREATED_DT: new Date().toISOString(),
      CHANGED_BY: "Hesti",
      CHANGED_DT: null,
    };
    return uarPicData;
  },

  async editUarPic(
    app: FastifyInstance,
    ID: number,
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
    const uarPicData = {
      ID,
      PIC_NAME,
      DIVISION_ID,
      MAIL,
      CHANGED_BY: "Hesti",
      CHANGED_DT: new Date().toISOString(),
    };

    return uarPicData;
  },
};
