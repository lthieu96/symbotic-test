'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChartDataPoint, Robot, WebSocketMessage } from '../types/robot'
import { HISTORY_MS, WS_URL } from '../lib/constants'
import { useWebSocket, type ConnectionStatus } from './useWebSocket'

function toPoint(robot: Robot): ChartDataPoint {
  return {
    timestamp: robot.timestamp,
    batteryPercentage: robot.batteryPercentage,
    wifiSignalStrength: robot.wifiSignalStrength,
    temperature: robot.temperature,
    memoryUsage: robot.memoryUsage,
  }
}

interface UseRobotHistoryResult {
  points: ChartDataPoint[]
  latest: Robot | null
  loading: boolean
  status: ConnectionStatus
}

/**
 * Seeds the 6-hour history for one robot from the REST API, then appends live
 * samples from the dashboard WebSocket (filtered to this robot), trimming the
 * series to the rolling 6-hour window.
 */
export function useRobotHistory(robotId: string): UseRobotHistoryResult {
  const [points, setPoints] = useState<ChartDataPoint[]>([])
  const [latest, setLatest] = useState<Robot | null>(null)
  const [loading, setLoading] = useState(true)
  const seeded = useRef(false)

  useEffect(() => {
    let cancelled = false
    seeded.current = false
    setLoading(true)

    fetch(`/api/robots/${robotId}/history`)
      .then((r) => r.json())
      .then((data: ChartDataPoint[]) => {
        if (cancelled) return
        setPoints(data)
        seeded.current = true
        setLoading(false)
      })
      .catch((err) => {
        console.error('Failed to load robot history:', err)
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [robotId])

  const onMessage = useCallback(
    (msg: WebSocketMessage) => {
      if (msg.type !== 'robot_update' || msg.data?.robotId !== robotId) return
      const robot = msg.data
      setLatest(robot)
      setPoints((prev) => {
        const cutoff = Date.now() - HISTORY_MS
        return [...prev, toPoint(robot)].filter((p) => new Date(p.timestamp).getTime() >= cutoff)
      })
    },
    [robotId],
  )

  const { status } = useWebSocket(WS_URL, onMessage)

  return { points, latest, loading, status }
}
