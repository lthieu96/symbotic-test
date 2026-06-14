import type { HttpResponse, HttpRequest } from 'uWebSockets.js'
import { getHistory } from '../services/history-store'

const SIX_HOURS_MS = 6 * 60 * 60 * 1000

const CORS_HEADERS: ReadonlyArray<[string, string]> = [
  ['Content-Type', 'application/json'],
  ['Access-Control-Allow-Origin', '*'],
]

/**
 * GET /api/robots/:robotId/history — returns the last 6 hours of telemetry
 * samples for a robot, used to seed the detail-page charts.
 *
 * Follows the uWS async pattern: read request data synchronously (req is invalid
 * after the first await), guard writes with an `aborted` flag, and cork the response.
 */
export function historyHandler(res: HttpResponse, req: HttpRequest): void {
  // Must read from req before any await.
  const robotId = req.getParameter(0)

  let aborted = false
  res.onAborted(() => {
    aborted = true
  })

  if (!robotId) {
    res.cork(() => {
      res.writeStatus('400 Bad Request').end(JSON.stringify({ error: 'missing_robot_id' }))
    })
    return
  }

  const since = new Date(Date.now() - SIX_HOURS_MS)

  getHistory(robotId, since)
    .then((points) => {
      if (aborted) return
      res.cork(() => {
        let r = res.writeStatus('200 OK')
        for (const [k, v] of CORS_HEADERS) r = r.writeHeader(k, v)
        r.end(JSON.stringify(points))
      })
    })
    .catch((err) => {
      console.error(`❌ history query failed for ${robotId}:`, err)
      if (aborted) return
      res.cork(() => {
        res.writeStatus('500 Internal Server Error').end(JSON.stringify({ error: 'history_failed' }))
      })
    })
}
