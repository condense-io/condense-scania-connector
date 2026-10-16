// Handler: drivertimes
import { getDriverTimes } from "../scaniaRfmsClient.js";
import { normalizeData } from "../normalizer.js";
import { sendToKafka } from "../kafka.js";
import {
  calculateTimeRange,
  formatErrorMessage,
  getEnvVar,
} from "../utils.js";

const RESOURCE = "drivertimes";

const pollDriverTimes = async (pollingInterval, initialDataHours) => {
  try {
    console.log("Driver Times endpoint is enabled");

    const outputTopic = getEnvVar("KAFKA_TOPIC");
    const tenantId = getEnvVar("TENANT_ID");

    // Driver times are fleet-wide (not VIN-specific)
    console.log("Fetching driver times data for all drivers in the fleet");

    const { startTime, stopTime } = calculateTimeRange(true, pollingInterval, initialDataHours);

    const data = await getDriverTimes(startTime, stopTime);
    console.log(`Received ${data.length} driver times records from Scania rFMS`);

    if (!data || data.length === 0) {
      console.log("No new data for Driver Times");
      return;
    }

    const normalizedData = await normalizeData(data, RESOURCE, tenantId);
    console.log(`Normalized to ${normalizedData.length} records`);

    await sendToKafka(normalizedData, outputTopic);
    console.log(`Driver Times: ${normalizedData.length} records published to ${outputTopic}`);
  } catch (error) {
    console.error(`Driver Times polling failed: ${formatErrorMessage(error)}`);
  }
};

const startDriverTimesPolling = (pollingInterval, initialDataHours) => {
  console.log("Starting Driver Times polling...");
  pollDriverTimes(pollingInterval, initialDataHours);
  const intervalId = setInterval(() => {
    pollDriverTimes(pollingInterval, initialDataHours);
  }, pollingInterval);
  console.log(`Driver Times polling set up every ${pollingInterval / 1000}s`);
  return intervalId;
};

const stopDriverTimesPolling = (intervalId) => {
  if (intervalId) {
    clearInterval(intervalId);
    console.log("Driver Times polling stopped");
  }
};

export { pollDriverTimes, startDriverTimesPolling, stopDriverTimesPolling };
