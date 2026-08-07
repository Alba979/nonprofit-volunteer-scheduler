import { createApp } from "./app";
import { config } from "./config";
import { logger } from "./utils/logger";
import { scheduleReminderJob } from "./jobs/reminder.job";

const app = createApp();

app.listen(config.port, () => {
  logger.info(`VolunteerShield API listening on port ${config.port} (${config.nodeEnv})`);
  scheduleReminderJob();
});
