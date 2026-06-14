import type { WebSocketBehavior } from 'uWebSockets.js';
import { config } from '../config';
import type { FleetState } from '../services/fleet-state';
import type { Broadcaster } from '../services/broadcaster';

interface DashboardHandlerDeps {
  fleet: FleetState;
  broadcaster: Broadcaster;
}

/**
 * WebSocket behaviour for the `/dashboard` endpoint — the read/fan-out side.
 * On connect, a client subscribes to the fleet topic and is immediately sent
 * the current snapshot; thereafter it receives broadcasts via uWS pub/sub.
 */
export function createDashboardHandler({
  fleet,
  broadcaster,
}: DashboardHandlerDeps): WebSocketBehavior<unknown> {
  return {
    maxBackpressure: 64 * 1024,

    open: (ws) => {
      console.log('🖥️  Dashboard client connected');
      ws.subscribe(config.dashboardTopic);
      broadcaster.sendSnapshot(ws, fleet.getAll());
    },

    message: (_ws, message) => {
      try {
        const data = JSON.parse(Buffer.from(message).toString());
        // TODO (Q2+): handle dashboard-originated commands (e.g. ack alerts).
        console.log('Dashboard message:', data);
      } catch {
        console.error('Error processing dashboard message');
      }
    },

    close: () => {
      console.log('🖥️  Dashboard client disconnected');
    },
  };
}
