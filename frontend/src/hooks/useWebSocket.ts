'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { WebSocketMessage } from '../types/robot'

const BASE_RECONNECT_MS = 1000
const MAX_RECONNECT_MS = 10000

export type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting'

interface UseWebSocketReturn {
  status: ConnectionStatus
  isConnected: boolean
  reconnect: () => void
}

/**
 * Connects to a dashboard WebSocket, parses each frame as a `WebSocketMessage`
 * and hands it to `onMessage`. Auto-reconnects with exponential backoff (capped)
 * whenever the socket closes or errors — including when the server is down at
 * page load — and stops cleanly on unmount.
 *
 * `onMessage` is held in a ref so changing the handler identity never tears
 * down the socket.
 */
export function useWebSocket(
  url: string,
  onMessage: (message: WebSocketMessage) => void,
): UseWebSocketReturn {
  const [status, setStatus] = useState<ConnectionStatus>('connecting')
  const wsRef = useRef<WebSocket | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()
  const attemptsRef = useRef(0)
  const teardownRef = useRef(false) // true => intentional unmount, suppress reconnect
  const onMessageRef = useRef(onMessage)

  useEffect(() => {
    onMessageRef.current = onMessage
  }, [onMessage])

  const connect = useCallback(() => {
    // Never stack sockets — a live/connecting one already covers us.
    const current = wsRef.current
    if (current && (current.readyState === WebSocket.OPEN || current.readyState === WebSocket.CONNECTING)) {
      return
    }

    const socket = new WebSocket(url)
    wsRef.current = socket

    socket.onopen = () => {
      console.log('✅ WebSocket connected to:', url)
      attemptsRef.current = 0
      setStatus('connected')
    }

    socket.onmessage = (event) => {
      try {
        onMessageRef.current(JSON.parse(event.data) as WebSocketMessage)
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error)
      }
    }

    // Funnel errors into the close path so reconnect always runs.
    socket.onerror = () => socket.close()

    socket.onclose = () => {
      if (teardownRef.current) return // unmounting — don't reconnect
      setStatus('reconnecting')
      const delay = Math.min(BASE_RECONNECT_MS * 2 ** attemptsRef.current, MAX_RECONNECT_MS)
      attemptsRef.current += 1
      console.log(`🔄 Reconnecting in ${delay}ms...`)
      timerRef.current = setTimeout(connect, delay)
    }
  }, [url])

  const reconnect = useCallback(() => {
    attemptsRef.current = 0
    if (timerRef.current) clearTimeout(timerRef.current)
    wsRef.current?.close()
    connect()
  }, [connect])

  useEffect(() => {
    teardownRef.current = false
    connect()
    return () => {
      teardownRef.current = true
      if (timerRef.current) clearTimeout(timerRef.current)
      wsRef.current?.close()
    }
  }, [connect])

  return { status, isConnected: status === 'connected', reconnect }
}
