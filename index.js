import dotenv from "dotenv";
dotenv.config();

import { getConfig as getKafkaConfig, setActiveIntervals } from "./kafka.js";
import { parseEnvInt, getEnvVar, formatErrorMessage } from "./utils.js";
import {
  startVehicleStatusesPolling,
  stopVehicleStatusesPolling,
} from "./handlers/vehiclestatuses.js";
import {
  startVehiclePositionsPolling,
  stopVehiclePositionsPolling,
} from "./handlers/vehiclepositions.js";
import {
  startServicePlanningPolling,
  stopServicePlanningPolling,
} from "./handlers/serviceplanning.js";
import {
  startVehicleEvaluationPolling,
  stopVehicleEvaluationPolling,
} from "./handlers/vehicleevaluation.js";
import {
  startExceptionsPolling,
  stopExceptionsPolling,
} from "./handlers/exceptions.js";
// import {
//   startDriverTimesPolling,
//   stopDriverTimesPolling,
// } from "./handlers/drivertimes.js";
// import {
//   startDriverEvaluationPolling,
//   stopDriverEvaluationPolling,
// } from "./handlers/driverevaluation.js";
// import {
//   startTachoFilesPolling,
//   stopTachoFilesPolling,
// } from "./handlers/tachofiles.js";
// import {
//   startDriverCardActivitiesPolling,
//   stopDriverCardActivitiesPolling,
// } from "./handlers/drivercardactivities.js";

const config = {
  endpointName: getEnvVar("SCANIA_ENDPOINT"),
  initialDataHours: process.env.INITIAL_DATA_HOURS
    ? parseEnvInt("INITIAL_DATA_HOURS")
    : 1,
  pollingInterval: parseEnvInt("POLLING_INTERVAL_MS"),
};

const activeIntervals = {};

const endpointHandlers = {
  vehiclestatuses: {
    start: startVehicleStatusesPolling,
    stop: stopVehicleStatusesPolling,
  },
  vehiclepositions: {
    start: startVehiclePositionsPolling,
    stop: stopVehiclePositionsPolling,
  },
  servicePlanning: {
    start: startServicePlanningPolling,
    stop: stopServicePlanningPolling,
  },
  vehicleEvaluation: {
    start: startVehicleEvaluationPolling,
    stop: stopVehicleEvaluationPolling,
  },
  exceptions: {
    start: startExceptionsPolling,
    stop: stopExceptionsPolling,
  },
  // drivertimes: {
  //   start: startDriverTimesPolling,
  //   stop: stopDriverTimesPolling,
  // },
  // driverEvaluation: {
  //   start: startDriverEvaluationPolling,
  //   stop: stopDriverEvaluationPolling,
  // },
  // tachoFiles: {
  //   start: startTachoFilesPolling,
  //   stop: stopTachoFilesPolling,
  // },
  // driverCardActivities: {
  //   start: startDriverCardActivitiesPolling,
  //   stop: stopDriverCardActivitiesPolling,
  // },
};

// Main application
const main = async () => {
  try {
    console.log("Starting Scania Connector...");

    const kafkaConfig = getKafkaConfig();
    console.log(`Kafka brokers: ${kafkaConfig.brokers.join(", ")}`);
    console.log(`Endpoint:      ${config.endpointName}`);
    console.log(`Polling:       ${config.pollingInterval / 1000}s`);
    console.log(`Initial data:  ${config.initialDataHours}h`);

    // Find the endpoint key (case-insensitive match)
    const endpointKey =
      Object.keys(endpointHandlers).find(
        (k) => k.toLowerCase() === config.endpointName.toLowerCase(),
      ) || config.endpointName;

    const handler = endpointHandlers[endpointKey];

    if (!handler) {
      console.log(`Unsupported endpoint: ${config.endpointName}`);
      console.log("Supported endpoints:");
      Object.keys(endpointHandlers).forEach((e) => console.log(`  - ${e}`));
      process.exit(1);
    }

    console.log(`Starting ${endpointKey} endpoint handler...`);

    switch (endpointKey) {
      case "vehiclestatuses":
        activeIntervals.vehicleStatuses = handler.start(
          config.pollingInterval,
          config.initialDataHours,
        );
        break;
      case "vehiclepositions":
        activeIntervals.vehiclePositions = handler.start(
          config.pollingInterval,
          config.initialDataHours,
        );
        break;
      case "servicePlanning":
        activeIntervals.servicePlanning = handler.start(
          config.pollingInterval,
          config.initialDataHours,
        );
        break;
      case "vehicleEvaluation":
        activeIntervals.vehicleEvaluation = handler.start(
          config.pollingInterval,
          config.initialDataHours,
        );
        break;
      case "exceptions":
        activeIntervals.exceptions = handler.start(
          config.pollingInterval,
          config.initialDataHours,
        );
        break;
      // case "drivertimes":
      //   activeIntervals.driverTimes = handler.start(
      //     config.pollingInterval,
      //     config.initialDataHours,
      //   );
      //   break;
      // case "driverEvaluation":
      //   activeIntervals.driverEvaluation = handler.start(
      //     config.pollingInterval,
      //     config.initialDataHours,
      //   );
      //   break;
      // case "tachoFiles":
      //   activeIntervals.tachoFiles = handler.start(
      //     config.pollingInterval,
      //     config.initialDataHours,
      //   );
      //   break;
      // case "driverCardActivities":
      //   activeIntervals.driverCardActivities = handler.start(
      //     config.pollingInterval,
      //     config.initialDataHours,
      //   );
      //   break;
      default:
        console.log(`No specific handler found for endpoint: ${endpointKey}`);
    }

    // Pass active intervals to Kafka module for graceful shutdown
    setActiveIntervals(activeIntervals);

    console.log("Scania Connector is running. Press Ctrl+C to stop.");
  } catch (error) {
    console.log(`Failed to start Scania Connector: ${formatErrorMessage(error)}`);
    process.exit(1);
  }
};

// Start the application
main();
