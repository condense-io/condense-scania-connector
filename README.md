# Condense Scania Connector

A Node.js polling service that connects to the Scania API and publishes data to Kafka.

## Overview

This service polls the Scania API for vehicle telematics and other data, normalizes it to the Condense schema, and publishes it to a Kafka topic.

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `TENANT_ID` | Yes | Scania tenant identifier |
| `SCANIA_VINS` | No | Comma-separated list of VINs to filter (empty = all) |
| `RESOURCE` | Yes | Resource to poll (see supported resources below) |
| `POLLING_FREQUENCY` | Yes | Polling interval in seconds (minimum 60) |
| `OUTPUT_TOPIC` | Yes | Kafka topic to publish data to |
| `SCANIA_API_URL` | Yes | Scania API base URL |
| `SCANIA_AUTH_URL` | Yes | Scania OAuth token endpoint base URL |
| `SCANIA_CLIENT_ID` | Yes | OAuth client ID |
| `SCANIA_CLIENT_SECRET` | Yes | OAuth client secret |
| `SCANIA_INTEGRATION_ID` | No | Partner integration ID (for partner_integration grant) |
| `KAFKA_BROKERS` | Yes | Comma-separated Kafka broker addresses |
| `KAFKA_CLIENT_ID` | No | Kafka client identifier |
| `KAFKA_USERNAME` | No | Kafka SASL username |
| `KAFKA_PASSWORD` | No | Kafka SASL password |

## Supported Resources

- `telematics` — IoT Events (vehicle telemetry data)
- `vehicle` — Asset/vehicle master data
- `driver_data` — Driver information
- `driving_times` — Driver activity and driving times
- `maintenance` — Maintenance components
- `perform` — Performance data
- `tachograph` — Tachograph files
- `fvl` — Transport orders (Finished Vehicle Logistics)
- `man_datapackage_s` — MAN DataPackage S vehicle data
- `asset_events` — Asset lifecycle events (created/updated/deleted)
- `order_exchange` — Order exchange transport orders

## Running

```bash
npm install
npm start
```

## Docker

```bash
docker build -t condense-scania-connector .
docker run --env-file .env condense-scania-connector
```
