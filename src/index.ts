import cron from "node-cron";
import app from "./app";
import removeUngeneratedPlans from "./crons/removeUngeneratedPlans";
import removeTripsWithoutPlans from "./crons/removeTripsWithoutPlans";
import removeUngeneratedDestinations from "./crons/removeUngeneratedDestinations";

// Run every 5 minutes
cron.schedule("* 5 * * *", () => {
  console.log("Running cron job");
  (async () => {
    await removeUngeneratedPlans();
    console.log("Removed ungenerated plans");
    await removeTripsWithoutPlans();
    console.log("Removed trips without plans");
    await removeUngeneratedDestinations();
    console.log("Removed ungenerated destinations");
  })();
});

// Start the server
const port = process.env.PORT || 3300;
app.listen(port, () => {
  /* eslint-disable no-console */
  console.log(`Listening: http://localhost:${port}`);
  /* eslint-enable no-console */
});
