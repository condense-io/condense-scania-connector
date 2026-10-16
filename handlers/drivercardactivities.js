// Handler: driverCardActivities
import { getDriverCardActivities } from "../scaniaRfmsClient.js";
import { normalizeData } from "../normalizer.js";
import { sendToKafka } from "../kafka.js";
import {
  calculateTimeRange,
  formatErrorMessage,
  getEnvVar,
} from "../utils.js";

const RESOURCE = "driverCardActivities";

const pollDriverCardActivities = async (pollingInterval, initialDataHours) => {
  try {
    console.log("Driver Card Activities endpoint is enabled");

    const outputTopic = getEnvVar("KAFKA_TOPIC");
    const tenantId = getEnvVar("TENANT_ID");

    // Driver card activities are fleet-wide (not VIN-specific)
    console.log("Fetching driver card activities for all drivers in the fleet");

    const { startTime, stopTime } = calculateTimeRange(false, pollingInterval, initialDataHours);

    const data = await getDriverCardActivities(startTime, stopTime);
    console.log(`Received ${data.length} driver card activity records from Scania rFMS`);

    if (!data || data.length === 0) {
      console.log("No new data for Driver Card Activities");
      return;
    }

    const normalizedData = await normalizeData(data, RESOURCE, tenantId);
    console.log(`Normalized to ${normalizedData.length} records`);

    await sendToKafka(normalizedData, outputTopic);
    console.log(`Driver Card Activities: ${normalizedData.length} records published to ${outputTopic}`);
  } catch (error) {
    console.error(`Driver Card Activities polling failed: ${formatErrorMessage(error)}`);
  }
};

const startDriverCardActivitiesPolling = (pollingInterval, initialDataHours) => {
  console.log("Starting Driver Card Activities polling...");
  pollDriverCardActivities(pollingInterval, initialDataHours);
  const intervalId = setInterval(() => {
    pollDriverCardActivities(pollingInterval, initialDataHours);
  }, pollingInterval);
  console.log(`Driver Card Activities polling set up every ${pollingInterval / 1000}s`);
  return intervalId;
};

const stopDriverCardActivitiesPolling = (intervalId) => {
  if (intervalId) {
    clearInterval(intervalId);
    console.log("Driver Card Activities polling stopped");
  }
};

export { pollDriverCardActivities, startDriverCardActivitiesPolling, stopDriverCardActivitiesPolling };
