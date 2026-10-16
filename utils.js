// Common utility functions used across the application

// Calculate time range for API calls
export const calculateTimeRange = (
  isFirstRun = false,
  pollingInterval = 60,
  initialDataHours = 1,
) => {
  const now = new Date();
  const stopTime = now.toISOString();

  let startTime;
  if (isFirstRun) {
    startTime = new Date(
      now.getTime() - initialDataHours * 60 * 60 * 1000,
    ).toISOString();
    console.log(`First run – fetching ${initialDataHours} hours of historical data`);
  } else {
    startTime = new Date(now.getTime() - pollingInterval * 1000).toISOString();
  }

  return { startTime, stopTime };
};

// Parse comma-separated environment variable to array
export const parseEnvArray = (envVar) => {
  const value = process.env[envVar];

  if (!value || value.trim() === "") {
    return [];
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0 && item !== "undefined");
};

// Validate IDs/VINs array – filters out any undefined, null, or empty values
export const validateIds = (ids) => {
  if (!Array.isArray(ids)) return [];
  return ids.filter(
    (id) => id && id.trim && id.trim().length > 0 && id !== "undefined",
  );
};

// Parse environment variable to integer
export const parseEnvInt = (envVar, defaultValue = null) => {
  const value = process.env[envVar];

  if (!value) {
    if (defaultValue !== null) return defaultValue;
    throw new Error(`Required environment variable ${envVar} is not set`);
  }

  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(
      `Environment variable ${envVar} must be a valid integer, got: ${value}`,
    );
  }

  return parsed;
};

// Get a required environment variable value (throws if missing)
export const getEnvVar = (key) => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value;
};

// Format error message for logging
export const formatErrorMessage = (error) => {
  if (error.response) {
    return `${error.message} - Status: ${
      error.response.status
    }, Data: ${JSON.stringify(error.response.data)}`;
  }
  return error.message;
};

export function formatDateToYYYYMMDDHHMM(dateString) {
  const date = new Date(dateString);

  return (
    date.getUTCFullYear().toString() +
    String(date.getUTCMonth() + 1).padStart(2, "0") +
    String(date.getUTCDate()).padStart(2, "0") +
    String(date.getUTCHours()).padStart(2, "0") +
    String(date.getUTCMinutes()).padStart(2, "0")
  );
}

export function formatDateToYYYYMMDDHHMMSS(dateString) {
  const date = new Date(dateString);

  return (
    date.getUTCFullYear().toString() +
    String(date.getUTCMonth() + 1).padStart(2, "0") +
    String(date.getUTCDate()).padStart(2, "0") +
    String(date.getUTCHours()).padStart(2, "0") +
    String(date.getUTCMinutes()).padStart(2, "0") +
    String(date.getUTCSeconds()).padStart(2, "0")
  );
}