// Handler: exceptions
import { getExceptions } from "../scaniaRfmsClient.js";
import { normalizeData } from "../normalizer.js";
import { sendToKafka } from "../kafka.js";
import {
  calculateTimeRange,
  formatErrorMessage,
  parseEnvArray,
  validateIds,
  getEnvVar,
} from "../utils.js";

const RESOURCE = "exceptions";

const pollExceptions = async (pollingInterval, initialDataHours) => {
  try {
    console.log("Exceptions endpoint is enabled");

    const vins = validateIds(parseEnvArray("SCANIA_VINS"));
    const outputTopic = getEnvVar("KAFKA_TOPIC");
    const tenantId = getEnvVar("TENANT_ID");

    console.log(`Processing ${vins.length > 0 ? vins.length : "all"} VINs for Exceptions`);

    const { startTime, stopTime } = calculateTimeRange(false, pollingInterval, initialDataHours);

    const data = await getExceptions(startTime, stopTime, vins);
    console.log(`Received ${data.length} exception records from Scania rFMS`);

    if (!data || data.length === 0) {
      console.log("No new data for Exceptions");
      return;
    }

    const normalizedData = await normalizeData(data, RESOURCE, tenantId);
    console.log(`Normalized to ${normalizedData.length} records`);

    await sendToKafka(normalizedData, outputTopic);
    console.log(`Exceptions: ${normalizedData.length} records published to ${outputTopic}`);
  } catch (error) {
    console.error(`Exceptions polling failed: ${formatErrorMessage(error)}`);
  }
};

const startExceptionsPolling = (pollingInterval, initialDataHours) => {
  console.log("Starting Exceptions polling...");
  pollExceptions(pollingInterval, initialDataHours);
  const intervalId = setInterval(() => {
    pollExceptions(pollingInterval, initialDataHours);
  }, pollingInterval * 1000);
  console.log(`Exceptions polling set up every ${pollingInterval}s`);
  return intervalId;
};

const stopExceptionsPolling = (intervalId) => {
  if (intervalId) {
    clearInterval(intervalId);
    console.log("Exceptions polling stopped");
  }
};

export { pollExceptions, startExceptionsPolling, stopExceptionsPolling };
