import {
  startVehicleStatusesPolling,
  stopVehicleStatusesPolling,
} from "./vehiclestatuses.js";
import {
  startVehiclePositionsPolling,
  stopVehiclePositionsPolling,
} from "./vehiclepositions.js";
import {
  startServicePlanningPolling,
  stopServicePlanningPolling,
} from "./serviceplanning.js";
import {
  startVehicleEvaluationPolling,
  stopVehicleEvaluationPolling,
} from "./vehicleevaluation.js";
import {
  startExceptionsPolling,
  stopExceptionsPolling,
} from "./exceptions.js";
// import {
//   startDriverTimesPolling,
//   stopDriverTimesPolling,
// } from "./drivertimes.js";
// import {
//   startDriverEvaluationPolling,
//   stopDriverEvaluationPolling,
// } from "./driverevaluation.js";
// import {
//   startTachoFilesPolling,
//   stopTachoFilesPolling,
// } from "./tachofiles.js";
// import {
//   startDriverCardActivitiesPolling,
//   stopDriverCardActivitiesPolling,
// } from "./drivercardactivities.js";

/**
 * Resource handler map – keys match the scaniaResources selectList in schema.sql
 */
export const resourceHandlers = {
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

/**
 * Get handler for a resource (exact match first, then case-insensitive fallback)
 */
export const getResourceHandler = (resource) => {
  if (resourceHandlers[resource]) return resourceHandlers[resource];
  const lower = resource.toLowerCase();
  const key = Object.keys(resourceHandlers).find((k) => k.toLowerCase() === lower);
  return key ? resourceHandlers[key] : null;
};
