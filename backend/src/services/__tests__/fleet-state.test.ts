import { FleetState } from '../fleet-state';
import type { Robot } from '../../types';

function makeRobot(robotId: string, overrides: Partial<Robot> = {}): Robot {
  return {
    robotId,
    batteryPercentage: 50,
    wifiSignalStrength: -50,
    isCharging: false,
    temperature: 45,
    memoryUsage: 40,
    timestamp: '2026-06-14T10:00:00.000Z',
    lastSeen: '2026-06-14T10:00:00.000Z',
    status: 'online',
    ...overrides,
  };
}

describe('FleetState', () => {
  it('starts empty', () => {
    const fleet = new FleetState();
    expect(fleet.getAll()).toEqual([]);
    expect(fleet.getOnlineIds()).toEqual([]);
  });

  it('upserts and retrieves a robot', () => {
    const fleet = new FleetState();
    const robot = makeRobot('00001');
    fleet.upsert(robot);

    expect(fleet.get('00001')).toEqual(robot);
    expect(fleet.getAll()).toHaveLength(1);
    expect(fleet.getOnlineIds()).toEqual(['00001']);
  });

  it('replaces the snapshot on repeated upsert of the same id', () => {
    const fleet = new FleetState();
    fleet.upsert(makeRobot('00001', { batteryPercentage: 50 }));
    fleet.upsert(makeRobot('00001', { batteryPercentage: 30 }));

    expect(fleet.getAll()).toHaveLength(1);
    expect(fleet.get('00001')?.batteryPercentage).toBe(30);
  });

  it('tracks multiple robots independently', () => {
    const fleet = new FleetState();
    fleet.upsert(makeRobot('00001'));
    fleet.upsert(makeRobot('00002'));

    expect(fleet.getOnlineIds().sort()).toEqual(['00001', '00002']);
  });

  it('removes a robot', () => {
    const fleet = new FleetState();
    fleet.upsert(makeRobot('00001'));
    fleet.remove('00001');

    expect(fleet.get('00001')).toBeUndefined();
    expect(fleet.getAll()).toEqual([]);
  });

  it('ignores removal of an unknown id', () => {
    const fleet = new FleetState();
    fleet.upsert(makeRobot('00001'));
    fleet.remove('does-not-exist');

    expect(fleet.getOnlineIds()).toEqual(['00001']);
  });
});
