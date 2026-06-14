import { Schema, model, InferSchemaType } from 'mongoose';
import { config } from '../config';

/**
 * Raw telemetry samples, stored in a MongoDB **time-series collection**.
 *
 * Why time-series: this is append-only, timestamped, per-source (robotId)
 * data written ~1/sec/robot. A time-series collection buckets samples by
 * `robotId` + time window, which compresses storage, speeds up time-range
 * reads (the 6h history query in Q3), and makes TTL retention cheap.
 *
 *  - timeField  : `timestamp`  — the measurement time
 *  - metaField  : `robotId`    — the series identifier (low-cardinality meta)
 *  - granularity: `seconds`    — matches the 1s emit interval
 *  - TTL        : `expireAfterSeconds` auto-purges samples older than retention
 */
const telemetrySchema = new Schema(
  {
    robotId: { type: String, required: true },
    batteryPercentage: { type: Number, required: true },
    wifiSignalStrength: { type: Number, required: true },
    isCharging: { type: Boolean, required: true },
    temperature: { type: Number, required: true },
    memoryUsage: { type: Number, required: true },
    timestamp: { type: Date, required: true },
  },
  {
    timeseries: {
      timeField: 'timestamp',
      metaField: 'robotId',
      granularity: 'seconds',
    },
    expireAfterSeconds: config.telemetryRetentionSeconds,
    autoCreate: true,
    versionKey: false,
  },
);

export type TelemetryDoc = InferSchemaType<typeof telemetrySchema>;

export const Telemetry = model('Telemetry', telemetrySchema);
