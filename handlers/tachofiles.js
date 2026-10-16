// Handler: tachoFiles
import { getTachoFiles } from "../scaniaRfmsClient.js";
import { normalizeData } from "../normalizer.js";
import { sendToKafka } from "../kafka.js";
import {
  calculateTimeRange,
  formatErrorMessage,
  parseEnvArray,
  validateIds,
  getEnvVar,
} from "../utils.js";

const RESOURCE = "tachoFiles";

const pollTachoFiles = async (pollingInterval, initialDataHours) => {
  try {
    console.log("Tacho Files endpoint is enabled");

    const vins = validateIds(parseEnvArray("SCANIA_VINS"));
    const outputTopic = getEnvVar("KAFKA_TOPIC");
    const tenantId = getEnvVar("TENANT_ID");

    console.log(`Processing ${vins.length > 0 ? vins.length : "all"} VINs for Tacho Files`);

    const { startTime, stopTime } = calculateTimeRange(true, pollingInterval, initialDataHours);

    const data = await getTachoFiles(startTime, stopTime, vins);
    console.log(`Received ${data.length} tacho file records from Scania rFMS`);

    if (!data || data.length === 0) {
      console.log("No new data for Tacho Files");
      return;
    }

    const normalizedData = await normalizeData(data, RESOURCE, tenantId);
    console.log(`Normalized to ${normalizedData.length} records`);

    await sendToKafka(normalizedData, outputTopic);
    console.log(`Tacho Files: ${normalizedData.length} records published to ${outputTopic}`);
  } catch (error) {
    console.error(`Tacho Files polling failed: ${formatErrorMessage(error)}`);
  }
};

const startTachoFilesPolling = (pollingInterval, initialDataHours) => {
  console.log("Starting Tacho Files polling...");
  pollTachoFiles(pollingInterval, initialDataHours);
  const intervalId = setInterval(() => {
    pollTachoFiles(pollingInterval, initialDataHours);
  }, pollingInterval);
  console.log(`Tacho Files polling set up every ${pollingInterval / 1000}s`);
  return intervalId;
};

const stopTachoFilesPolling = (intervalId) => {
  if (intervalId) {
    clearInterval(intervalId);
    console.log("Tacho Files polling stopped");
  }
};

export { pollTachoFiles, startTachoFilesPolling, stopTachoFilesPolling };
