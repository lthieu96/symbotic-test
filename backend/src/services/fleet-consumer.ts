import type { FleetEvent } from '../types'
import type { FleetState } from './fleet-state'
import type { Broadcaster } from './broadcaster'

/**
 * Builds the per-worker consumer that applies fleet events (from the event bus)
 * to this worker's local state replica and rebroadcasts them to its dashboard
 * clients. Every worker runs one of these, so an event published by any worker
 * reaches dashboards on all workers.
 */
export function createFleetConsumer(fleet: FleetState, broadcaster: Broadcaster) {
  return (event: FleetEvent): void => {
    switch (event.type) {
      case 'connected':
        broadcaster.robotConnected(event.robotId)
        break
      case 'update':
        fleet.upsert(event.robot)
        broadcaster.robotUpdate(event.robot)
        break
      case 'disconnected':
        fleet.remove(event.robotId)
        broadcaster.robotDisconnected(event.robotId)
        break
    }
  }
}
