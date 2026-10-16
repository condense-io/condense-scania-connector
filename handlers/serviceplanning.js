// Handler: servicePlanning
import { getServicePlanning } from "../scaniaRfmsClient.js";
import { normalizeData } from "../normalizer.js";
import { sendToKafka } from "../kafka.js";
import {
  calculateTimeRange,
  formatErrorMessage,
  parseEnvArray,
  validateIds,
  getEnvVar,
} from "../utils.js";

const RESOURCE = "servicePlanning";

const pollServicePlanning = async (pollingInterval, initialDataHours) => {
  try {
    console.log("Service Planning endpoint is enabled");

    const vins = validateIds(parseEnvArray("SCANIA_VINS"));
    const outputTopic = getEnvVar("KAFKA_TOPIC");
    const tenantId = getEnvVar("TENANT_ID");

    console.log(`Processing ${vins.length > 0 ? vins.length : "all"} VINs for Service Planning`);

    const { startTime, stopTime } = calculateTimeRange(true, pollingInterval, initialDataHours);

    const data = await getServicePlanning(startTime, stopTime, vins);
    console.log(`Received ${data.length} service planning records from Scania rFMS`);

    if (!data || data.length === 0) {
      console.log("No new data for Service Planning");
      return;
    }

    const normalizedData = await normalizeData(data, RESOURCE, tenantId);
    console.log(`Normalized to ${normalizedData.length} records`);

    await sendToKafka(normalizedData, outputTopic);
    console.log(`Service Planning: ${normalizedData.length} records published to ${outputTopic}`);
  } catch (error) {
    console.error(`Service Planning polling failed: ${formatErrorMessage(error)}`);
  }
};

const startServicePlanningPolling = (pollingInterval, initialDataHours) => {
  console.log("Starting Service Planning polling...");
  pollServicePlanning(pollingInterval, initialDataHours);
  const intervalId = setInterval(() => {
    pollServicePlanning(pollingInterval, initialDataHours);
  }, pollingInterval * 1000);
  console.log(`Service Planning polling set up every ${pollingInterval}s`);
  return intervalId;
};

const stopServicePlanningPolling = (intervalId) => {
  if (intervalId) {
    clearInterval(intervalId);
    console.log("Service Planning polling stopped");
  }
};

export { pollServicePlanning, startServicePlanningPolling, stopServicePlanningPolling };
