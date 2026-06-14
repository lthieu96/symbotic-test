import { App, WebSocket, HttpRequest, HttpResponse, us_socket_context_t } from 'uWebSockets.js';
import qs from 'node:querystring';
import { connectDB } from './database';
import type { RobotUserData, RobotTelemetry } from './types';

const PORT = Number(process.env.PORT) || 8080;
const UPGRADE_DELAY_MS = 300;

const app = App()
  .ws<RobotUserData>('/robots', {
    // Limits live on the WebSocket behaviour, not on App() (where they were
    // previously ignored). `maxCompressedSize` does not exist in uWS v20 —
    // `maxPayloadLength` is the equivalent inbound-size guard.
    maxPayloadLength: 64 * 1024,
    maxBackpressure: 64 * 1024,

    upgrade: (res: HttpResponse, req: HttpRequest, context: us_socket_context_t) => {
      const upgradeAborted = { aborted: false };
      const secWebSocketKey = req.getHeader('sec-websocket-key');
      const secWebSocketProtocol = req.getHeader('sec-websocket-protocol');
      const secWebSocketExtensions = req.getHeader('sec-websocket-extensions');
      const query = qs.parse(req.getQuery()) as Record<string, string | undefined>;

      // Register abort handler before any async work.
      res.onAborted(() => {
        upgradeAborted.aborted = true;
      });

      setTimeout(() => {
        if (upgradeAborted.aborted) return;
        res.cork(() => {
          res.upgrade<RobotUserData>(
            { robotId: query.robotId ?? 'unknown' },
            secWebSocketKey,
            secWebSocketProtocol,
            secWebSocketExtensions,
            context,
          );
        });
      }, UPGRADE_DELAY_MS);
    },

    open: (ws: WebSocket<RobotUserData>) => {
      console.log(`Robot ${ws.getUserData().robotId} connected`);
    },

    message: (ws: WebSocket<RobotUserData>, message: ArrayBuffer) => {
      try {
        const data = JSON.parse(Buffer.from(message).toString()) as RobotTelemetry;
        console.log(`Received data from ${ws.getUserData().robotId}:`, data);
      } catch (error) {
        console.error('Error processing robot message:', error);
      }
    },

    close: (ws: WebSocket<RobotUserData>) => {
      console.log(`Robot ${ws.getUserData().robotId} disconnected`);
    },
  })
  .ws('/dashboard', {
    open: () => {
      console.log('Dashboard client connected');
    },

    message: (_ws: WebSocket<unknown>, message: ArrayBuffer) => {
      try {
        const data = JSON.parse(Buffer.from(message).toString());
        // TODO: Handle dashboard-specific messages
        console.log('Dashboard message:', data);
      } catch (error) {
        console.error('Error processing dashboard message:', error);
      }
    },

    close: () => {
      console.log('Dashboard client disconnected');
    },
  })
  .listen(PORT, (token) => {
    if (token) {
      console.log(`🚀 Robot Fleet Server listening on port ${PORT}`);
    } else {
      console.log('❌ Failed to listen on port', PORT);
      process.exit(1);
    }
  });

// Initialize database connection
connectDB().catch(console.error);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n📛 Shutting down server...');
  process.exit(0);
});

export default app;
