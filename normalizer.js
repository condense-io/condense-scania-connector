// Data normalization - transforms Scania rFMS 4.0 API responses to Condense schema
// Schema: { tenant_id, vin, product, timestamp, payload }

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Extract VIN from an rFMS record.
 * All vehicle-centric rFMS resources carry a top-level `vin` field.
 * Driver-centric resources may expose it via a nested `vehicle` object.
 */
const extractVin = (item) => {
  if (item.vin) return item.vin;
  if (item.vehicle?.vin) return item.vehicle.vin;
  return "unknown";
};

/**
 * Extract the best-fit timestamp from an rFMS record.
 * rFMS 4.0 uses several field names depending on the resource.
 */
const extractTimestamp = (item) => {
  return (
    item.receivedDateTime ||
    item.createdDateTime ||
    item.startDateTime ||
    item.activityDateTime ||
    item.generationDateTime ||
    item.plannedDate ||
    item.calendarDayStart ||
    item.timestamp ||
    new Date().toISOString()
  );
};

// ─── Per-resource normalizers ─────────────────────────────────────────────────

const normalizeVehicleStatuses = (data, tenantId) => {
  if (!Array.isArray(data)) data = [data];
  return data.map((item) => ({
    tenant_id: tenantId,
    vin: extractVin(item),
    product: "vehiclestatuses",
    timestamp: extractTimestamp(item),
    payload: item,
  }));
};

const normalizeVehiclePositions = (data, tenantId) => {
  if (!Array.isArray(data)) data = [data];
  return data.map((item) => ({
    tenant_id: tenantId,
    vin: extractVin(item),
    product: "vehiclepositions",
    timestamp: extractTimestamp(item),
    payload: item,
  }));
};

const normalizeServicePlanning = (data, tenantId) => {
  if (!Array.isArray(data)) data = [data];
  return data.map((item) => ({
    tenant_id: tenantId,
    vin: item.vin || "unknown",
    product: "serviceplanning",
    timestamp: item.scheduleDate || item.performedDate || new Date().toISOString(),
    payload: item,
  }));
};

const normalizeVehicleEvaluation = (data, tenantId) => {
  if (!Array.isArray(data)) data = [data];
  return data.map((item) => ({
    tenant_id: tenantId,
    vin: item.Vin || "unknown",
    product: "vehicleevaluation",
    timestamp: item.StartDate || item.StopDate || new Date().toISOString(),
    payload: item,
  }));
};

const normalizeExceptions = (data, tenantId) => {
  if (!Array.isArray(data)) data = [data];
  return data.map((item) => ({
    tenant_id: tenantId,
    vin: item.VehicleExceptionHeader?.Vin || "unknown",
    product: "exceptions",
    timestamp: item.VehicleExceptions?.[0]?.MessageTime || new Date().toISOString(),
    payload: item,
  }));
};

/**
 * Driver times are driver-centric; VIN may be absent.
 * Falls back to driverId when no vehicle VIN is present.
 */
// const normalizeDriverTimes = (data, tenantId) => {
//   if (!Array.isArray(data)) data = [data];
//   return data.map((item) => ({
//     tenant_id: tenantId,
//     vin: item.vin || item.vehicle?.vin || item.driverId || "unknown",
//     product: "drivertimes",
//     timestamp: extractTimestamp(item),
//     payload: item,
//   }));
// };

// const normalizeDriverEvaluation = (data, tenantId) => {
//   if (!Array.isArray(data)) data = [data];
//   return data.map((item) => ({
//     tenant_id: tenantId,
//     vin: item.vin || item.vehicle?.vin || item.driverId || "unknown",
//     product: "driverevaluation",
//     timestamp: extractTimestamp(item),
//     payload: item,
//   }));
// };

// const normalizeTachoFiles = (data, tenantId) => {
//   if (!Array.isArray(data)) data = [data];
//   return data.map((item) => ({
//     tenant_id: tenantId,
//     vin: extractVin(item),
//     product: "tachofiles",
//     timestamp: extractTimestamp(item),
//     payload: item,
//   }));
// };

/**
 * Driver card activities are driver-centric; VIN may be absent.
 * Falls back to driverCardNumber / driverId when no VIN is present.
 */
// const normalizeDriverCardActivities = (data, tenantId) => {
//   if (!Array.isArray(data)) data = [data];
//   return data.map((item) => ({
//     tenant_id: tenantId,
//     vin:
//       item.vin ||
//       item.vehicle?.vin ||
//       item.driverCardNumber ||
//       item.driverId ||
//       "unknown",
//     product: "drivercardactivities",
//     timestamp: extractTimestamp(item),
//     payload: item,
//   }));
// };

// ─── Dispatch ─────────────────────────────────────────────────────────────────

const normalizers = {
  vehiclestatuses: normalizeVehicleStatuses,
  vehiclepositions: normalizeVehiclePositions,
  serviceplanning: normalizeServicePlanning,
  vehicleevaluation: normalizeVehicleEvaluation,
  exceptions: normalizeExceptions,
  // drivertimes: normalizeDriverTimes,
  // driverevaluation: normalizeDriverEvaluation,
  // tachofiles: normalizeTachoFiles,
  // drivercardactivities: normalizeDriverCardActivities,
};

/**
 * Normalize Scania rFMS data to the Condense schema.
 *
 * @param {Array|object} data     - Raw records from the rFMS API
 * @param {string}       resource - Resource name (case-insensitive)
 * @param {string}       tenantId
 * @returns {Promise<Array>}
 */
export const normalizeData = async (data, resource, tenantId) => {
  const normalizer = normalizers[resource.toLowerCase()];

  if (!normalizer) {
    const items = Array.isArray(data) ? data : [data];
    return items.map((item) => ({
      tenant_id: tenantId,
      vin: extractVin(item),
      product: resource.toLowerCase(),
      timestamp: extractTimestamp(item),
      payload: item,
    }));
  }

  return normalizer(data, tenantId);
};
