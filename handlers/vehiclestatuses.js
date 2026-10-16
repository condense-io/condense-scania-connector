// Handler: vehiclestatuses
import { getVehicleStatuses } from "../scaniaRfmsClient.js";
import { normalizeData } from "../normalizer.js";
import { sendToKafka } from "../kafka.js";
import {
  calculateTimeRange,
  formatErrorMessage,
  parseEnvArray,
  validateIds,
  getEnvVar,
} from "../utils.js";

const RESOURCE = "vehiclestatuses";

const pollVehicleStatuses = async (pollingInterval, initialDataHours) => {
  try {
    console.log("Vehicle Statuses endpoint is enabled");

    const vins = validateIds(parseEnvArray("SCANIA_VINS"));
    const outputTopic = getEnvVar("KAFKA_TOPIC");
    const tenantId = getEnvVar("TENANT_ID");

    console.log(`Processing ${vins.length > 0 ? vins.length : "all"} VINs for Vehicle Statuses`);

    const { startTime, stopTime } = calculateTimeRange(false, pollingInterval, initialDataHours);

    const data = await getVehicleStatuses(startTime, stopTime, vins);
    console.log(`Received ${data.length} vehicle status records from Scania rFMS`);

    if (!data || data.length === 0) {
      console.log("No new data for Vehicle Statuses");
      return;
    }

    const normalizedData = await normalizeData(data, RESOURCE, tenantId);
    console.log(`Normalized to ${normalizedData.length} records`);

    await sendToKafka(normalizedData, outputTopic);
    console.log(`Vehicle Statuses: ${normalizedData.length} records published to ${outputTopic}`);
  } catch (error) {
    console.log("error",error)
    console.error(`Vehicle Statuses polling failed: ${formatErrorMessage(error)}`);
  }
};

const startVehicleStatusesPolling = (pollingInterval, initialDataHours) => {
  console.log("Starting Vehicle Statuses polling...");
  pollVehicleStatuses(pollingInterval, initialDataHours);
  const intervalId = setInterval(() => {
    pollVehicleStatuses(pollingInterval, initialDataHours);
  }, pollingInterval * 1000);
  console.log(`Vehicle Statuses polling set up every ${pollingInterval}s`);
  return intervalId;
};

const stopVehicleStatusesPolling = (intervalId) => {
  if (intervalId) {
    clearInterval(intervalId);
    console.log("Vehicle Statuses polling stopped");
  }
};

export { pollVehicleStatuses, startVehicleStatusesPolling, stopVehicleStatusesPolling };
