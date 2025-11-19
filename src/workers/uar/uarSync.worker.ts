import { WorkerContext } from '../worker.context';
import {
    scheduleService,
    fetchFromDB1,
    fetchFromDB2,
    fetchFromDB3,
    fetchFromDB4,
    fetchFromDB5,
    runCreateOnlySync,
} from '../../modules/master_data/schedule/schedule.service';
import { UarPic } from '../../types/uarPic';

export async function runUarSOSyncWorker(context: WorkerContext) {
    const { log } = context;
    log.info("Checking for UAR SO Sync jobs");
    const now = new Date();

    try {
        const pendingSchedules = await scheduleService.getRunningSyncSchedules(context);
        log.info(`Found ${pendingSchedules.length} pending sync schedules.`);

        for (const schedule of pendingSchedules) {
            try {
                log.info(`Processing UAR SO Sync for: ${schedule.APPLICATION_ID}`);

                const results = await Promise.allSettled([
                    fetchFromDB1(context),
                    fetchFromDB2(context),
                    fetchFromDB3(context),
                    fetchFromDB4(context),
                    fetchFromDB5(context),
                ]);

                let allSourceData: UarPic[] = [];
                results.forEach((result, index) => {
                    if (result.status === "fulfilled") {
                        log.info(`Successfully fetched ${result.value.length} records from DB${index + 1}`);
                        allSourceData = allSourceData.concat(result.value);
                    } else {
                        log.error(`Failed to fetch from DB ${index + 1}: ${result.reason}`);
                    }
                });

                log.info(`Total records grabbed: ${allSourceData.length}`);

                await runCreateOnlySync(allSourceData, context);

                await new Promise((resolve) => setTimeout(resolve, 300));
            } catch (scheduleError) {
                log.error(scheduleError, `Failed to process sync for ${schedule.APPLICATION_ID}. Continuing...`);
            }
        }
        log.info(`Processed ${pendingSchedules.length} UAR SO Sync schedules at ${now.toISOString()}`);
    } catch (fatalError) {
        log.error(fatalError, "A fatal error occurred during the UAR SO Sync worker run.");
    }
}