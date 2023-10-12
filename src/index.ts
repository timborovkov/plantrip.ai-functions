import cron from "node-cron";
import app from "./app";

// Run every 5 minutes
cron.schedule("* 5 * * *", () => {
  console.log("Running cron job");
});

// Start the server
const port = process.env.PORT || 3300;
app.listen(port, () => {
  /* eslint-disable no-console */
  console.log(`Listening: http://localhost:${port}`);
  /* eslint-enable no-console */
});
