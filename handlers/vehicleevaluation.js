// Handler: vehicleEvaluation
import { getVehicleEvaluation } from "../scaniaRfmsClient.js";
import { normalizeData } from "../normalizer.js";
import { sendToKafka } from "../kafka.js";
import {
  calculateTimeRange,
  formatErrorMessage,
  parseEnvArray,
  validateIds,
  getEnvVar,
} from "../utils.js";

const RESOURCE = "vehicleEvaluation";

const pollVehicleEvaluation = async (pollingInterval, initialDataHours) => {
  try {
    console.log("Vehicle Evaluation endpoint is enabled");

    const vins = validateIds(parseEnvArray("SCANIA_VINS"));
    const outputTopic = getEnvVar("KAFKA_TOPIC");
    const tenantId = getEnvVar("TENANT_ID");

    console.log(`Processing ${vins.length > 0 ? vins.length : "all"} VINs for Vehicle Evaluation`);

    const { startTime, stopTime } = calculateTimeRange(true, pollingInterval, initialDataHours);

    const data = await getVehicleEvaluation(startTime, stopTime, vins);
    console.log(`Received ${data.length} vehicle evaluation records from Scania rFMS`);

    if (!data || data.length === 0) {
      console.log("No new data for Vehicle Evaluation");
      return;
    }

    const normalizedData = await normalizeData(data, RESOURCE, tenantId);
    console.log(`Normalized to ${normalizedData.length} records`);

    await sendToKafka(normalizedData, outputTopic);
    console.log(`Vehicle Evaluation: ${normalizedData.length} records published to ${outputTopic}`);
  } catch (error) {
    console.log("log error",error)
    console.error(`Vehicle Evaluation polling failed: ${formatErrorMessage(error)}`);
  }
};

const startVehicleEvaluationPolling = (pollingInterval, initialDataHours) => {
  console.log("Starting Vehicle Evaluation polling...");
  pollVehicleEvaluation(pollingInterval, initialDataHours);
  const intervalId = setInterval(() => {
    pollVehicleEvaluation(pollingInterval, initialDataHours);
  }, pollingInterval * 1000);
  console.log(`Vehicle Evaluation polling set up every ${pollingInterval}s`);
  return intervalId;
};

const stopVehicleEvaluationPolling = (intervalId) => {
  if (intervalId) {
    clearInterval(intervalId);
    console.log("Vehicle Evaluation polling stopped");
  }
};

export { pollVehicleEvaluation, startVehicleEvaluationPolling, stopVehicleEvaluationPolling };
