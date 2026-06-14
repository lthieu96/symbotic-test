import WebSocket from 'ws';
import type { RobotTelemetry } from '../types';

interface RobotState {
  batteryPercentage: number;
  wifiSignalStrength: number;
  isCharging: boolean;
  temperature: number;
  memoryUsage: number;
}

class RobotSimulator {
  readonly robotId: string;
  private readonly serverUrl: string;
  private ws: WebSocket | null = null;
  private isConnected = false;
  private dataInterval: NodeJS.Timeout | null = null;
  private state: RobotState;

  // Simulation parameters
  private readonly batteryDrainRate = 0.1; // % per second when not charging
  private readonly chargingRate = 0.5; // % per second when charging

  constructor(robotId: string, serverUrl = 'ws://localhost:8080') {
    this.robotId = robotId;
    this.serverUrl = `${serverUrl}/robots?robotId=${robotId}`;

    // Initialize robot state with realistic values
    this.state = {
      batteryPercentage: Math.floor(Math.random() * 100), // 0-100%
      wifiSignalStrength: Math.floor(Math.random() * 60) - 100, // -100 to -40 dBm
      isCharging: Math.random() > 0.7, // 30% chance of charging
      temperature: Math.floor(Math.random() * 30) + 40, // 40-70°C
      memoryUsage: Math.floor(Math.random() * 60) + 20, // 20-80%
    };

    console.log(`🤖 Robot ${this.robotId} initialized with state:`, this.state);
  }

  connect(): void {
    try {
      console.log(`🔌 Connecting robot ${this.robotId} to ${this.serverUrl}...`);

      this.ws = new WebSocket(this.serverUrl);

      this.ws.on('open', () => {
        this.isConnected = true;
        console.log(`✅ Robot ${this.robotId} connected successfully`);
        this.startSendingData();
      });

      this.ws.on('message', (data: WebSocket.RawData) => {
        try {
          const message = JSON.parse(data.toString());
          console.log(`📨 Robot ${this.robotId} received:`, message);
          // TODO: Handle server messages (commands, etc.)
        } catch (error) {
          console.error(`Error parsing message for ${this.robotId}:`, error);
        }
      });

      this.ws.on('close', (code: number, reason: Buffer) => {
        this.isConnected = false;
        console.log(`❌ Robot ${this.robotId} disconnected (${code}): ${reason.toString()}`);
        this.stopSendingData();

        // Reconnection logic
        setTimeout(() => {
          console.log(`🔄 Attempting to reconnect robot ${this.robotId}...`);
          this.connect();
        }, 5000);
      });

      this.ws.on('error', (error: Error) => {
        console.error(`🚨 WebSocket error for robot ${this.robotId}:`, error.message);
      });
    } catch (error) {
      console.error(`Failed to connect robot ${this.robotId}:`, error);
    }
  }

  private startSendingData(): void {
    if (this.dataInterval) {
      clearInterval(this.dataInterval);
    }

    // Send data every 1 second
    this.dataInterval = setInterval(() => {
      if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
        this.updateState();
        this.sendData();
      }
    }, 1000);
  }

  private stopSendingData(): void {
    if (this.dataInterval) {
      clearInterval(this.dataInterval);
      this.dataInterval = null;
    }
  }

  private updateState(): void {
    // Battery simulation
    if (this.state.isCharging) {
      this.state.batteryPercentage = Math.min(100, this.state.batteryPercentage + this.chargingRate);

      // Stop charging when battery is full or randomly
      if (this.state.batteryPercentage >= 95 || Math.random() < 0.01) {
        this.state.isCharging = false;
      }
    } else {
      this.state.batteryPercentage = Math.max(0, this.state.batteryPercentage - this.batteryDrainRate);

      // Start charging when battery is low or randomly
      if (this.state.batteryPercentage <= 15 || Math.random() < 0.005) {
        this.state.isCharging = true;
      }
    }

    // WiFi signal fluctuation (-100 to -40 dBm)
    this.state.wifiSignalStrength += (Math.random() - 0.5) * 10;
    this.state.wifiSignalStrength = Math.max(-100, Math.min(-40, this.state.wifiSignalStrength));

    // Temperature fluctuation (40-70°C)
    this.state.temperature += (Math.random() - 0.5) * 2;
    this.state.temperature = Math.max(40, Math.min(70, this.state.temperature));

    // Memory usage fluctuation (20-80%)
    this.state.memoryUsage += (Math.random() - 0.5) * 5;
    this.state.memoryUsage = Math.max(20, Math.min(80, this.state.memoryUsage));

    // Round values to appropriate precision
    this.state.batteryPercentage = Math.round(this.state.batteryPercentage * 10) / 10;
    this.state.wifiSignalStrength = Math.round(this.state.wifiSignalStrength);
    this.state.temperature = Math.round(this.state.temperature * 10) / 10;
    this.state.memoryUsage = Math.round(this.state.memoryUsage);
  }

  private sendData(): void {
    if (!this.ws) return;
    try {
      const data: RobotTelemetry = {
        robotId: this.robotId,
        batteryPercentage: this.state.batteryPercentage,
        wifiSignalStrength: this.state.wifiSignalStrength,
        isCharging: this.state.isCharging,
        temperature: this.state.temperature,
        memoryUsage: this.state.memoryUsage,
        timestamp: new Date().toISOString(),
      };

      this.ws.send(JSON.stringify(data));
    } catch (error) {
      console.error(`Error sending data for robot ${this.robotId}:`, error);
    }
  }

  disconnect(): void {
    this.stopSendingData();
    this.ws?.close();
  }
}

function createRobotFleet(count = 5): RobotSimulator[] {
  const robots: RobotSimulator[] = [];

  for (let i = 1; i <= count; i++) {
    const robotId = `${i.toString().padStart(5, '0')}`;
    const robot = new RobotSimulator(robotId);
    robots.push(robot);

    // Stagger connections to avoid overwhelming the server
    setTimeout(() => {
      robot.connect();
    }, i * 1000);
  }

  return robots;
}

function shutdownFleet(robots: RobotSimulator[]): void {
  console.log('\n🛑 Shutting down robot fleet...');
  robots.forEach((robot) => robot.disconnect());
  process.exit(0);
}

// Start the simulation when run directly
if (require.main === module) {
  console.log('🚀 Starting Robot Fleet Simulator...');
  console.log('📡 Connecting to server at ws://localhost:8080');
  console.log('⏱️  Robots will send data every 1 second');
  console.log('Press Ctrl+C to stop\n');

  const robots = createRobotFleet(5); // Create 5 robots by default

  process.on('SIGINT', () => shutdownFleet(robots));
  process.on('SIGTERM', () => shutdownFleet(robots));
}

export { RobotSimulator, createRobotFleet };
