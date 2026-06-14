/** Battery threshold (%) below which a robot is considered low when not charging. */
export const LOW_BATTERY_PCT = 20;

/** Minutes the low-battery condition must hold continuously before it becomes critical. */
export const CRITICAL_MINUTES = 5;
export const CRITICAL_MS = CRITICAL_MINUTES * 60 * 1000;

/** Dashboard WebSocket endpoint. WEBSOCKET_URL is injected by next.config.js. */
export const WS_URL = `${process.env.WEBSOCKET_URL ?? 'ws://localhost:8080'}/dashboard`;
