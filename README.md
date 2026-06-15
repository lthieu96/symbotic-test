# Robot Fleet Management Dashboard

Real-time monitoring for a fleet of robots: live telemetry, battery alerting, and
6-hour historical charts. Built with **Node.js + uWebSockets.js**, **Next.js +
Ant Design**, **MongoDB (time-series)**, and **Redis** for cross-worker scaling.

## 🎥 Video demo

▶️ **[Watch the demo](https://1916iuqinl.ufs.sh/f/80nP6vklQJwGOkMbMbtsIlQMxKfcUwzbmrFSTBXYL8oNtiCe)**

```
┌──────────────┐   ws /robots    ┌────────────────────────┐   ws /dashboard   ┌──────────────┐
│  Robot       │ ───telemetry──▶ │   Backend (uWS)        │ ──robot_update──▶ │  Dashboard   │
│  simulator   │   (1 Hz each)   │  validate → store →    │   (pub/sub)       │  (Next.js)   │
└──────────────┘                 │  publish to event bus  │                   └──────────────┘
                                  └───────┬────────┬───────┘                          │
                                          │        │                          GET /api/.../history
                                          ▼        ▼                                  │
                                   ┌──────────┐ ┌────────┐                            ▼
                                   │ MongoDB  │ │ Redis  │◀── event bus (clustered) ──┘
                                   │ (TS coll)│ │ pub/sub│
                                   └──────────┘ └────────┘
```

---

## Tech stack

| Layer | Choice | Why |
|-------|--------|-----|
| Ingest / WS server | **uWebSockets.js** | Very high WS throughput (C++); built-in pub/sub |
| Persistence | **MongoDB time-series** | Append-only, timestamped telemetry; bucketed storage + cheap TTL |
| Cross-worker bus | **Redis pub/sub** | Fan-out events across cluster workers |
| Frontend | **Next.js 15 + Ant Design + Recharts** | App Router, table/notifications, charts |
| Language | **TypeScript** (strict) everywhere | Type-safe contracts shared FE/BE |

---

## Quick start

### Option A — Docker Compose (everything, one command)

```bash
docker compose up -d --build
```

- Dashboard: <http://localhost:3000>
- Backend:   <http://localhost:8080>
- Brings up MongoDB, Redis, the clustered backend, the frontend, and a simulator
  (5 robots) automatically.

Stop: `docker compose down` (add `-v` to also drop the Mongo volume).

### Option B — Local development

**Prerequisites:** Node ≥ 22, pnpm, a running MongoDB on `localhost:27017`.
(Redis is only needed for clustering — single-process dev works without it.)

```bash
# Backend
cd backend
pnpm install
pnpm dev                 # single process (in-process event bus)

# Robot simulator (new terminal)
cd backend
pnpm simulator

# Frontend (new terminal)
cd frontend
pnpm install
pnpm dev                 # http://localhost:3000
```

Clustered locally (needs Redis on `localhost:6379`):

```bash
cd backend
pnpm build && pnpm cluster      # or: pnpm cluster:dev
```

Configuration is read from env (see `backend/.env.example`); a local `.env` is
loaded automatically.

---

## Testing

```bash
cd backend
pnpm test            # Jest unit tests
pnpm typecheck       # tsc --noEmit
```

Unit tests cover the pure, decoupled pieces: telemetry validation, fleet state,
the broadcaster, and the event-bus consumer.

---

## API documentation

### WebSocket — `ws://<host>:8080/robots` (ingest)

Robots connect with a `robotId` query param and send one telemetry frame per second:

```jsonc
// ws://localhost:8080/robots?robotId=00001
{
  "batteryPercentage": 85.5,   // 0–100 %
  "wifiSignalStrength": -45,   // -100–0 dBm
  "isCharging": false,
  "temperature": 42.3,         // °C
  "memoryUsage": 67,           // 0–100 %
  "timestamp": "2026-06-15T10:30:00.000Z"
}
```

Each frame is validated (zod, with range checks); the `robotId` is taken from the
connection (never trusted from the payload).

### WebSocket — `ws://<host>:8080/dashboard` (live updates)

On connect the client receives a snapshot, then incremental events. All messages
follow `WebSocketMessage`:

| `type` | Payload | Meaning |
|--------|---------|---------|
| `initial_robots` | `{ robots: Robot[] }` | Snapshot of currently-online robots |
| `robot_connected` | `{ robotId }` | A robot opened a connection |
| `robot_update` | `{ robotId, data: Robot }` | New telemetry for a robot |
| `robot_disconnected` | `{ robotId }` | A robot disconnected |

`Robot` = the telemetry fields plus server-derived `lastSeen` and
`status` (`online | offline | warning`).

### REST

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/robots/:robotId/history` | Last 6 hours of telemetry samples (`TelemetryPoint[]`), oldest first — seeds the detail charts |
| `GET` | `/health` | Liveness probe → `{ "status": "ok" }` |

The frontend calls `/api/...` and Next rewrites it to the backend (configurable
via `BACKEND_INTERNAL_URL`), avoiding CORS.

---

## Database schema

A single MongoDB **time-series collection** `telemetries`:

```js
{
  robotId: String,            // metaField (series identifier)
  batteryPercentage: Number,
  wifiSignalStrength: Number,
  isCharging: Boolean,
  temperature: Number,
  memoryUsage: Number,
  timestamp: Date,            // timeField
}
```

- **timeField** `timestamp`, **metaField** `robotId`, **granularity** `seconds`.
- **TTL**: `expireAfterSeconds` (default 7 days) auto-purges old samples.
- **Index**: MongoDB 6.3+ auto-creates a `{robotId, timestamp}` index on
  time-series collections, which serves the per-robot 6-hour range query — no
  explicit secondary index is needed.

Why time-series: telemetry is append-only, timestamped, per-source data written
~1/s/robot. Bucketing by `robotId` + time window compresses storage, speeds up
time-range reads, and makes retention cheap.

---

## Architecture

**Ingest → store → broadcast (Q1).** A robot frame on `/robots` is validated,
persisted to MongoDB (fire-and-forget so a slow write never blocks the live path),
and published as a fleet event.

**Dashboard (Q2).** The `/dashboard` socket feeds a reducer that keeps a
`Map<robotId, Robot>`; the table and summary render from it. Battery alerts are a
pure client-side state machine: **low battery** (`<20%` and not charging → warning,
once) and **critical** (the same condition held for **5 continuous minutes** →
error, once), both reset when the robot recovers.

**History (Q3).** The detail page seeds 6 hours from the REST API, then appends
live samples from the dashboard socket, trimming to a rolling 6-hour window.

**Clustering + event bus (Q4).** `cluster.ts` forks `WORKERS` (or CPU-count) uWS
workers that share the port via `SO_REUSEPORT`. Because each worker is a separate
process, `app.publish` only reaches that worker's clients — so events flow through
an **EventBus**:

- `LocalEventBus` (in-process `EventEmitter`) for single-process dev — no Redis.
- `RedisEventBus` (Redis pub/sub) when `REDIS_URL` is set.

Ingest publishes events to the bus; **every** worker subscribes, applies the event
to its local state replica, and rebroadcasts to its own dashboard clients — so a
dashboard on any worker sees every robot.

---

## Technical considerations & scaling

- **Base image / native addon.** uWebSockets.js ships prebuilt **glibc** binaries,
  so the backend image cannot use Alpine (musl). uWS v20.67 also requires Node
  22/24 **and glibc ≥ 2.38**, so the backend runs on `node:22-trixie-slim`
  (glibc 2.41); `bookworm-slim`/distroless-debian12 (glibc 2.36) fail to load it.
  The frontend has no native deps → `node:22-alpine` + Next standalone output keeps
  it small.

- **Broadcast fan-out is the ceiling.** Clustering splits *ingest* (connections,
  parse, store) across workers, but the current bus fans **every** event out to
  **every** worker (`O(robots × workers)`). Likewise each worker holds a **full**
  state replica. Both are fine for tens of thousands of robots but not millions.

- **Scaling to ~1M robots** would require: scaling horizontally across machines and
  **sharding robots** (by id/region); moving alert detection **server-side** and
  pushing only **aggregates/alerts/deltas** to dashboards instead of per-robot 1 Hz;
  **topic-per-shard** subscriptions; partitioned Redis (or Kafka) for the firehose;
  and batched/down-sampled Mongo writes. The dashboard would paginate/virtualize
  and snapshot from Mongo rather than from in-memory state.

- **History resolution.** 6h × 1 Hz ≈ 21.6k points/robot; the API returns raw
  points (consistent with live append). Server-side down-sampling (per-minute
  buckets) would be the optimization for the full-window case.

---

## Configuration

See `backend/.env.example`. Key variables:

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | `8080` | Backend port |
| `MONGO_URI` | `mongodb://localhost:27017/robot-fleet` | MongoDB connection |
| `TELEMETRY_RETENTION_SECONDS` | `604800` (7d) | Telemetry TTL |
| `REDIS_URL` | — | Enables the Redis event bus (clustering) |
| `WORKERS` | `0` (CPU count) | Cluster worker count |
| `SERVER_URL` | `ws://localhost:8080` | Simulator → backend target |
| `ROBOT_COUNT` | `5` | Simulator robot count |

---

## Project structure

```
backend/
  src/
    app.ts                 # wiring: DB, event bus, routes, listen
    cluster.ts             # cluster entrypoint
    config.ts              # env-driven config
    validation/            # zod telemetry schema
    models/                # Mongoose time-series model
    services/              # fleet-state, broadcaster, event-bus, consumer, stores
    ws/                    # robot + dashboard WebSocket handlers
    http/                  # REST history handler
    simulator/             # robot fleet simulator
frontend/
  src/
    app/                   # dashboard page + /robots/[robotId] detail
    components/            # RobotTable, FleetSummary, MetricChart, StatusIndicator
    hooks/                 # useWebSocket, useFleet, useAlerts, useRobotHistory
    lib/                   # constants, alert state machine
compose.yml                # mongodb + redis + backend + frontend + simulator
```
