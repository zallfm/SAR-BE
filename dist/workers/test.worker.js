export async function runWorker(app) {
    app.log.info("Ticker: Checking for jobs...");
    const now = new Date();
    try {
        app.log.info("Ticker: Fetching pending schedules...");
    }
    catch (error) {
        app.log.error(error, "Ticker: A fatal error occurred during the run.");
    }
}
