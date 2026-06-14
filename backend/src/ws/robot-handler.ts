import type { WebSocketBehavior } from 'uWebSockets.js';
import qs from 'node:querystring';
import type { RobotUserData, Robot } from '../types';
import type { FleetState } from '../services/fleet-state';
import type { Broadcaster } from '../services/broadcaster';
import { saveTelemetry } from '../services/telemetry-store';
import { parseTelemetry } from '../validation/telemetry';

const UPGRADE_DELAY_MS = 300;

interface RobotHandlerDeps {
  fleet: FleetState;
  broadcaster: Broadcaster;
}

/**
 * WebSocket behaviour for the `/robots` endpoint — the ingest side.
 * Per message it: parses JSON → validates → updates fleet state →
 * broadcasts to dashboards → persists (fire-and-forget).
 */
export function createRobotHandler({
  fleet,
  broadcaster,
}: RobotHandlerDeps): WebSocketBehavior<RobotUserData> {
  return {
    maxPayloadLength: 64 * 1024,
    maxBackpressure: 64 * 1024,

    upgrade: (res, req, context) => {
      const aborted = { value: false };
      const secWebSocketKey = req.getHeader('sec-websocket-key');
      const secWebSocketProtocol = req.getHeader('sec-websocket-protocol');
      const secWebSocketExtensions = req.getHeader('sec-websocket-extensions');
      const query = qs.parse(req.getQuery()) as Record<string, string | undefined>;

      // Register the abort handler before any async work.
      res.onAborted(() => {
        aborted.value = true;
      });

      setTimeout(() => {
        if (aborted.value) return;
        res.cork(() => {
          res.upgrade<RobotUserData>(
            { robotId: query.robotId ?? 'unknown' },
            secWebSocketKey,
            secWebSocketProtocol,
            secWebSocketExtensions,
            context,
          );
        });
      }, UPGRADE_DELAY_MS);
    },

    open: (ws) => {
      const { robotId } = ws.getUserData();
      console.log(`🤖 Robot ${robotId} connected`);
      broadcaster.robotConnected(robotId);
    },

    message: (ws, message) => {
      const { robotId } = ws.getUserData();

      let raw: unknown;
      try {
        raw = JSON.parse(Buffer.from(message).toString());
      } catch {
        console.error(`❌ Invalid JSON from robot ${robotId}`);
        return;
      }

      const parsed = parseTelemetry(raw);
      if (!parsed.success) {
        console.error(`❌ Invalid telemetry from robot ${robotId}: ${parsed.error}`);
        return;
      }

      const t = parsed.data;
      const timestamp = isValidTimestamp(t.timestamp)
        ? t.timestamp
        : new Date().toISOString();

      const robot: Robot = {
        robotId, // authoritative id from the connection, never trusted from the payload
        batteryPercentage: t.batteryPercentage,
        wifiSignalStrength: t.wifiSignalStrength,
        isCharging: t.isCharging,
        temperature: t.temperature,
        memoryUsage: t.memoryUsage,
        timestamp,
        lastSeen: timestamp,
        status: 'online',
      };

      fleet.upsert(robot);
      broadcaster.robotUpdate(robot);

      // Persist without blocking the broadcast path.
      saveTelemetry(robot).catch((err) =>
        console.error(`❌ Failed to store telemetry for ${robotId}:`, err),
      );
    },

    close: (ws) => {
      const { robotId } = ws.getUserData();
      console.log(`🔌 Robot ${robotId} disconnected`);
      fleet.remove(robotId);
      broadcaster.robotDisconnected(robotId);
    },
  };
}

function isValidTimestamp(value: string | undefined): value is string {
  return value !== undefined && !Number.isNaN(Date.parse(value));
}
