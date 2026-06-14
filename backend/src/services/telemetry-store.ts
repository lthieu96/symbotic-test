import { Telemetry } from '../models/telemetry';
import type { Robot } from '../types';

/**
 * Persist a single telemetry sample to the time-series collection.
 *
 * Callers invoke this fire-and-forget so a slow/failed write never blocks the
 * real-time broadcast path; errors are surfaced by the caller's `.catch`.
 */
export async function saveTelemetry(robot: Robot): Promise<void> {
  await Telemetry.create({
    robotId: robot.robotId,
    batteryPercentage: robot.batteryPercentage,
    wifiSignalStrength: robot.wifiSignalStrength,
    isCharging: robot.isCharging,
    temperature: robot.temperature,
    memoryUsage: robot.memoryUsage,
    timestamp: new Date(robot.timestamp),
  });
}
