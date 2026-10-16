import "dotenv/config";
import axios from "axios";
import { getScaniaToken } from "./auth.js";
import {
  getVehicleStatuses, getVehiclePositions, getServicePlanning, getVehicleEvaluation, getExceptions, 
//   getDriverTimes, getDriverEvaluation, getTachoFiles, getDriverCardActivities
} from "./scaniaRfmsClient.js";

const now = new Date();
const start = new Date(now - 24 * 10 * 60 * 60 * 1000).toISOString();
const stop = now.toISOString();

// Simulate VINs coming from env (SCANIA_VINS)
const vins = ["YS2RKSTO01TT00068", "YS2R4X2000TT00396"];

console.log(`Time range: ${start} → ${stop}`);
console.log(`VINs: ${vins.join(", ")}\n`);

// ── 3. Full smoke test across all resources ───────────────────────────────────
console.log("\n=== SMOKE TEST (all resources) ===");
const resources = [
  ["vehiclestatuses",      () => getVehicleStatuses(start, stop, vins)],
  ["vehiclepositions",     () => getVehiclePositions(start, stop, vins)],
  ["servicePlanning",      () => getServicePlanning(start, stop, vins)],
  ["vehicleEvaluation",    () => getVehicleEvaluation(start, stop, vins)],
  ["exceptions",           () => getExceptions(start, stop, vins)]
];

for (const [name, fn] of resources) {
  try {
    const records = await fn();
    console.log(`✓ ${name}: ${records.length} records`);
  } catch (err) {
    if (err.response) {
      console.error(`✗ ${name}: HTTP ${err.response.status} — ${JSON.stringify(err.response.data)}`);
    } else {
      console.error(`✗ ${name}: ${err.message}`);
    }
  }
}