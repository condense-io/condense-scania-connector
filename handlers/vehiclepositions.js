// Handler: vehiclepositions
import { getVehiclePositions } from "../scaniaRfmsClient.js";
import { normalizeData } from "../normalizer.js";
import { sendToKafka } from "../kafka.js";
import {
  calculateTimeRange,
  formatErrorMessage,
  parseEnvArray,
  validateIds,
  getEnvVar,
} from "../utils.js";

const RESOURCE = "vehiclepositions";

const pollVehiclePositions = async (pollingInterval, initialDataHours) => {
  try {
    console.log("Vehicle Positions endpoint is enabled");

    const vins = validateIds(parseEnvArray("SCANIA_VINS"));
    const outputTopic = getEnvVar("KAFKA_TOPIC");
    const tenantId = getEnvVar("TENANT_ID");

    console.log(`Processing ${vins.length > 0 ? vins.length : "all"} VINs for Vehicle Positions`);

    const { startTime, stopTime } = calculateTimeRange(false, pollingInterval, initialDataHours);

    const data = await getVehiclePositions(startTime, stopTime, vins);
    console.log(`Received ${data.length} vehicle position records from Scania rFMS`);

    if (!data || data.length === 0) {
      console.log("No new data for Vehicle Positions");
      return;
    }

    const normalizedData = await normalizeData(data, RESOURCE, tenantId);
    console.log(`Normalized to ${normalizedData.length} records`);

    await sendToKafka(normalizedData, outputTopic);
    console.log(`Vehicle Positions: ${normalizedData.length} records published to ${outputTopic}`);
  } catch (error) {
    console.error(`Vehicle Positions polling failed: ${formatErrorMessage(error)}`);
  }
};

const startVehiclePositionsPolling = (pollingInterval, initialDataHours) => {
  console.log("Starting Vehicle Positions polling...");
  pollVehiclePositions(pollingInterval, initialDataHours);
  const intervalId = setInterval(() => {
    pollVehiclePositions(pollingInterval, initialDataHours);
  }, pollingInterval * 1000);
  console.log(`Vehicle Positions polling set up every ${pollingInterval}s`);
  return intervalId;
};

const stopVehiclePositionsPolling = (intervalId) => {
  if (intervalId) {
    clearInterval(intervalId);
    console.log("Vehicle Positions polling stopped");
  }
};

export { pollVehiclePositions, startVehiclePositionsPolling, stopVehiclePositionsPolling };
