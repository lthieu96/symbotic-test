'use client'

import { useState, useCallback } from 'react'
import type { Robot, RobotStatus, WebSocketMessage } from '../types/robot'
import { LOW_BATTERY_PCT } from '../lib/constants'

/** Display status derived from live telemetry (offline is handled separately). */
function liveStatus(robot: Robot): RobotStatus {
  if (robot.batteryPercentage < LOW_BATTERY_PCT && !robot.isCharging) return 'warning'
  return 'online'
}

/**
 * Holds the fleet as a map keyed by robotId and reduces incoming
 * WebSocket messages into it. Disconnected robots are kept (marked offline)
 * rather than removed, so they remain visible in the dashboard.
 */
export function useFleet() {
  const [robots, setRobots] = useState<Map<string, Robot>>(new Map())

  const apply = useCallback((msg: WebSocketMessage) => {
    setRobots((prev) => {
      const next = new Map(prev)

      switch (msg.type) {
        case 'initial_robots': {
          next.clear()
          for (const r of msg.robots ?? []) {
            next.set(r.robotId, { ...r, status: liveStatus(r) })
          }
          break
        }
        case 'robot_update': {
          if (msg.data) {
            next.set(msg.data.robotId, { ...msg.data, status: liveStatus(msg.data) })
          }
          break
        }
        case 'robot_disconnected': {
          const existing = msg.robotId && next.get(msg.robotId)
          if (existing) {
            next.set(existing.robotId, { ...existing, status: 'offline' })
          }
          break
        }
        // robot_connected: no metrics yet — wait for the first robot_update.
      }

      return next
    })
  }, [])

  return { robots, apply }
}
