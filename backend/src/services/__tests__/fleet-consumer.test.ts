import { createFleetConsumer } from '../fleet-consumer'
import { FleetState } from '../fleet-state'
import type { Broadcaster } from '../broadcaster'
import type { Robot } from '../../types'

const robot: Robot = {
  robotId: '00001',
  batteryPercentage: 80,
  wifiSignalStrength: -50,
  isCharging: false,
  temperature: 44,
  memoryUsage: 40,
  timestamp: '2026-06-14T10:00:00.000Z',
  lastSeen: '2026-06-14T10:00:00.000Z',
  status: 'online',
}

function makeBroadcaster() {
  return {
    robotConnected: jest.fn(),
    robotUpdate: jest.fn(),
    robotDisconnected: jest.fn(),
    sendSnapshot: jest.fn(),
  } as unknown as Broadcaster & {
    robotConnected: jest.Mock
    robotUpdate: jest.Mock
    robotDisconnected: jest.Mock
  }
}

describe('fleet consumer', () => {
  it('on update: stores robot in fleet state and broadcasts the update', () => {
    const fleet = new FleetState()
    const broadcaster = makeBroadcaster()
    const consume = createFleetConsumer(fleet, broadcaster)

    consume({ type: 'update', robot })

    expect(fleet.get('00001')).toEqual(robot)
    expect(broadcaster.robotUpdate).toHaveBeenCalledWith(robot)
  })

  it('on disconnected: removes from fleet state and broadcasts disconnect', () => {
    const fleet = new FleetState()
    const broadcaster = makeBroadcaster()
    const consume = createFleetConsumer(fleet, broadcaster)

    consume({ type: 'update', robot })
    consume({ type: 'disconnected', robotId: '00001' })

    expect(fleet.get('00001')).toBeUndefined()
    expect(broadcaster.robotDisconnected).toHaveBeenCalledWith('00001')
  })

  it('on connected: broadcasts connect without touching fleet state', () => {
    const fleet = new FleetState()
    const broadcaster = makeBroadcaster()
    const consume = createFleetConsumer(fleet, broadcaster)

    consume({ type: 'connected', robotId: '00009' })

    expect(broadcaster.robotConnected).toHaveBeenCalledWith('00009')
    expect(fleet.getAll()).toEqual([])
  })
})
