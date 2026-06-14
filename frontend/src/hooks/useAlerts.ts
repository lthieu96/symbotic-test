'use client'

import { useCallback, useRef } from 'react'
import { App } from 'antd'
import type { Robot } from '../types/robot'
import { evaluateAlert, type AlertState } from '../lib/alerts'

/**
 * Drives the low/critical battery alerts. Maintains per-robot state across
 * telemetry ticks and surfaces Antd notifications (warning / error) exactly
 * once per condition, via the App-level notification context.
 */
export function useAlerts() {
  const { notification } = App.useApp()
  const states = useRef<Map<string, AlertState>>(new Map())

  /** Evaluate a fresh telemetry sample and fire any newly-triggered alerts. */
  const evaluate = useCallback(
    (robot: Robot) => {
      const { state, events } = evaluateAlert(states.current.get(robot.robotId), robot, Date.now())
      states.current.set(robot.robotId, state)

      for (const ev of events) {
        if (ev.type === 'low_battery') {
          notification.warning({
            key: `low-${ev.robotId}`,
            message: 'Low Battery',
            description: ev.message,
            duration: 6,
          })
        } else {
          notification.error({
            key: `critical-${ev.robotId}`,
            message: 'Critical Battery',
            description: ev.message,
            duration: 0, // critical: stay until dismissed
          })
        }
      }
    },
    [notification],
  )

  /** Drop a robot's alert state (e.g. on disconnect — the 5-min window breaks). */
  const reset = useCallback((robotId: string) => {
    states.current.delete(robotId)
  }, [])

  return { evaluate, reset }
}
