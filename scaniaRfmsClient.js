// Scania rFMS API Client
// Calls the Scania Fleet Management System (rFMS 4.0) REST API
// Authentication via challenge-response (auth.js)
import axios from "axios";
import { getScaniaToken } from "./auth.js";
import { formatDateToYYYYMMDDHHMM, formatDateToYYYYMMDDHHMMSS } from "./utils.js";

const BASE_URL = () => process.env.SCANIA_BASE_URL || "https://dataaccess.scania.com";
const CLIENT_ID = () => process.env.SCANIA_CLIENT_ID || "";
const CLIENT_SECRET = () => process.env.SCANIA_CLIENT_SECRET || "";

const API_TIMEOUT_MS = 30000;

/** Convert an ISO datetime string to YYYY-MM-DD (required by CS endpoints) */
function toDateOnly(isoString) {
  return isoString.slice(0, 10);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getAuthHeaders(rfmsVersion = null) {
  const token = await getScaniaToken(CLIENT_ID(), CLIENT_SECRET());
  let accept;
  if (!rfmsVersion) {
    accept = "application/json";
  } else if (rfmsVersion.includes("/")) {
    // Full content-type passed directly (e.g. application/vnd.fmsstandard.com.tachofiles...)
    accept = rfmsVersion;
  } else {
    // Short rfms version suffix (e.g. vehiclestatuses.v4.0)
    accept = `application/json; rfms=${rfmsVersion}`;
  }
  return {
    Authorization: `Bearer ${token}`,
    Accept: accept,
    "Content-Type": "application/json",
  };
}

/**
 * Fetch all pages from an rFMS endpoint.
 * Uses `lastVin` + `moreDataAvailable` for pagination.
 *
 * @param {string} path - e.g. "/rfms4/vehiclestatuses"
 * @param {string} rfmsVersion - e.g. "vehiclestatuses.v4.0"
 * @param {object} baseParams - query parameters (startTime, stopTime, vin …)
 * @returns {Promise<Array>} flat array of records
 */
async function fetchAllPages(path, rfmsVersion, baseParams = {}) {
  const allRecords = [];
  let params = { ...baseParams };
  let moreDataAvailable = true;

  while (moreDataAvailable) {
    const headers = await getAuthHeaders(rfmsVersion);
    const response = await axios.get(`${BASE_URL()}${path}`, {
      headers,
      params,
      timeout: API_TIMEOUT_MS,
    });

    const data = response.data;

    // Extract records from the rFMS response envelope
    const records = extractRecords(data, path);
    allRecords.push(...records);

    moreDataAvailable = data.moreDataAvailable === true;

    if (moreDataAvailable) {
      // Use the last VIN as the cursor for the next page
      const lastRecord = records[records.length - 1];
      const lastVin = lastRecord?.vin || null;
      if (!lastVin) {
        console.warn(`${path}: moreDataAvailable=true but no lastVin found; stopping`);
        break;
      }
      params = { ...params, lastVin };
    }
  }

  return allRecords;
}

function extractRecords(data, path) {
  const envelopeMap = {
    // One-key: data[key0] is the array directly (vehicleStatusResponse and vehiclePositionResponse are both direct arrays)
    "/rfms4/vehiclestatuses": ["vehicleStatusResponse"],
    "/rfms4/vehiclepositions": ["vehiclePositionResponse"],
    // "/cs/driver/reports/DriverEvaluationReport/v2": ["driverEvaluationResponse", "driverEvaluations"],
    // "/tachograph/drivercardactivities": ["driverCardActivitiesResponse", "driverCardActivities"],
    // "/tachograph/rfms/tachofiles": ["tachoFilesResponse", "tachoFiles"],
    // "/rfms4/driverTimes": ["driverTimesResponse", "driverTimes"],
  };

  const keys = envelopeMap[path];
  if (keys) {
    const first = data[keys[0]];
    if (Array.isArray(first)) return first;                              // one-key: direct array
    if (keys[1] && first && Array.isArray(first[keys[1]])) return first[keys[1]]; // two-key: nested
  }

  // Fallback: handle flat array or items array
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.items)) return data.items;

  return [];
}

// ─── Resource fetch functions ─────────────────────────────────────────────────

/**
 * @param {string} startTime - ISO 8601
 * @param {string} stopTime  - ISO 8601
 * @param {string[]} vins    - optional VIN filter
 */
export async function getVehicleStatuses(startTime, stopTime, vins = []) {
  const params = { starttime: startTime, stoptime: stopTime };
  if (vins.length > 0) params.vin = vins.join(",");
  const records = await fetchAllPages(
    "/rfms4/vehiclestatuses",
    "vehiclestatuses.v4.0",
    params,
  );
  return records;
}

export async function getVehiclePositions(startTime, stopTime, vins = []) {
  const params = { starttime: startTime, stoptime: stopTime };
  if (vins.length > 0) params.vin = vins.join(",");
  const records = await fetchAllPages(
    "/rfms4/vehiclepositions",
    "vehiclepositions.v4.0",
    params,
  );
  return records;
}

export async function getServicePlanning(startTime, stopTime, vins = []) {
  const params = {
    startDateTime: new Date(startTime).toISOString().slice(0, 19),
    endDateTime: new Date(stopTime).toISOString().slice(0, 19),
  };
  if (vins.length > 0) params.vinOrChassisNumber = vins.join(",");

  const headers = await getAuthHeaders(null);
  const response = await axios.get(
    `${BASE_URL()}/cs/serviceplanning/maintenanceactivity/v1`,
    { headers, params, timeout: API_TIMEOUT_MS },
  );

  return Array.isArray(response.data) ? response.data : [];
}

export async function getVehicleEvaluation(startTime, stopTime, vins = []) {
  const params = { startDate: formatDateToYYYYMMDDHHMM(startTime), endDate: formatDateToYYYYMMDDHHMM(stopTime) };
  if (vins.length > 0) params.vinOfInterest = vins.join(",");

  const headers = await getAuthHeaders(null);
  const response = await axios.get(
    `${BASE_URL()}/cs/vehicle/reports/VehicleEvaluationReport/v2`,
    { headers, params, timeout: API_TIMEOUT_MS },
  );

  const data = response.data;

  // MoreDataAvailable is a string per the Scania CS API spec (not boolean)
  if (data.MoreDataAvailable === "true" || data.MoreDataAvailable === true) {
    console.warn(
      "VehicleEvaluation: MoreDataAvailable=true — API caps at 1000 records with no pagination cursor. Consider narrowing the date range.",
    );
  }

  return Array.isArray(data.EvaluationVehicles) ? data.EvaluationVehicles : [];
}

export async function getExceptions(startDate, endDate, vins = []) {
  const params = {
    startDate: formatDateToYYYYMMDDHHMMSS(startDate),
    endDate: formatDateToYYYYMMDDHHMMSS(endDate),
  };
  if (vins.length > 0) params.vinOfInterest = vins.join(",");

  const allRecords = [];
  let offset = 0;
  const pageSize = 2000;

  while (true) {
    const headers = await getAuthHeaders(null);
    const response = await axios.get(
      `${BASE_URL()}/cs/vehicle/exception/history/v1`,
      { headers, params: { ...params, limit: pageSize, offset }, timeout: API_TIMEOUT_MS },
    );

    const data = response.data;
    const records = Array.isArray(data.VehicleExceptionInformations)
      ? data.VehicleExceptionInformations
      : [];
    allRecords.push(...records);

    // MoreDataAvailable is a string per Scania CS API spec
    if (data.MoreDataAvailable !== "True" && data.MoreDataAvailable !== true) break;

    offset += pageSize;
  }

  return allRecords;
}

// export async function getDriverTimes(startTime, stopTime, vins = []) {
//   const params = { startTime, stopTime };
//   const records = await fetchAllPages(
//     "/rfms4/driverTimes",
//     null,
//     params,
//   );
//   return records;
// }

// export async function getDriverEvaluation(startTime, stopTime, vins = []) {
//   const params = { startDate: toDateOnly(startTime), endDate: toDateOnly(stopTime) };
//   const records = await fetchAllPages(
//     "/cs/driver/reports/DriverEvaluationReport/v2",
//     null,
//     params,
//   );
//   return records;
// }

// export async function getTachoFiles(starttime, stoptime, vins = []) {
//   const params = { starttime, stoptime };
//   if (vins.length > 0) params.vin = vins.join(",");
//   const records = await fetchAllPages(
//     "/tachograph/rfms/tachofiles",
//     'application/vnd.fmsstandard.com.tachofiles.v1.0+json; UTF-8',
//     params,
//   );
//   return records;
// }

// export async function getDriverCardActivities(starttime, stoptime, vins = []) {
//   const params = { starttime, stoptime };
//   const records = await fetchAllPages(
//     "/tachograph/drivercardactivities",
//     'application/vnd.fmsstandard.com.drivercardactivities.v1.0+json; UTF-8',
//     params,
//   );
//   return records;
// }
