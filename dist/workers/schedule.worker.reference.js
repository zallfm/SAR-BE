// This is your mock data. In real life, this array could have
// 1 million objects "grabbed" from the 5 source DBs.
import { updatedUarPic } from "../your-mock-data-path/uarPicMock";
async function runHighPerformanceSync(app) {
    app.log.info("Starting high-performance sync job...");
    // The "grabbed" data
    const sourceDataToSync = updatedUarPic;
    if (sourceDataToSync.length === 0) {
        app.log.info("No data to sync.");
        return;
    }
    try {
        // Run all 3 steps in a transaction. If one fails, all are rolled back.
        await app.prisma.$transaction([
            // === STEP 1: Truncate (empty) the staging table ===
            // We use raw SQL for speed.
            app.prisma.$executeRawUnsafe(`TRUNCATE TABLE "StagingUarPic"`),
            // === STEP 2: Load (Bulk Insert) ===
            // Dump ALL source data into the staging table in one go.
            // This is ONE fast query, not a loop.
            app.prisma.stagingUarPic.createMany({
                data: sourceDataToSync,
                skipDuplicates: true, // Ignore any duplicate IDs *in the source data*
            }),
            // === STEP 3: Transform (Compare and Update) ===
            // This single query does all the work.
            // It joins the main table with the staging table.
            // 3a. UPDATE existing records
            // (This syntax is for PostgreSQL)
            app.prisma.$executeRawUnsafe(`
        UPDATE "UarPic" main
        SET
          PIC_NAME = stage.PIC_NAME,
          DIVISION_ID = stage.DIVISION_ID,
          MAIL = stage.MAIL,
          CHANGED_BY = 'sync_job',
          CHANGED_DT = NOW()
        FROM "StagingUarPic" stage
        WHERE main.ID = stage.ID;
      `),
            // 3b. INSERT new records
            // (This syntax is for PostgreSQL)
            app.prisma.$executeRawUnsafe(`
        INSERT INTO "UarPic" (ID, PIC_NAME, DIVISION_ID, MAIL, CREATED_BY, CREATED_DT)
        SELECT 
          ID, 
          PIC_NAME, 
          DIVISION_ID, 
          MAIL, 
          'sync_job', 
          NOW()
        FROM "StagingUarPic" stage
        WHERE NOT EXISTS (
          SELECT 1 FROM "UarPic" main WHERE main.ID = stage.ID
        );
      `),
        ]);
        app.log.info("High-performance sync complete!");
    }
    catch (error) {
        app.log.error(error, "High-performance sync failed");
    }
}
;
