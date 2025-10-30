import type { FastifyInstance } from "fastify";
import { Prisma } from "../../../generated/prisma"; // Added Prisma import
import { ApplicationError } from "../../../core/errors/applicationError";
import { ERROR_CODES } from "../../../core/errors/errorCodes";
import { ERROR_MESSAGES } from "../../../core/errors/errorMessages";
// Removed: import { initialUarPic } from "./uarpic.repository";
// Removed: import { UarPic } from "../../../types/uarPic";
import { generateID } from "../../../utils/idHelper";

// --- Prisma Type Definitions ---
// Assumes Prisma model is named 'TB_M_UAR_PIC'
type UarPicWhereInput = Prisma.TB_M_UAR_PICWhereInput;
type UarPicCreateData = Prisma.TB_M_UAR_PICUncheckedCreateInput;
type UarPicOrderBy = Prisma.TB_M_UAR_PICOrderByWithRelationInput;

// --- Validation Functions (Business Logic) ---

/**
 * Validates UAR PIC data formats. Throws ApplicationError if invalid.
 */
function validateUarPicData(
  PIC_NAME: string,
  DIVISION_ID: number, // Keep for potential future validation
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

/**
 * Checks for duplicate MAIL in the database.
 * @param app - Fastify instance
 * @param MAIL - Email to check
 * @param currentID - (Optional) ID of the current record to exclude from the check (for updates)
 */
async function dupeCheck(
  app: FastifyInstance,
  MAIL: string,
  currentID: string | null = null
) {
  const where: UarPicWhereInput = {
    MAIL: { equals: MAIL },
  };

  // If editing, exclude the current item from the duplicate check
  if (currentID) {
    where.NOT = {
      ID: currentID,
    };
  }

  const duplicate = await app.prisma.tB_M_UAR_PIC.findFirst({ where });

  if (duplicate) {
    throw new ApplicationError(
      ERROR_CODES.APP_ALREADY_EXISTS,
      ERROR_MESSAGES[ERROR_CODES.APP_ALREADY_EXISTS] ||
        "UAR PIC with this MAIL already exists",
      400 // 400 (Bad Request) or 409 (Conflict) are appropriate
    );
  }
}

export const uarPicService = {
  /**
   * Get paginated, filtered, and sorted UAR PICs
   */
  async getUarPics(app: FastifyInstance, query: any) {
    const {
      page = 1,
      limit = 10,
      divisionId,
      q,
      pic_name,
      startDate,
      endDate,
      sortBy = "CREATED_DT",
      order = "desc",
    } = query;

    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    // --- Build Prisma Where Clause ---
    const where: UarPicWhereInput = {};

    if (divisionId) {
      where.DIVISION_ID = Number(divisionId);
    }

    if (pic_name) {
      where.PIC_NAME = { contains: pic_name };
    }

    if (q) {
      const s = String(q);
      where.OR = [
        { PIC_NAME: { contains: s } },
        { MAIL: { contains: s } },
        { ID: { contains: s } }, // Assuming ID is string
      ];
    }

    if (startDate || endDate) {
      const start = startDate ? new Date(startDate) : null;
      // Set end date to end of day
      const end = endDate
        ? new Date(new Date(endDate).setHours(23, 59, 59, 999))
        : null;

      where.CREATED_DT = {};
      if (start) {
        where.CREATED_DT.gte = start;
      }
      if (end) {
        where.CREATED_DT.lte = end;
      }
    }

    // --- Build Prisma OrderBy Clause ---

    // --- Database Query ---
    try {
      // Use $transaction to get data and total count in one DB call
      const [data, total] = await app.prisma.$transaction([
        app.prisma.tB_M_UAR_PIC.findMany({
          where,
          skip,
          take: limitNum,
          orderBy: [{ CREATED_DT: "desc" }, { ID: "desc" }],
        }),

        app.prisma.tB_M_UAR_PIC.count({ where }),
      ]);

      const totalPages = Math.max(1, Math.ceil(total / limitNum));

      return {
        data: data,
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

  /**
   * Create a new UAR PIC
   */
  async createUarPic(
    app: FastifyInstance,
    PIC_NAME: string,
    DIVISION_ID: number,
    MAIL: string
  ) {
    const lowerCaseMail = MAIL.toLowerCase();

    // --- Run Validations ---
    await dupeCheck(app, lowerCaseMail); // Check for duplicates in DB
    validateUarPicData(PIC_NAME, DIVISION_ID, lowerCaseMail); // Check format

    // --- Generate Custom ID ---
    const now = new Date();
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
    const endOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
      999
    );

    const todayPics = await app.prisma.tB_M_UAR_PIC.findMany({
      where: {
        CREATED_DT: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      select: {
        ID: true, // Only fetch the ID
      },
    });
    const todayIds = todayPics.map((item) => item.ID);

    // --- Prepare Data ---
    const uarPicData: UarPicCreateData = {
      ID: generateID("PIC", "CIO", todayIds),
      PIC_NAME,
      DIVISION_ID,
      MAIL: lowerCaseMail,
      CREATED_BY: "Hesti", // Hardcoded as per original
      CREATED_DT: new Date(),
      CHANGED_BY: null,
      CHANGED_DT: null,
    };

    // --- Database Query ---
    try {
      const newData = await app.prisma.tB_M_UAR_PIC.create({
        data: uarPicData,
      });
      return newData;
    } catch (e: any) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        // Handle race condition or other unique constraint (e.g., ID collision)
        if (e.code === "P2002") {
          app.log.error(e);
          throw new ApplicationError(
            ERROR_CODES.APP_ALREADY_EXISTS,
            `A UAR PIC with this data already exists.`,
            400
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

  /**
   * Edit an existing UAR PIC
   */
  async editUarPic(
    app: FastifyInstance,
    ID: string,
    PIC_NAME: string,
    DIVISION_ID: number,
    MAIL: string
  ) {
    const lowerCaseMail = MAIL.toLowerCase();

    // --- Check for existence ---
    const uarPic = await app.prisma.tB_M_UAR_PIC.findUnique({
      where: { ID },
    });

    if (!uarPic) {
      throw new ApplicationError(
        ERROR_CODES.APP_NOT_FOUND,
        ERROR_MESSAGES[ERROR_CODES.APP_NOT_FOUND],
        404 // 404 Not Found is more appropriate
      );
    }

    // --- Run Validations ---
    validateUarPicData(PIC_NAME, DIVISION_ID, lowerCaseMail);

    // Only run dupe check if the email is being changed
    if (uarPic.MAIL.toLowerCase() !== lowerCaseMail) {
      await dupeCheck(app, lowerCaseMail, ID); // Pass ID to exclude self
    }

    // --- Prepare Data ---
    const uarPicData = {
      PIC_NAME,
      DIVISION_ID,
      MAIL: lowerCaseMail,
      CHANGED_BY: "Hesti", // Hardcoded as per original
      CHANGED_DT: new Date(),
    };

    // --- Database Query ---
    try {
      const updatedUarPic = await app.prisma.tB_M_UAR_PIC.update({
        where: { ID },
        data: uarPicData,
      });
      return updatedUarPic;
    } catch (e: any) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        // Handle race condition where item was deleted
        if (e.code === "P2025") {
          app.log.error(`Record not found with ID: ${ID}`);
          throw new ApplicationError(
            ERROR_CODES.APP_NOT_FOUND,
            ERROR_MESSAGES[ERROR_CODES.APP_NOT_FOUND],
            404
          );
        }
        // Handle race condition for duplicate email
        if (e.code === "P2002") {
          app.log.error(e);
          throw new ApplicationError(
            ERROR_CODES.APP_ALREADY_EXISTS,
            "UAR PIC with this MAIL already exists",
            400
          );
        }
      }
      app.log.error(`Possible Error: ${e}`);
      throw new ApplicationError(
        ERROR_CODES.SYS_UNKNOWN_ERROR,
        ERROR_MESSAGES[ERROR_CODES.SYS_UNKNOWN_ERROR]
      );
    }
  },

  /**
   * Delete a UAR PIC
   */
  async deleteUarPic(app: FastifyInstance, ID: string) {
    try {
      const deletedUarPic = await app.prisma.tB_M_UAR_PIC.delete({
        where: { ID },
      });
      return deletedUarPic; // Return deleted item
    } catch (e: any) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        // Record not found
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

  /**
   * Get all UAR PICs created today
   */
  async getRunningSchedules(app: FastifyInstance) {
    const now = new Date();
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
    const endOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
      999
    );

    try {
      const runningSchedules = await app.prisma.tB_M_UAR_PIC.findMany({
        where: {
          CREATED_DT: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      });
      console.log("Running Schedules:", runningSchedules); // Kept from original
      return runningSchedules;
    } catch (e) {
      app.log.error(e);
      throw new ApplicationError(
        ERROR_CODES.SYS_UNKNOWN_ERROR,
        ERROR_MESSAGES[ERROR_CODES.SYS_UNKNOWN_ERROR]
      );
    }
  },
};
