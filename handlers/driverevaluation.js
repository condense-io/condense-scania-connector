// Handler: driverEvaluation
import { getDriverEvaluation } from "../scaniaRfmsClient.js";
import { normalizeData } from "../normalizer.js";
import { sendToKafka } from "../kafka.js";
import {
  calculateTimeRange,
  formatErrorMessage,
  getEnvVar,
} from "../utils.js";

const RESOURCE = "driverEvaluation";

const pollDriverEvaluation = async (pollingInterval, initialDataHours) => {
  try {
    console.log("Driver Evaluation endpoint is enabled");

    const outputTopic = getEnvVar("KAFKA_TOPIC");
    const tenantId = getEnvVar("TENANT_ID");

    // Driver evaluation is fleet-wide (not VIN-specific)
    console.log("Fetching driver evaluation data for all drivers in the fleet");

    const { startTime, stopTime } = calculateTimeRange(true, pollingInterval, initialDataHours);

    const data = await getDriverEvaluation(startTime, stopTime);
    console.log(`Received ${data.length} driver evaluation records from Scania rFMS`);

    if (!data || data.length === 0) {
      console.log("No new data for Driver Evaluation");
      return;
    }

    const normalizedData = await normalizeData(data, RESOURCE, tenantId);
    console.log(`Normalized to ${normalizedData.length} records`);

    await sendToKafka(normalizedData, outputTopic);
    console.log(`Driver Evaluation: ${normalizedData.length} records published to ${outputTopic}`);
  } catch (error) {
    console.error(`Driver Evaluation polling failed: ${formatErrorMessage(error)}`);
  }
};

const startDriverEvaluationPolling = (pollingInterval, initialDataHours) => {
  console.log("Starting Driver Evaluation polling...");
  pollDriverEvaluation(pollingInterval, initialDataHours);
  const intervalId = setInterval(() => {
    pollDriverEvaluation(pollingInterval, initialDataHours);
  }, pollingInterval);
  console.log(`Driver Evaluation polling set up every ${pollingInterval / 1000}s`);
  return intervalId;
};

const stopDriverEvaluationPolling = (intervalId) => {
  if (intervalId) {
    clearInterval(intervalId);
    console.log("Driver Evaluation polling stopped");
  }
};

export { pollDriverEvaluation, startDriverEvaluationPolling, stopDriverEvaluationPolling };
