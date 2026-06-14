import 'dotenv/config';

/**
 * Centralised runtime configuration, sourced from environment variables
 * with sensible local-dev defaults.
 */
export const config = {
  port: Number(process.env.PORT) || 8080,
  mongoUri: process.env.MONGO_URI ?? 'mongodb://localhost:27017/robot-fleet',

  /** How long raw telemetry samples are retained before MongoDB TTL-expires them. */
  telemetryRetentionSeconds:
    Number(process.env.TELEMETRY_RETENTION_SECONDS) || 7 * 24 * 60 * 60, // 7 days

  /** uWS pub/sub topic that dashboard clients subscribe to for live fleet updates. */
  dashboardTopic: 'fleet',
} as const;
