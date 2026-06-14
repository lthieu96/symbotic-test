'use client'

import { useCallback, useMemo } from 'react'
import { Badge, Layout, Typography } from 'antd'
import type { BadgeProps } from 'antd'
import type { WebSocketMessage } from '../types/robot'
import { WS_URL } from '../lib/constants'
import { useWebSocket, type ConnectionStatus } from '../hooks/useWebSocket'
import { useFleet } from '../hooks/useFleet'
import { useAlerts } from '../hooks/useAlerts'
import FleetSummary from '../components/FleetSummary'
import RobotTable from '../components/RobotTable'

const { Header, Content } = Layout
const { Title } = Typography

const CONNECTION_BADGE: Record<ConnectionStatus, { status: BadgeProps['status']; text: string }> = {
  connected: { status: 'success', text: 'Live' },
  connecting: { status: 'processing', text: 'Connecting…' },
  reconnecting: { status: 'warning', text: 'Reconnecting…' },
}

export default function Dashboard() {
  const { robots, apply } = useFleet()
  const { evaluate, reset } = useAlerts()

  const onMessage = useCallback(
    (msg: WebSocketMessage) => {
      apply(msg)
      if (msg.type === 'robot_update' && msg.data) evaluate(msg.data)
      if (msg.type === 'robot_disconnected' && msg.robotId) reset(msg.robotId)
    },
    [apply, evaluate, reset],
  )

  const { status } = useWebSocket(WS_URL, onMessage)

  const robotList = useMemo(() => [...robots.values()], [robots])
  const badge = CONNECTION_BADGE[status]

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: '#001529', padding: '0 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '100%' }}>
          <Title level={2} style={{ color: 'white', margin: 0 }}>
            🤖 Robot Fleet Dashboard
          </Title>
          <Badge
            status={badge.status}
            text={<span style={{ color: 'white' }}>{badge.text}</span>}
          />
        </div>
      </Header>

      <Content style={{ padding: '24px' }}>
        <FleetSummary robots={robotList} />
        <RobotTable robots={robotList} />
      </Content>
    </Layout>
  )
}
