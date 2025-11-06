import type { FastifyInstance } from "fastify";
import { ApplicationError } from "../../../core/errors/applicationError";
import { ERROR_CODES } from "../../../core/errors/errorCodes";
import { ERROR_MESSAGES } from "../../../core/errors/errorMessages";
import { currentRequestId, currentUserId } from "../../../core/requestContext";
import { uarSO1, uarSO2, uarSO3, uarSO4, uarSO5 } from "../../../data/mockup";
import { Prisma, TB_M_SCHEDULE } from "../../../generated/prisma/index.js";
import { UarPic } from "../../../types/uarPic";
import { publishMonitoringLog } from "../../log_monitoring/log_publisher";
import { uarPicSchema } from "../uarpic/uarpic.schemas";

type ScheduleWhereInput = Prisma.TB_M_SCHEDULEWhereInput;
type ScheduleCompoundId =
  Prisma.TB_M_SCHEDULEAPPLICATION_IDSCHEDULE_SYNC_START_DTSCHEDULE_UAR_DTCompoundUniqueInput;

/**
 * Helper to format schedule data for API responses, converting Dates to ISO strings.
 */
const formatSchedule = (
  schedule: TB_M_SCHEDULE & {
    TB_M_APPLICATION?: { APPLICATION_NAME: string } | null;
  }
) => {
  const { TB_M_APPLICATION, ...rest } = schedule;

  return {
    ...rest,
    // Add related data
    APPLICATION_NAME: TB_M_APPLICATION?.APPLICATION_NAME || null,
    // Convert Date objects to full ISO strings
    SCHEDULE_SYNC_START_DT: schedule.SCHEDULE_SYNC_START_DT.toISOString(),
    SCHEDULE_SYNC_END_DT: schedule.SCHEDULE_SYNC_END_DT.toISOString(),
    SCHEDULE_UAR_DT: schedule.SCHEDULE_UAR_DT.toISOString(),
    CREATED_DT: schedule.CREATED_DT.toISOString(),
    CHANGED_DT: schedule.CHANGED_DT ? schedule.CHANGED_DT.toISOString() : null,
  };
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

    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    const where: ScheduleWhereInput = {};

    if (q) {
      where.OR = [
        { APPLICATION_ID: { contains: q } },
        {
          TB_M_APPLICATION: {
            APPLICATION_NAME: { contains: q },
          },
        },
      ];
    }

    if (applicationId) {
      where.APPLICATION_ID = applicationId;
    }

    if (applicationName) {
      where.TB_M_APPLICATION = {
        APPLICATION_NAME: { contains: applicationName },
      };
    }

    if (status) {
      where.SCHEDULE_STATUS = status;
    }

    const orderBy: Prisma.TB_M_SCHEDULEOrderByWithRelationInput =
      sortBy === "APPLICATION_NAME"
        ? { TB_M_APPLICATION: { APPLICATION_NAME: order } }
        : { [sortBy]: order };

    try {
      const [rawData, total] = await app.prisma.$transaction([
        app.prisma.tB_M_SCHEDULE.findMany({
          where,
          orderBy,
          skip,
          take: limitNum,
          include: {
            TB_M_APPLICATION: {
              select: { APPLICATION_NAME: true },
            },
          },
        }),
        app.prisma.tB_M_SCHEDULE.count({ where }),
      ]);

      const data = rawData.map(formatSchedule);
      // console.log("schedData", data);
      const totalPages = Math.max(1, Math.ceil(total / limitNum));

      return {
        data,
        meta: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages,
        },
      };
    } catch (e) {
      app.log.error(e);
      throw new ApplicationError(
        ERROR_CODES.SYS_UNKNOWN_ERROR,
        ERROR_MESSAGES[ERROR_CODES.SYS_UNKNOWN_ERROR]
      );
    }
  },

  async getSchedule(
    app: FastifyInstance,
    key: {
      APPLICATION_ID: string;
      SCHEDULE_SYNC_START_DT: string;
      SCHEDULE_UAR_DT: string;
    }
  ) {
    try {
      const schedule = await app.prisma.tB_M_SCHEDULE.findUnique({
        where: {
          APPLICATION_ID_SCHEDULE_SYNC_START_DT_SCHEDULE_UAR_DT: {
            APPLICATION_ID: key.APPLICATION_ID,
            SCHEDULE_SYNC_START_DT: new Date(key.SCHEDULE_SYNC_START_DT),
            SCHEDULE_UAR_DT: new Date(key.SCHEDULE_UAR_DT),
          },
        },
        include: {
          TB_M_APPLICATION: {
            select: { APPLICATION_NAME: true },
          },
        },
      });

      if (!schedule) {
        throw new ApplicationError(
          ERROR_CODES.APP_NOT_FOUND,
          ERROR_MESSAGES[ERROR_CODES.APP_NOT_FOUND],
          404
        );
      }
      return formatSchedule(schedule);
    } catch (e) {
      if (e instanceof ApplicationError) throw e;
      app.log.error(e);
      throw new ApplicationError(
        ERROR_CODES.SYS_UNKNOWN_ERROR,
        ERROR_MESSAGES[ERROR_CODES.SYS_UNKNOWN_ERROR]
      );
    }
  },

  async createSchedule(
    app: FastifyInstance,
    data: {
      APPLICATION_ID: string;
      SCHEDULE_SYNC_START_DT: string;
      SCHEDULE_SYNC_END_DT: string;
      SCHEDULE_UAR_DT: string;
      SCHEDULE_STATUS: string;
      CREATED_BY: string;
    }
  ) {
    console.log("scheddata", data);
    const dataForDb = {
      ...data,
      SCHEDULE_SYNC_START_DT: new Date(data.SCHEDULE_SYNC_START_DT),
      SCHEDULE_SYNC_END_DT: new Date(data.SCHEDULE_SYNC_END_DT),
      SCHEDULE_UAR_DT: new Date(data.SCHEDULE_UAR_DT),
      CREATED_DT: new Date(),
      CHANGED_BY: null,
      CHANGED_DT: null,
    };

    try {
      const newSchedule = await app.prisma.tB_M_SCHEDULE.create({
        data: dataForDb,
      });
      const userId = currentUserId();
      const reqId = currentRequestId();
      publishMonitoringLog(globalThis.app as any, {
        userId,
        module: "SCHE",
        action: "SCHEDULE_CREATE",
        status: "Success",
        description: `Create SCHEDULE ${newSchedule.APPLICATION_ID}`,
        location: "/applications",
      }).catch((e) => console.warn({ e, reqId }, "monitoring log failed"));
      return formatSchedule(newSchedule as any); // Cast as any to bypass include
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === "P2002") {
          throw new ApplicationError(
            ERROR_CODES.APP_ALREADY_EXISTS,
            ERROR_MESSAGES[ERROR_CODES.APP_ALREADY_EXISTS],
            409
          );
        }

        if (e.code === "P2003") {
          throw new ApplicationError(
            ERROR_CODES.APP_NOT_FOUND,
            ERROR_MESSAGES[ERROR_CODES.APP_NOT_FOUND],
            404
          );
        }
      }

      app.log.error(e);
      throw new ApplicationError(
        ERROR_CODES.SYS_UNKNOWN_ERROR,
        ERROR_MESSAGES[ERROR_CODES.SYS_UNKNOWN_ERROR]
      );
    }
  },

  async editSchedule(
    app: FastifyInstance,
    key: {
      APPLICATION_ID: string;
      SCHEDULE_SYNC_START_DT: string;
      SCHEDULE_UAR_DT: string;
    },
    data: {
      APPLICATION_ID: string; // Can be new or old
      SCHEDULE_SYNC_START_DT: string; // Can be new or old
      SCHEDULE_SYNC_END_DT: string;
      SCHEDULE_UAR_DT: string; // Can be new or old
      SCHEDULE_STATUS: string;
      CHANGED_BY: string | null;
    }
  ) {
    const dataForUpdate = {
      ...data,
      SCHEDULE_SYNC_START_DT: new Date(data.SCHEDULE_SYNC_START_DT),
      SCHEDULE_SYNC_END_DT: new Date(data.SCHEDULE_SYNC_END_DT),
      SCHEDULE_UAR_DT: new Date(data.SCHEDULE_UAR_DT),
      CHANGED_DT: new Date(),
    };

    try {
      const updatedSchedule = await app.prisma.tB_M_SCHEDULE.update({
        where: {
          APPLICATION_ID_SCHEDULE_SYNC_START_DT_SCHEDULE_UAR_DT: {
            APPLICATION_ID: key.APPLICATION_ID,
            SCHEDULE_SYNC_START_DT: new Date(key.SCHEDULE_SYNC_START_DT),
            SCHEDULE_UAR_DT: new Date(key.SCHEDULE_UAR_DT),
          },
        },
        data: dataForUpdate,
      });
      const userId = currentUserId();
      const reqId = currentRequestId();
      publishMonitoringLog(globalThis.app as any, {
        userId,
        module: "SCHE",
        action: "SCHEDULE_UPDATE",
        status: "Success",
        description: `Create SCHEDULE ${updatedSchedule.APPLICATION_ID}`,
        location: "/applications",
      }).catch((e) => console.warn({ e, reqId }, "monitoring log failed"));
      return formatSchedule(updatedSchedule as any); // Cast as any to bypass include
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === "P2025") {
          throw new ApplicationError(
            ERROR_CODES.APP_NOT_FOUND,
            ERROR_MESSAGES[ERROR_CODES.APP_NOT_FOUND],
            404
          );
        }
        if (e.code === "P2002") {
          throw new ApplicationError(
            ERROR_CODES.APP_ALREADY_EXISTS,
            "The new combination of Application ID, Sync Start Date, and UAR Date already exists.",
            409
          );
        }
      }
      app.log.error(e);
      throw new ApplicationError(
        ERROR_CODES.SYS_UNKNOWN_ERROR,
        ERROR_MESSAGES[ERROR_CODES.SYS_UNKNOWN_ERROR]
      );
    }
  },

  async updateStatusSchedule(
    app: FastifyInstance,
    key: {
      APPLICATION_ID: string;
      SCHEDULE_SYNC_START_DT: string;
      SCHEDULE_UAR_DT: string;
    },
    SCHEDULE_STATUS: string
  ) {
    try {
      const CHANGED_BY = "Hesti";
      const updatedSchedule = await app.prisma.tB_M_SCHEDULE.update({
        where: {
          APPLICATION_ID_SCHEDULE_SYNC_START_DT_SCHEDULE_UAR_DT: {
            APPLICATION_ID: key.APPLICATION_ID,
            SCHEDULE_SYNC_START_DT: new Date(key.SCHEDULE_SYNC_START_DT),
            SCHEDULE_UAR_DT: new Date(key.SCHEDULE_UAR_DT),
          },
        },
        data: {
          SCHEDULE_STATUS: SCHEDULE_STATUS,
          CHANGED_BY: CHANGED_BY,
          CHANGED_DT: new Date(),
        },
      });
      const userId = currentUserId();
      const reqId = currentRequestId();
      publishMonitoringLog(globalThis.app as any, {
        userId,
        module: "SCHE",
        action: "SCHEDULE_UPDATE",
        status: "Success",
        description: `Create SCHEDULE ${updatedSchedule.APPLICATION_ID}`,
        location: "/applications",
      }).catch((e) => console.warn({ e, reqId }, "monitoring log failed"));
      return formatSchedule(updatedSchedule as any); // Cast as any to bypass include
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === "P2025") {
          throw new ApplicationError(
            ERROR_CODES.APP_NOT_FOUND,
            ERROR_MESSAGES[ERROR_CODES.APP_NOT_FOUND],
            404
          );
        }
      }
      app.log.error(e);
      throw new ApplicationError(
        ERROR_CODES.SYS_UNKNOWN_ERROR,
        ERROR_MESSAGES[ERROR_CODES.SYS_UNKNOWN_ERROR]
      );
    }
  },

  async deleteSchedule(
    app: FastifyInstance,
    key: {
      APPLICATION_ID: string;
      SCHEDULE_SYNC_START_DT: string;
      SCHEDULE_UAR_DT: string;
    }
  ) {
    try {
      const deletedSchedule = await app.prisma.tB_M_SCHEDULE.delete({
        where: {
          APPLICATION_ID_SCHEDULE_SYNC_START_DT_SCHEDULE_UAR_DT: {
            APPLICATION_ID: key.APPLICATION_ID,
            SCHEDULE_SYNC_START_DT: new Date(key.SCHEDULE_SYNC_START_DT),
            SCHEDULE_UAR_DT: new Date(key.SCHEDULE_UAR_DT),
          },
        },
      });
      const userId = currentUserId();
      const reqId = currentRequestId();
      publishMonitoringLog(globalThis.app as any, {
        userId,
        module: "SCHE",
        action: "SCHEDULE_DELETE",
        status: "Success",
        description: `Create SCHEDULE ${deletedSchedule.APPLICATION_ID}`,
        location: "/applications",
      }).catch((e) => console.warn({ e, reqId }, "monitoring log failed"));
      return formatSchedule(deletedSchedule as any); // Cast as any to bypass include
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === "P2025") {
          throw new ApplicationError(
            ERROR_CODES.APP_NOT_FOUND,
            ERROR_MESSAGES[ERROR_CODES.APP_NOT_FOUND],
            404
          );
        }
      }
      app.log.error(e);
      throw new ApplicationError(
        ERROR_CODES.SYS_UNKNOWN_ERROR,
        ERROR_MESSAGES[ERROR_CODES.SYS_UNKNOWN_ERROR]
      );
    }
  },

  async getRunningUarSchedules(app: FastifyInstance) {
    const today = new Date();
    const startOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    const endOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + 1
    );

    try {
      const runningSchedules = await app.prisma.tB_M_SCHEDULE.findMany({
        where: {
          SCHEDULE_UAR_DT: {
            gte: startOfDay,
            lt: endOfDay,
          },
          SCHEDULE_STATUS: "1",
        },
      });
      return runningSchedules.map((s) => formatSchedule(s as any));
    } catch (e) {
      app.log.error(e, "Failed to get running UAR schedules");
      throw new ApplicationError(
        ERROR_CODES.SYS_UNKNOWN_ERROR,
        ERROR_MESSAGES[ERROR_CODES.SYS_UNKNOWN_ERROR]
      );
    }
  },

  async getRunningSyncSchedules(app: FastifyInstance) {
    const today = new Date();
    // Normalize to midnight for date-only comparison
    const startOfToday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );

    try {
      const runningSchedules = await app.prisma.tB_M_SCHEDULE.findMany({
        where: {
          SCHEDULE_SYNC_START_DT: { lte: startOfToday },
          SCHEDULE_SYNC_END_DT: { gte: startOfToday },
          SCHEDULE_STATUS: "1",
        },
      });
      return runningSchedules.map((s) => formatSchedule(s as any));
    } catch (e) {
      app.log.error(e, "Failed to get running sync schedules");
      throw new ApplicationError(
        ERROR_CODES.SYS_UNKNOWN_ERROR,
        ERROR_MESSAGES[ERROR_CODES.SYS_UNKNOWN_ERROR]
      );
    }
  },
};

export async function runCreateOnlySync(
  sourcePicList: UarPic[],
  app: FastifyInstance
) {
  app.log.info("--- Starting Create-Only Sync ---");

  try {
    const databasePicList = await app.prisma.tB_M_UAR_PIC.findMany({
      select: { ID: true },
    });
    app.log.info(
      `"Database" has ${databasePicList.length} records before sync.`
    );

    app.log.info("Step 1: In-memory tempUarPic cleaned.");
    const tempUarPic: UarPic[] = [];

    app.log.info(`Step 2: "Grabbed" ${sourcePicList.length} source records.`);

    const databaseIdMap = new Map(databasePicList.map((pic) => [pic.ID, true]));

    const newTempUarPics = sourcePicList.filter(
      (sourcePic) => !databaseIdMap.has(sourcePic.ID)
    );
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

    if (validatedTempPic.length > 0) {
      const dataToCreate = validatedTempPic.map((pic) => ({
        ...pic,
        CREATED_DT: new Date(pic.CREATED_DT),
        CHANGED_DT: pic.CHANGED_DT ? new Date(pic.CHANGED_DT) : null,
      }));
      console.log("dttcr", dataToCreate);

      const createResult = await createManyWithManualDuplicateCheck(
        app,
        dataToCreate
      );
      app.log.info(
        `Step 5: Pushed ${createResult.count} new records to "database".`
      );
    } else {
      app.log.info("Step 5: No new records to push to database.");
    }

    const finalCount = await app.prisma.tB_M_UAR_PIC.count();
    app.log.info(`"Database" has ${finalCount} records after sync.`);
  } catch (e) {
    app.log.error(e, "Error during UAR PIC sync process");
  }
}

async function createManyWithManualDuplicateCheck(
  app: any,
  dataToCreate: any[]
) {
  const UNIQUE_KEYS: string[] = ["ID"];

  if (!dataToCreate || dataToCreate.length === 0) {
    console.log("No data provided to create.");
    return { count: 0 };
  }

  const createKey = (item: any) =>
    UNIQUE_KEYS.map((key) => `${key}_${item[key]}`).join("|");

  const uniqueItemMap = new Map<string, any>();
  for (const item of dataToCreate) {
    if (!item.ID) {
      console.warn("Skipping item with no ID:", item);
      continue;
    }
    const itemKey = createKey(item);
    if (!uniqueItemMap.has(itemKey)) {
      uniqueItemMap.set(itemKey, item);
    }
  }
  const uniqueDataToCreate = Array.from(uniqueItemMap.values());

  const originalInputCount = dataToCreate.length;
  const afterInternalDedupCount = uniqueDataToCreate.length;

  if (afterInternalDedupCount < originalInputCount) {
    console.log(
      `Removed ${
        originalInputCount - afterInternalDedupCount
      } duplicates from the input data.`
    );
  }

  if (uniqueDataToCreate.length === 0) {
    console.log("No unique data left to create after internal deduplication.");
    return { count: 0 };
  }

  const whereClauses = uniqueDataToCreate.map((item) => ({
    ID: { equals: item.ID },
  }));

  const existingRecords = await app.prisma.tB_M_UAR_PIC.findMany({
    where: {
      OR: whereClauses,
    },
    select: {
      ID: true,
    },
  });

  const existingKeySet = new Set(existingRecords.map(createKey));

  const dataToActuallyCreate = uniqueDataToCreate.filter((item) => {
    const itemKey = createKey(item);
    return !existingKeySet.has(itemKey);
  });

  if (dataToActuallyCreate.length > 0) {
    const createResult = await app.prisma.tB_M_UAR_PIC.createMany({
      data: dataToActuallyCreate as any,
    });

    console.log(`Found ${existingRecords.length} existing records in DB.`);
    console.log(`Created ${createResult.count} new records.`);
    return createResult;
  } else {
    return { count: 0 };
  }
}

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
