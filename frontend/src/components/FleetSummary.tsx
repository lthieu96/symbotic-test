'use client'

import { Card, Col, Row, Statistic } from 'antd'
import type { Robot } from '../types/robot'
import { LOW_BATTERY_PCT } from '../lib/constants'

/** Top-of-dashboard summary counts derived from the current fleet. */
export default function FleetSummary({ robots }: { robots: Robot[] }) {
  const total = robots.length
  const online = robots.filter((r) => r.status !== 'offline').length
  const offline = total - online
  const lowBattery = robots.filter(
    (r) => r.status !== 'offline' && r.batteryPercentage < LOW_BATTERY_PCT && !r.isCharging,
  ).length

  return (
    <Row gutter={16} style={{ marginBottom: 24 }}>
      <Col span={6}>
        <Card>
          <Statistic title="Total Robots" value={total} />
        </Card>
      </Col>
      <Col span={6}>
        <Card>
          <Statistic title="Online" value={online} valueStyle={{ color: '#52c41a' }} />
        </Card>
      </Col>
      <Col span={6}>
        <Card>
          <Statistic title="Offline" value={offline} valueStyle={{ color: '#ff4d4f' }} />
        </Card>
      </Col>
      <Col span={6}>
        <Card>
          <Statistic title="Low Battery" value={lowBattery} valueStyle={{ color: '#faad14' }} />
        </Card>
      </Col>
    </Row>
  )
}
