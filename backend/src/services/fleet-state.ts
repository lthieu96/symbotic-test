import type { Robot } from '../types';

/**
 * In-memory registry of the latest known telemetry for every currently
 * connected robot. Used to answer "who is online right now?" and to send a
 * full snapshot to dashboard clients the moment they connect.
 *
 * NOTE: single-process only. Under clustering (Q4) each worker would hold a
 * partial view, so this is intended to be swapped for a shared store (e.g.
 * Redis) behind the same interface without touching the WS handlers.
 */
export class FleetState {
  private readonly robots = new Map<string, Robot>();

  /** Insert or replace the latest snapshot for a robot. */
  upsert(robot: Robot): void {
    this.robots.set(robot.robotId, robot);
  }

  /** Forget a robot (e.g. on disconnect). */
  remove(robotId: string): void {
    this.robots.delete(robotId);
  }

  get(robotId: string): Robot | undefined {
    return this.robots.get(robotId);
  }

  /** Snapshot of all currently online robots. */
  getAll(): Robot[] {
    return [...this.robots.values()];
  }

  getOnlineIds(): string[] {
    return [...this.robots.keys()];
  }
}
