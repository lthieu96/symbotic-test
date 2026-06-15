import { EventEmitter } from 'node:events'
import Redis from 'ioredis'
import type { FleetEvent } from '../types'
import { config } from '../config'

const CHANNEL = 'fleet:events'

/**
 * Fan-out bus for fleet events. The ingest side publishes; every worker
 * subscribes and applies events to its local state + dashboard clients.
 */
export interface EventBus {
  publish(event: FleetEvent): void
  subscribe(handler: (event: FleetEvent) => void): void
  close(): Promise<void>
}

/** Single-process bus — events stay within this Node process. */
class LocalEventBus implements EventBus {
  private readonly emitter = new EventEmitter()

  constructor() {
    this.emitter.setMaxListeners(0)
  }

  publish(event: FleetEvent): void {
    this.emitter.emit('event', event)
  }

  subscribe(handler: (event: FleetEvent) => void): void {
    this.emitter.on('event', handler)
  }

  async close(): Promise<void> {
    this.emitter.removeAllListeners()
  }
}

/**
 * Redis-backed bus for clustering / multiple processes. Uses two connections
 * (a subscribed Redis connection cannot also publish).
 */
class RedisEventBus implements EventBus {
  private readonly pub: Redis
  private readonly sub: Redis

  constructor(url: string) {
    this.pub = new Redis(url)
    this.sub = new Redis(url)
  }

  publish(event: FleetEvent): void {
    void this.pub.publish(CHANNEL, JSON.stringify(event))
  }

  subscribe(handler: (event: FleetEvent) => void): void {
    void this.sub.subscribe(CHANNEL)
    this.sub.on('message', (_channel, payload) => {
      try {
        handler(JSON.parse(payload) as FleetEvent)
      } catch (error) {
        console.error('Failed to parse fleet event:', error)
      }
    })
  }

  async close(): Promise<void> {
    await Promise.allSettled([this.pub.quit(), this.sub.quit()])
  }
}

/** Pick the bus implementation based on whether a Redis URL is configured. */
export function createEventBus(): EventBus {
  if (config.redisUrl) {
    console.log('🔗 Using Redis event bus')
    return new RedisEventBus(config.redisUrl)
  }
  console.log('🔗 Using in-process event bus')
  return new LocalEventBus()
}
