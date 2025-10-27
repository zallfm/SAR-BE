import { FastifyInstance } from "fastify";
// Updated: Import the new fetch functions and UarPic type
import {
  runCreateOnlySync,
  scheduleService,
  fetchFromDB1,
  fetchFromDB2,
  fetchFromDB3,
  fetchFromDB4,
  fetchFromDB5,
} from "../modules/Schedule/schedule.service";
import { initialUarPic } from "../modules/UarPic/uarpic.repository";
import { UarPic } from "../types/uarPic"; // Added: Path may need adjustment
import { divisions } from "../data/mockup";

interface UarSystemOwner {
  UAR_PERIOD: string;
  UAR_ID: string;
  USERNAME: string;
  NOREG: string | null;
  NAME: string | null;
  POSITION_NAME: string | null;
  DIVISION_ID: number;
  DEPARTMENT_ID: number | null;
  SECTION_ID: number | null;
  ORG_CHANGED_STATUS: string | null;
  COMPANY_CD: number | null;
  APPLICATION_ID: string | null;
  ROLE_ID: string;
  REVIEWER_NOREG: string | null;
  REVIEWER_NAME: string | null;
  REVIEW_STATUS: string | null;
  REVIEWED_BY: string | null;
  REVIEWED_DT: Date | null;
  SO_APPROVAL_STATUS: string | null;
  SO_APPROVAL_BY: string | null;
  SO_APPROVAL_DT: Date | null;
  REMEDIATED_STATUS: string | null;
  REMEDIATED_DT: Date | null;
  CREATED_BY: string;
  CREATED_DT: Date;
  CHANGED_BY: string | null;
  CHANGED_DT: Date | null;
}

export async function runUarSOWorker(app: FastifyInstance) {
  app.log.info("Checking for schedule jobs");
  const now = new Date();

  try {
    const runningSchedules = await scheduleService.getRunningUarSchedules(app);
    let uarSystemOwners: UarSystemOwner[] = [];

    for (const schedule of runningSchedules) {
      app.log.info(
        `Processing schedule for APPLICATION_ID: ${schedule.APPLICATION_ID}`
      );

      uarSystemOwners.push({
        UAR_PERIOD: "2023-01-01",
        UAR_ID: "UAR123",
        USERNAME: "user123",
        NOREG: null,
        NAME: "John Doe",
        POSITION_NAME: "Software Engineer",
        DIVISION_ID: 1,
        DEPARTMENT_ID: null,
        SECTION_ID: null,
        ORG_CHANGED_STATUS: null,
        COMPANY_CD: null,
        APPLICATION_ID: "APP123",
        ROLE_ID: "ROLE123",
        REVIEWER_NOREG: null,
        REVIEWER_NAME: null,
        REVIEW_STATUS: null,
        REVIEWED_BY: null,
        REVIEWED_DT: null,
        SO_APPROVAL_STATUS: null,
        SO_APPROVAL_BY: null,
        SO_APPROVAL_DT: null,
        REMEDIATED_STATUS: null,
        REMEDIATED_DT: null,
        CREATED_BY: "system",
        CREATED_DT: new Date(),
        CHANGED_BY: null,
        CHANGED_DT: null,
      });

      await new Promise((resolve) => setTimeout(resolve, 300));
    }
    app.log.info(
      `Ticker: Processed ${
        uarSystemOwners.length
      } UAR System Owners at ${now.toISOString()}`
    );
  } catch (error) {
    app.log.error(error, "Ticker: A fatal error occurred during the run.");
  }
}

export async function runUarSOSyncWorker(app: FastifyInstance) {
  app.log.info("Checking for UAR SO Sync jobs");
  const now = new Date();

  try {
    app.log.info("Fetching pending UAR SO Sync schedules...");
    const pendingSchedules = await scheduleService.getRunningSyncSchedules(app);

    for (const schedule of pendingSchedules) {
      app.log.info(
        `Processing UAR SO Sync for APPLICATION_ID: ${schedule.APPLICATION_ID}`
      );

      app.log.info(
        `Grabbing data from 5 sources for ${schedule.APPLICATION_ID}...`
      );

      const results = await Promise.allSettled([
        fetchFromDB1(app),
        fetchFromDB2(app),
        fetchFromDB3(app),
        fetchFromDB4(app),
        fetchFromDB5(app),
      ]);

      let allSourceData: UarPic[] = [];
      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          app.log.info(
            `Successfully fetched ${result.value.length} records from DB${
              index + 1
            }`
          );
          allSourceData = allSourceData.concat(result.value);
        } else {
          app.log.error(
            `Failed to fetch from DB ${index + 1}: ${
              result.reason?.message || result.reason
            }`
          );
        }
      });

      app.log.info(
        `Total records grabbed from all sources: ${allSourceData.length}`
      );
      await runCreateOnlySync(initialUarPic, allSourceData, app);

      await new Promise((resolve) => setTimeout(resolve, 300));
    }
    app.log.info(
      `Processed ${
        pendingSchedules.length
      } UAR SO Sync schedules at ${now.toISOString()}`
    );
  } catch (error) {
    app.log.error(error, "A fatal error occurred during the run.");
  }
}
