import { z } from 'zod';

/**
 * Schema for incoming robot telemetry. Ranges follow the documented data
 * format (INSTRUCTIONS.md). `robotId` and `timestamp` are optional here: the
 * authoritative robotId comes from the connection, and a missing/invalid
 * timestamp falls back to server time downstream.
 */
export const telemetrySchema = z.object({
  robotId: z.string().optional(),
  batteryPercentage: z.number().min(0).max(100),
  wifiSignalStrength: z.number().min(-100).max(0),
  isCharging: z.boolean(),
  temperature: z.number().min(-50).max(150),
  memoryUsage: z.number().min(0).max(100),
  timestamp: z.string().optional(),
});

export type ValidatedTelemetry = z.infer<typeof telemetrySchema>;

export type TelemetryParseResult =
  | { success: true; data: ValidatedTelemetry }
  | { success: false; error: string };

/** Validate an unknown value against the telemetry schema. */
export function parseTelemetry(raw: unknown): TelemetryParseResult {
  const result = telemetrySchema.safeParse(raw);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const error = result.error.issues
    .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('; ');
  return { success: false, error };
}
