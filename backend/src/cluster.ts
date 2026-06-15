import cluster from 'node:cluster'
import os from 'node:os'
import { config } from './config'

/**
 * Cluster entrypoint. The primary forks WORKERS (env) or CPU-count workers and
 * respawns any that die; each worker runs the uWS server on the same port
 * (load-balanced by the kernel via SO_REUSEPORT). Cross-worker fan-out is
 * handled by the Redis event bus — set REDIS_URL so workers share state.
 */
const workerCount =
  config.workers || (typeof os.availableParallelism === 'function' ? os.availableParallelism() : os.cpus().length)

if (cluster.isPrimary) {
  console.log(`🧩 Primary ${process.pid} starting ${workerCount} worker(s)`)
  if (!config.redisUrl) {
    console.warn('⚠️  No REDIS_URL set — workers will NOT share state; dashboards may see partial fleets.')
  }

  for (let i = 0; i < workerCount; i++) cluster.fork()

  cluster.on('exit', (worker, code, signal) => {
    console.warn(`⚠️  Worker ${worker.process.pid} died (${signal || code}) — respawning`)
    cluster.fork()
  })
} else {
  // Worker process: start the server.
  void import('./app.js')
}
