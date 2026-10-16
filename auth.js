// Scania challenge-response authentication
// Mirrors the auth logic from condense-scania-rest-service
import axios from "axios";
import crypto from "crypto";

const REFRESH_BUFFER_MS = 5 * 60 * 1000; // 5 minutes before expiry

// In-memory token store (keyed by clientId)
const tokenStore = new Map();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function base64urlDecode(input) {
  let s = input.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4 !== 0) s += "=";
  return Buffer.from(s, "base64");
}

function base64urlEncode(buffer) {
  return buffer
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function createChallengeResponse(clientSecret, challenge) {
  const secretKeyBuffer = base64urlDecode(clientSecret);
  const challengeBuffer = base64urlDecode(challenge);
  const hmac = crypto
    .createHmac("sha256", secretKeyBuffer)
    .update(challengeBuffer)
    .digest();
  return base64urlEncode(hmac);
}

// ─── Auth API calls ───────────────────────────────────────────────────────────

async function getChallenge(clientId) {
  const body = new URLSearchParams({ clientId });
  const response = await axios.post(
    `${process.env.SCANIA_BASE_URL || "https://dataaccess.scania.com"}/auth/clientid2challenge`,
    body.toString(),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } },
  );
  console.log("Challenge received from Scania");
  return response.data;
}

async function generateNewToken(clientId, clientSecret) {
  const challengeRes = await getChallenge(clientId);
  const Response = createChallengeResponse(clientSecret, challengeRes.challenge);

  const body = new URLSearchParams({ clientId, Response });
  const response = await axios.post(
    `${process.env.SCANIA_BASE_URL || "https://dataaccess.scania.com"}/auth/response2token`,
    body.toString(),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } },
  );

  const data = response.data;
  return {
    accessToken: data.token,
    refreshToken: data.refreshToken,
    expiresAt: Date.now() + 55 * 60 * 1000, // 55 minutes
  };
}

async function doRefreshToken(clientId, refreshToken) {
  const body = new URLSearchParams({ clientId, refreshToken });
  const response = await axios.post(
    `${process.env.SCANIA_BASE_URL || "https://dataaccess.scania.com"}/auth/refreshtoken`,
    body.toString(),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } },
  );

  const data = response.data;
  return {
    accessToken: data.token,
    refreshToken: data.refreshToken,
    expiresAt: Date.now() + 55 * 60 * 1000,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Get a valid Scania access token for the given client credentials.
 * Uses in-memory caching with automatic refresh before expiry.
 *
 * @param {string} clientId
 * @param {string} clientSecret
 * @returns {Promise<string>} access token
 */
export async function getScaniaToken(clientId, clientSecret) {
  const cached = tokenStore.get(clientId);

  if (cached) {
    const shouldRefresh = Date.now() >= cached.expiresAt - REFRESH_BUFFER_MS;

    if (!shouldRefresh) {
      return cached.accessToken;
    }

    console.log("Token nearing expiry, refreshing...");
    if (cached.refreshToken) {
      try {
        const refreshed = await doRefreshToken(clientId, cached.refreshToken);
        tokenStore.set(clientId, refreshed);
        console.log("Token refreshed successfully");
        return refreshed.accessToken;
      } catch (err) {
        console.error("Refresh failed, generating new token:", err.message);
      }
    }
  }

  console.log("Generating new Scania token...");
  const newToken = await generateNewToken(clientId, clientSecret);
  tokenStore.set(clientId, newToken);
  console.log("New Scania token stored");
  return newToken.accessToken;
}
