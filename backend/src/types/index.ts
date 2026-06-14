/**
 * Telemetry payload sent by each robot every second.
 * Matches the documented robot data format in INSTRUCTIONS.md.
 */
export interface RobotTelemetry {
  robotId?: string;
  batteryPercentage: number; // 0-100 %
  wifiSignalStrength: number; // -100 to 0 dBm
  isCharging: boolean;
  temperature: number; // CPU temp in Celsius
  memoryUsage: number; // 0-100 %
  timestamp: string; // ISO-8601
}

/**
 * Data attached to a robot WebSocket connection at upgrade time and
 * retrieved later via `ws.getUserData()`.
 */
export interface RobotUserData {
  robotId: string;
}
