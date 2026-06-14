import { parseTelemetry } from '../telemetry';

const validPayload = {
  robotId: '00001',
  batteryPercentage: 85.5,
  wifiSignalStrength: -45,
  isCharging: false,
  temperature: 42.3,
  memoryUsage: 67,
  timestamp: '2026-06-14T10:30:00.000Z',
};

describe('parseTelemetry', () => {
  it('accepts a well-formed payload', () => {
    const result = parseTelemetry(validPayload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.batteryPercentage).toBe(85.5);
    }
  });

  it('treats robotId and timestamp as optional', () => {
    const { robotId, timestamp, ...rest } = validPayload;
    const result = parseTelemetry(rest);
    expect(result.success).toBe(true);
  });

  it('rejects battery above 100', () => {
    const result = parseTelemetry({ ...validPayload, batteryPercentage: 150 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('batteryPercentage');
    }
  });

  it('rejects battery below 0', () => {
    expect(parseTelemetry({ ...validPayload, batteryPercentage: -1 }).success).toBe(false);
  });

  it('rejects positive wifi signal (must be <= 0 dBm)', () => {
    expect(parseTelemetry({ ...validPayload, wifiSignalStrength: 10 }).success).toBe(false);
  });

  it('rejects memoryUsage above 100', () => {
    expect(parseTelemetry({ ...validPayload, memoryUsage: 120 }).success).toBe(false);
  });

  it('rejects a wrong type (battery as string)', () => {
    expect(parseTelemetry({ ...validPayload, batteryPercentage: '85' }).success).toBe(false);
  });

  it('rejects a missing required field (isCharging)', () => {
    const { isCharging, ...rest } = validPayload;
    expect(parseTelemetry(rest).success).toBe(false);
  });

  it('rejects non-object input', () => {
    expect(parseTelemetry(null).success).toBe(false);
    expect(parseTelemetry('not json').success).toBe(false);
  });
});
