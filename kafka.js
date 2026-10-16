// Load environment variables from .env file
import dotenv from "dotenv";
dotenv.config();
import { Kafka } from "kafkajs";
import { formatErrorMessage } from "./utils.js";

// Kafka configuration from environment variables
const kafkaConfig = {
  // Required configuration - will throw error if not set
  brokers: process.env.KAFKA_BROKERS?.split(",")
    .map((b) => b.trim())
    .filter((b) => b.length > 0) || [
    process.env.KAFKA_BROKERS || "localhost:9092",
  ],
  topic: process.env.KAFKA_TOPIC || process.env.PUBLISH_TOPIC,
  clientId: process.env.KAFKA_CLIENT_ID || `scania-api-service-${Date.now()}`,

  // Optional configuration - can be empty
  username: process.env.KAFKA_USERNAME || "",
  password: process.env.KAFKA_PASSWORD || "",
};

// Create Kafka instance with optional SASL authentication
const kafkaConfigForKafka = {
  clientId: kafkaConfig.clientId,
  brokers: kafkaConfig.brokers,
  connectionTimeout: 5000, // 5 second timeout
  requestTimeout: 30000,
};

// Add SASL configuration if username and password are provided
if (kafkaConfig.username && kafkaConfig.password) {
  kafkaConfigForKafka.sasl = {
    mechanism: "scram-sha-512",
    username: kafkaConfig.username,
    password: kafkaConfig.password,
  };
}

const kafka = new Kafka(kafkaConfigForKafka);

// Create producer
const producer = kafka.producer();

// Connection status
let isConnected = false;

// Store active intervals for cleanup
let activeIntervals = {};

// Connect to Kafka
const connect = async () => {
  try {
    if (!isConnected) {
      await producer.connect();
      isConnected = true;
      console.log("Connected to Kafka");
    }
  } catch (error) {
    console.log(`Failed to connect to Kafka: ${formatErrorMessage(error)}`);
    throw error;
  }
};

// Disconnect from Kafka
const disconnect = async () => {
  try {
    if (isConnected) {
      await producer.disconnect();
      isConnected = false;
      console.log("Disconnected from Kafka");
    }
  } catch (error) {
    console.log(`Error disconnecting from Kafka: ${formatErrorMessage(error)}`);
  }
};

// Send data to Kafka
const sendToKafka = async (data, topic = kafkaConfig.topic) => {
  try {
    if (!isConnected) {
      await connect();
    }

    if (!data || data.length === 0) {
      console.log("No data to send to Kafka");
      return;
    }

    // Handle both normalized Condense schema and raw data
    const messages = data.map((item) => {
      // If item is already in Condense schema, use vin from it
      // Otherwise, try to extract vin from payload or item itself
      const vin = item.vin || item.payload?.vin || item.vehicleId || "unknown";
      return {
        key: vin,
        value: JSON.stringify(item),
      };
    });

    await producer.send({
      topic,
      messages,
    });

    console.log(`Sent ${messages.length} messages to Kafka topic: ${topic}`);
  } catch (error) {
    console.log(`Failed to send to Kafka: ${formatErrorMessage(error)}`);
    throw error;
  }
};

// Get Kafka health status
const getHealthStatus = () => {
  return {
    connected: isConnected,
    topic: kafkaConfig.topic,
    brokers: kafkaConfig.brokers,
  };
};

// Update Kafka configuration
const updateConfig = (newConfig) => {
  Object.assign(kafkaConfig, newConfig);
  console.log("Kafka configuration updated");
};

// Get current Kafka configuration
const getConfig = () => {
  return { ...kafkaConfig };
};

// Check if Kafka is connected
const checkConnection = () => {
  return isConnected;
};

// Set active intervals for cleanup
const setActiveIntervals = (intervals) => {
  activeIntervals = intervals;
};

// Graceful shutdown helper
const stopActiveIntervals = () => {
  Object.entries(activeIntervals).forEach(([resource, intervalId]) => {
    if (intervalId) {
      clearInterval(intervalId);
      console.log(`Stopped polling for ${resource}`);
    }
  });
};

process.on("SIGINT", async () => {
  console.log("Shutting down (SIGINT)...");
  stopActiveIntervals();
  await disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("Shutting down (SIGTERM)...");
  stopActiveIntervals();
  await disconnect();
  process.exit(0);
});

process.on("uncaughtException", (error) => {
  console.log(`Uncaught Exception: ${error.message}`);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  console.log(`Unhandled Rejection: ${reason}`);
  process.exit(1);
});

export {
  connect,
  disconnect,
  sendToKafka,
  getHealthStatus,
  updateConfig,
  getConfig,
  checkConnection,
  setActiveIntervals,
};
