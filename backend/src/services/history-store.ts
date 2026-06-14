import { Telemetry } from '../models/telemetry'
import type { TelemetryPoint } from '../types'

interface TelemetryLean {
  timestamp: Date
  batteryPercentage: number
  wifiSignalStrength: number
  temperature: number
  memoryUsage: number
}

/**
 * Fetch a robot's telemetry samples since `since`, oldest first — used to seed
 * the history charts. Backed by the time-series collection's {robotId, timestamp}
 * index.
 */
export async function getHistory(robotId: string, since: Date): Promise<TelemetryPoint[]> {
  const docs = await Telemetry.find({ robotId, timestamp: { $gte: since } })
    .select('timestamp batteryPercentage wifiSignalStrength temperature memoryUsage -_id')
    .sort({ timestamp: 1 })
    .lean<TelemetryLean[]>()

  return docs.map((d) => ({
    timestamp: d.timestamp.toISOString(),
    batteryPercentage: d.batteryPercentage,
    wifiSignalStrength: d.wifiSignalStrength,
    temperature: d.temperature,
    memoryUsage: d.memoryUsage,
  }))
}
