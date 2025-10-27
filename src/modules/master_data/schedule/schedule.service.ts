import type { FastifyInstance } from "fastify";
import { ApplicationError } from "../../../core/errors/applicationError";
import { ERROR_CODES } from "../../../core/errors/errorCodes";
import { ERROR_MESSAGES } from "../../../core/errors/errorMessages";
import { initialSchedules } from "./schedule.repository";
import { generateID } from "../../../utils/idHelper";
import { tempUarPic } from "../uarpic/uarpic.repository";
import { UarPic } from "../../../types/uarPic";
import { uarPicSchema } from "../uarpic/uarpic.schemas";
import {
  applications,
  uarSO1,
  uarSO2,
  uarSO3,
  uarSO4,
  uarSO5,
} from "../../../data/mockup";
import { Schedule } from "../../../types/schedule";

const dateCheck = (date: string) => {
  const regex = /^(\d{2})\/(\d{2})$/;
  const result = regex.test(date);

  if (!result) {
    throw new ApplicationError(
      ERROR_CODES.VAL_INVALID_FORMAT,
      ERROR_MESSAGES[ERROR_CODES.VAL_INVALID_FORMAT],
      400
    );
  }
};

export type GetSchedulesQuery = {
  APPLICATION_ID?: string;
  SCHEDULE_STATUS?: string;
};
export const scheduleService = {
  async getSchedules(app: FastifyInstance, query: any) {
    const {
      page = 1,
      limit = 10,
      q,
      applicationId,
      applicationName,
      status,
      sortBy = "CREATED_DT",
      order = "desc",
    } = query;

    let rows: Schedule[] = initialSchedules.slice();

    if (q) {
      const s = String(q).toLowerCase();
      rows = rows.filter((r) => r.APPLICATION_ID.toLowerCase().includes(s));
    }

    if (applicationId) {
      rows = rows.filter((r) => r.APPLICATION_ID === applicationId);
    }

    if (applicationName) {
      const searchName = String(applicationName).toLowerCase();

      const matchingAppIdSet = new Set(
        applications
          .filter((app) => app.APP_NAME.toLowerCase().includes(searchName))
          .map((app) => app.APPLICATION_ID)
      );

      rows = rows.filter((r) => matchingAppIdSet.has(r.APPLICATION_ID));
    }

    if (status) {
      rows = rows.filter((r) => r.SCHEDULE_STATUS === status);
    }

    rows.sort((a, b) => {
      let va: number | string, vb: number | string;

      switch (sortBy) {
        case "APPLICATION_ID":
          va = a.APPLICATION_ID;
          vb = b.APPLICATION_ID;
          break;
        case "SCHEDULE_STATUS":
          va = a.SCHEDULE_STATUS.toLowerCase();
          vb = b.SCHEDULE_STATUS.toLowerCase();
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
      data,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.max(1, Math.ceil(total / limitNum)),
      },
    };
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
    CREATED_BY: string,
    CREATED_DT: string
  ) {
    dateCheck(SCHEDULE_SYNC_START_DT);
    dateCheck(SCHEDULE_SYNC_END_DT);
    dateCheck(SCHEDULE_UAR_DT);
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
      SCHEDULE_STATUS: "1",
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
    dateCheck(SCHEDULE_SYNC_START_DT);
    dateCheck(SCHEDULE_SYNC_END_DT);
    dateCheck(SCHEDULE_UAR_DT);

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

  async updateStatusSchedule(
    app: FastifyInstance,
    ID: string,
    SCHEDULE_STATUS: string
  ) {
    const scheduleIndex = initialSchedules.findIndex((item) => item.ID === ID);
    if (scheduleIndex === -1) {
      throw new ApplicationError(
        ERROR_CODES.APP_NOT_FOUND,
        ERROR_MESSAGES[ERROR_CODES.APP_NOT_FOUND],
        400
      );
    }
    initialSchedules[scheduleIndex].SCHEDULE_STATUS = SCHEDULE_STATUS;
    return initialSchedules[scheduleIndex];
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
        scheduleDate.getDate() === today.getDate() &&
        item.SCHEDULE_STATUS === "1"
      );
    });
    return runningSchedules;
  },

  async getRunningSyncSchedules(app: FastifyInstance) {
    // Normalize today to midnight for an accurate date-only comparison
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const currentYear = today.getFullYear();

    const runningSchedules = initialSchedules.filter((item) => {
      const [startDay, startMonth] =
        item.SCHEDULE_SYNC_START_DT.split("/").map(Number);
      const [endDay, endMonth] =
        item.SCHEDULE_SYNC_END_DT.split("/").map(Number);

      let startDate = new Date(currentYear, startMonth - 1, startDay);
      let endDate = new Date(currentYear, endMonth - 1, endDay);

      if (endDate.getTime() < startDate.getTime()) {
        if (today.getTime() >= startDate.getTime()) {
          return true;
        }
        const lastYearStartDate = new Date(
          currentYear - 1,
          startMonth - 1,
          startDay
        );
        if (today.getTime() <= endDate.getTime()) {
          return today.getTime() >= lastYearStartDate.getTime();
        }
      }

      return (
        today.getTime() >= startDate.getTime() &&
        today.getTime() <= endDate.getTime()
      );
    });

    console.log("Running Sync Schedules:", runningSchedules);
    return runningSchedules;
  },
};

const randomDelay = (ms = 500) =>
  new Promise((resolve) => setTimeout(resolve, Math.random() * ms));

export async function fetchFromDB1(app: FastifyInstance): Promise<UarPic[]> {
  app.log.info("Fetching data from DB1...");
  await randomDelay(300);
  app.log.info(`Fetched ${uarSO1.length} records from DB1.`);
  return uarSO1;
}

export async function fetchFromDB2(app: FastifyInstance): Promise<UarPic[]> {
  app.log.info("Fetching data from DB2...");
  await randomDelay(500);
  app.log.info(`Fetched ${uarSO2.length} records from DB2.`);
  return uarSO2;
}

export async function fetchFromDB3(app: FastifyInstance): Promise<UarPic[]> {
  app.log.info("Fetching data from DB3...");
  await randomDelay(200);

  if (Math.random() < 0.1) {
    app.log.error("Simulation: Connection to DB3 failed!");
    throw new Error("Connection timed out to DB3");
  }

  app.log.info(`Fetched ${uarSO3.length} records from DB3.`);
  return uarSO3;
}

export async function fetchFromDB4(app: FastifyInstance): Promise<UarPic[]> {
  app.log.info("Fetching data from DB4...");
  await randomDelay(400);
  app.log.info(`Fetched ${uarSO4.length} records from DB4.`);
  return uarSO4;
}

export async function fetchFromDB5(app: FastifyInstance): Promise<UarPic[]> {
  app.log.info("Fetching data from DB5...");
  await randomDelay(600);
  app.log.info(`Fetched ${uarSO5.length} records from DB5.`);
  return uarSO5;
}

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

  let validatedTempPic = tempUarPic.filter((pic) => {
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
