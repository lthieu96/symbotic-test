import { App } from 'uWebSockets.js';
import { config } from './config';
import { connectDB, disconnectDB } from './database';
import { FleetState } from './services/fleet-state';
import { Broadcaster } from './services/broadcaster';
import { createEventBus } from './services/event-bus';
import { createFleetConsumer } from './services/fleet-consumer';
import { createRobotHandler } from './ws/robot-handler';
import { createDashboardHandler } from './ws/dashboard-handler';
import { historyHandler } from './http/history-handler';

async function main(): Promise<void> {
  // Persistence must be ready before we accept ingest traffic.
  await connectDB();

  const fleet = new FleetState();
  const app = App();
  const broadcaster = new Broadcaster(app);

  // Cross-worker event bus: ingest publishes events; this worker's consumer
  // applies them to its local state replica and rebroadcasts to its dashboards.
  const bus = createEventBus();
  bus.subscribe(createFleetConsumer(fleet, broadcaster));

  app
    .ws('/robots', createRobotHandler({ bus }))
    .ws('/dashboard', createDashboardHandler({ fleet, broadcaster }))
    .get('/api/robots/:robotId/history', historyHandler)
    .get('/health', (res) => {
      res.writeStatus('200 OK').writeHeader('Content-Type', 'application/json').end('{"status":"ok"}');
    })
    .listen(config.port, (token) => {
      if (token) {
        console.log(`🚀 Robot Fleet Server (pid ${process.pid}) listening on port ${config.port}`);
      } else {
        console.error(`❌ Failed to listen on port ${config.port}`);
        process.exit(1);
      }
    });

  const shutdown = async (signal: string): Promise<void> => {
    console.log(`\n📛 ${signal} received — shutting down...`);
    await bus.close().catch(() => undefined);
    await disconnectDB().catch(() => undefined);
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
