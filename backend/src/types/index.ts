/**
 * Raw telemetry payload as sent by each robot every second.
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

export type RobotStatus = 'online' | 'offline' | 'warning';

/**
 * Live view of a robot, as broadcast to dashboard clients. Extends the raw
 * telemetry with server-derived presence fields.
 */
export interface Robot {
  robotId: string;
  batteryPercentage: number;
  wifiSignalStrength: number;
  isCharging: boolean;
  temperature: number;
  memoryUsage: number;
  timestamp: string;
  lastSeen: string;
  status: RobotStatus;
}

/**
 * Discriminated union of every message the backend pushes to the
 * `/dashboard` WebSocket. Mirrored by the frontend `WebSocketMessage` type.
 */
export type WebSocketMessage =
  | { type: 'initial_robots'; robots: Robot[] }
  | { type: 'robot_update'; robotId: string; data: Robot }
  | { type: 'robot_connected'; robotId: string }
  | { type: 'robot_disconnected'; robotId: string };

/**
 * Internal fleet event carried over the event bus (in-process or Redis) between
 * the ingest side and every worker's broadcast/state side.
 */
export type FleetEvent =
  | { type: 'connected'; robotId: string }
  | { type: 'update'; robot: Robot }
  | { type: 'disconnected'; robotId: string };

/** A single historical telemetry sample returned by the history API (for charts). */
export interface TelemetryPoint {
  timestamp: string; // ISO-8601
  batteryPercentage: number;
  wifiSignalStrength: number;
  temperature: number;
  memoryUsage: number;
}
