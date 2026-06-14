import type { TemplatedApp, WebSocket } from 'uWebSockets.js';
import { Broadcaster } from '../broadcaster';
import { config } from '../../config';
import type { Robot } from '../../types';

const robot: Robot = {
  robotId: '00001',
  batteryPercentage: 80,
  wifiSignalStrength: -50,
  isCharging: true,
  temperature: 44,
  memoryUsage: 40,
  timestamp: '2026-06-14T10:00:00.000Z',
  lastSeen: '2026-06-14T10:00:00.000Z',
  status: 'online',
};

function makeApp() {
  const publish = jest.fn();
  const app = { publish } as unknown as TemplatedApp;
  return { app, publish };
}

describe('Broadcaster', () => {
  it('publishes robot_update on the dashboard topic with the full robot', () => {
    const { app, publish } = makeApp();
    new Broadcaster(app).robotUpdate(robot);

    expect(publish).toHaveBeenCalledTimes(1);
    const [topic, payload] = publish.mock.calls[0];
    expect(topic).toBe(config.dashboardTopic);
    expect(JSON.parse(payload)).toEqual({ type: 'robot_update', robotId: '00001', data: robot });
  });

  it('publishes robot_connected with only the id', () => {
    const { app, publish } = makeApp();
    new Broadcaster(app).robotConnected('00007');

    expect(JSON.parse(publish.mock.calls[0][1])).toEqual({
      type: 'robot_connected',
      robotId: '00007',
    });
  });

  it('publishes robot_disconnected with only the id', () => {
    const { app, publish } = makeApp();
    new Broadcaster(app).robotDisconnected('00007');

    expect(JSON.parse(publish.mock.calls[0][1])).toEqual({
      type: 'robot_disconnected',
      robotId: '00007',
    });
  });

  it('sends initial_robots snapshot directly to a single client (not via publish)', () => {
    const { app, publish } = makeApp();
    const send = jest.fn();
    const ws = { send } as unknown as WebSocket<unknown>;

    new Broadcaster(app).sendSnapshot(ws, [robot]);

    expect(publish).not.toHaveBeenCalled();
    expect(send).toHaveBeenCalledTimes(1);
    expect(JSON.parse(send.mock.calls[0][0])).toEqual({ type: 'initial_robots', robots: [robot] });
  });
});
