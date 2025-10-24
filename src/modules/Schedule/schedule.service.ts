import type { FastifyInstance } from "fastify";
import { ApplicationError } from "../../core/errors/applicationError";
import { ERROR_CODES } from "../../core/errors/errorCodes";
import { ERROR_MESSAGES } from "../../core/errors/errorMessages";
import { initialSchedules } from "./schedule.repository";
import { generateID } from "../../utils/idHelper";
import { tempUarPic } from "../UarPic/uarpic.repository";
import { UarPic } from "../../types/uarPic";
import { uarPicSchema } from "../UarPic/uarpic.schemas";

export const scheduleService = {
  async getSchedules(app: FastifyInstance) {
    return initialSchedules;
  },

  async getSchedule(app: FastifyInstance, ID: string) {
    const scheduleIndex = initialSchedules.findIndex((item) => item.ID === ID);
    if (scheduleIndex === -1) {
      throw new ApplicationError(
        ERROR_CODES.APP_NOT_FOUND,
        ERROR_MESSAGES[ERROR_CODES.APP_NOT_FOUND],
        400
      );
    }
    return initialSchedules[scheduleIndex];
  },
  async createSchedule(
    app: FastifyInstance,
    APPLICATION_ID: string,
    SCHEDULE_SYNC_START_DT: string,
    SCHEDULE_SYNC_END_DT: string,
    SCHEDULE_UAR_DT: string,
    SCHEDULE_STATUS: string,
    CREATED_BY: string,
    CREATED_DT: string
  ) {
    const scheduleData = {
      ID: generateID(
        "SCH",
        "CIO",
        initialSchedules.map((s) => s.ID)
      ),
      APPLICATION_ID,
      SCHEDULE_SYNC_START_DT,
      SCHEDULE_SYNC_END_DT,
      SCHEDULE_UAR_DT,
      SCHEDULE_STATUS,
      CREATED_BY,
      CREATED_DT,
      CHANGED_BY: null,
      CHANGED_DT: null,
    };
    initialSchedules.push(scheduleData);
    return scheduleData;
  },

  async editSchedule(
    app: FastifyInstance,
    ID: string,
    APPLICATION_ID: string,
    SCHEDULE_SYNC_START_DT: string,
    SCHEDULE_SYNC_END_DT: string,
    SCHEDULE_UAR_DT: string,
    SCHEDULE_STATUS: string,
    CHANGED_BY: string | null,
    CHANGED_DT: string | null
  ) {
    const schedule = initialSchedules.find((item) => item.ID === ID);

    if (!schedule) {
      throw new ApplicationError(
        ERROR_CODES.APP_NOT_FOUND,
        ERROR_MESSAGES[ERROR_CODES.APP_NOT_FOUND],
        400
      );
    }

    const scheduleData = {
      ID,
      APPLICATION_ID,
      SCHEDULE_SYNC_START_DT,
      SCHEDULE_SYNC_END_DT,
      SCHEDULE_UAR_DT,
      SCHEDULE_STATUS,
      CHANGED_BY,
      CHANGED_DT,
    };
    Object.assign(schedule, scheduleData);

    return scheduleData;
  },

  async deleteSchedule(app: FastifyInstance, ID: string) {
    const scheduleIndex = initialSchedules.findIndex((item) => item.ID === ID);
    if (scheduleIndex === -1) {
      throw new ApplicationError(
        ERROR_CODES.APP_NOT_FOUND,
        ERROR_MESSAGES[ERROR_CODES.APP_NOT_FOUND],
        400
      );
    }
    initialSchedules.splice(scheduleIndex, 1);
    return initialSchedules;
  },

  async getRunningUarSchedules(app: FastifyInstance) {
    const today = new Date();
    const runningSchedules = initialSchedules.filter((item) => {
      const scheduleDate = new Date(item.SCHEDULE_UAR_DT);
      return (
        scheduleDate.getFullYear() === today.getFullYear() &&
        scheduleDate.getMonth() === today.getMonth() &&
        scheduleDate.getDate() === today.getDate()
      );
    });
    return runningSchedules;
  },

  async getRunningSyncSchedules(app: FastifyInstance) {
    const today = new Date();
    const runningSchedules = initialSchedules.filter((item) => {
      const startDate = new Date(item.SCHEDULE_SYNC_START_DT);
      const endDate = new Date(item.SCHEDULE_SYNC_END_DT);
      return today >= startDate && today <= endDate;
    });

    console.log("Running Sync Schedules:", runningSchedules);
    return runningSchedules;
  },
};

export async function runCreateOnlySync(
  databasePicList: UarPic[],
  sourcePicList: UarPic[],
  app: FastifyInstance
) {
  app.log.info("--- Starting Create-Only Sync ---");
  app.log.info(`"Database" has ${databasePicList.length} records before sync.`);

  app.log.info("Step 1: tempUarPic cleaned.");
  tempUarPic.length = 0;

  app.log.info(`Step 2: "Grabbed" ${sourcePicList.length} source records.`);

  const databaseIdMap = new Map(databasePicList.map((pic) => [pic.ID, true]));

  const newTempUarPics = sourcePicList.filter(
    (sourcePic) => !databaseIdMap.has(sourcePic.ID)
  );
  tempUarPic.length = 0;
  tempUarPic.push(...newTempUarPics);
  app.log.info(
    `Step 3: Filtered for new records. ${tempUarPic.length} new records found.`
  );

  const requiredFields = uarPicSchema.body.required;

  const validatedTempPic = tempUarPic.filter((pic) => {
    for (const key of requiredFields) {
      const value = pic[key as keyof UarPic];

      if (value === null || value === undefined) {
        app.log.warn(
          `  Skipping: ${pic.ID} (Reason: Required field ${key} is missing or null).`
        );
        return false;
      }
    }
    return true;
  });
  app.log.info(
    `Step 4: Validated records. ${validatedTempPic.length} records are valid.`
  );

  databasePicList.push(...validatedTempPic);

  app.log.info(
    `Step 5: Pushed ${validatedTempPic.length} new records to "database".`
  );
  app.log.info(`"Database" has ${databasePicList.length} records after sync.`);
}
