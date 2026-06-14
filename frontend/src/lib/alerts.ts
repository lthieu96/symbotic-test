import type { Robot } from '../types/robot'
import { LOW_BATTERY_PCT, CRITICAL_MS } from './constants'

/**
 * Per-robot alert state machine state.
 *  - lowActive / criticalActive: whether each alert has already fired (so we
 *    notify only once until the condition resets).
 *  - lowSince: epoch ms when the low-battery condition began (null when not low),
 *    used to measure the 5-minute critical threshold.
 */
export interface AlertState {
  lowActive: boolean
  criticalActive: boolean
  lowSince: number | null
}

export type AlertType = 'low_battery' | 'critical_battery'

export interface AlertEvent {
  type: AlertType
  robotId: string
  message: string
}

export const initialAlertState = (): AlertState => ({
  lowActive: false,
  criticalActive: false,
  lowSince: null,
})

const isLowCondition = (robot: Robot): boolean =>
  robot.batteryPercentage < LOW_BATTERY_PCT && !robot.isCharging

/**
 * Pure transition: given the previous alert state and a fresh telemetry sample,
 * returns the next state plus any alerts that should fire this tick.
 *
 *  - Low battery  : battery < 20% AND not charging.
 *  - Critical     : the above held continuously for >= 5 minutes.
 *  - Both fire once on entering the condition and reset when the robot recovers
 *    (battery >= 20% OR charging).
 *
 * Kept free of React/Antd so it can be unit-tested in isolation.
 */
export function evaluateAlert(
  prev: AlertState | undefined,
  robot: Robot,
  now: number,
): { state: AlertState; events: AlertEvent[] } {
  const state: AlertState = prev ? { ...prev } : initialAlertState()
  const events: AlertEvent[] = []

  if (isLowCondition(robot)) {
    if (state.lowSince === null) state.lowSince = now

    if (!state.lowActive) {
      state.lowActive = true
      events.push({
        type: 'low_battery',
        robotId: robot.robotId,
        message: `Robot ${robot.robotId} is low battery!`,
      })
    }

    if (!state.criticalActive && now - state.lowSince >= CRITICAL_MS) {
      state.criticalActive = true
      events.push({
        type: 'critical_battery',
        robotId: robot.robotId,
        message: `Robot ${robot.robotId} will be shut down soon!`,
      })
    }
  } else {
    // Recovered (or charging) — reset so the alerts can fire again next time.
    state.lowActive = false
    state.criticalActive = false
    state.lowSince = null
  }

  return { state, events }
}
