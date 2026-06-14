import type { TemplatedApp, WebSocket } from 'uWebSockets.js';
import type { Robot, WebSocketMessage } from '../types';
import { config } from '../config';

const encode = (msg: WebSocketMessage): string => JSON.stringify(msg);

/**
 * Pushes fleet events to dashboard clients. Broadcasts use uWS's built-in
 * pub/sub (`app.publish` → every socket subscribed to the dashboard topic),
 * so there is no manual socket bookkeeping.
 */
export class Broadcaster {
  constructor(private readonly app: TemplatedApp) {}

  private publish(msg: WebSocketMessage): void {
    this.app.publish(config.dashboardTopic, encode(msg));
  }

  robotUpdate(robot: Robot): void {
    this.publish({ type: 'robot_update', robotId: robot.robotId, data: robot });
  }

  robotConnected(robotId: string): void {
    this.publish({ type: 'robot_connected', robotId });
  }

  robotDisconnected(robotId: string): void {
    this.publish({ type: 'robot_disconnected', robotId });
  }

  /** Send the current fleet snapshot to one freshly connected dashboard client. */
  sendSnapshot(ws: WebSocket<unknown>, robots: Robot[]): void {
    ws.send(encode({ type: 'initial_robots', robots }));
  }
}
