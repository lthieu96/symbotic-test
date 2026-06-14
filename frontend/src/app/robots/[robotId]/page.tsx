'use client'

import { useParams, useRouter } from 'next/navigation'
import { Badge, Button, Col, Layout, Row, Spin, Statistic, Typography } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { useRobotHistory } from '../../../hooks/useRobotHistory'
import MetricChart from '../../../components/MetricChart'

const { Header, Content } = Layout
const { Title } = Typography

export default function RobotDetail() {
  const params = useParams()
  const router = useRouter()
  const robotId = String(params.robotId)

  const { points, latest, loading, status } = useRobotHistory(robotId)

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: '#001529', padding: '0 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, height: '100%' }}>
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => router.push('/')} style={{ color: 'white' }}>
            Back
          </Button>
          <Title level={3} style={{ color: 'white', margin: 0 }}>
            🤖 Robot {robotId}
          </Title>
          <Badge
            status={status === 'connected' ? 'success' : 'warning'}
            text={<span style={{ color: 'white' }}>{status === 'connected' ? 'Live' : status}</span>}
          />
        </div>
      </Header>

      <Content style={{ padding: 24 }}>
        {latest && (
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={6}>
              <Statistic title="Battery" value={latest.batteryPercentage} suffix="%" precision={1} />
            </Col>
            <Col span={6}>
              <Statistic title="Temperature" value={latest.temperature} suffix="°C" precision={1} />
            </Col>
            <Col span={6}>
              <Statistic title="WiFi" value={latest.wifiSignalStrength} suffix=" dBm" />
            </Col>
            <Col span={6}>
              <Statistic title="Memory" value={latest.memoryUsage} suffix="%" />
            </Col>
          </Row>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: 64 }}>
            <Spin tip="Loading history…" size="large" />
          </div>
        ) : (
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={12}>
              <MetricChart title="Battery (%)" data={points} dataKey="batteryPercentage" color="#52c41a" unit="%" domain={[0, 100]} />
            </Col>
            <Col xs={24} lg={12}>
              <MetricChart title="Memory Usage (%)" data={points} dataKey="memoryUsage" color="#1890ff" unit="%" domain={[0, 100]} />
            </Col>
            <Col xs={24} lg={12}>
              <MetricChart title="Temperature (°C)" data={points} dataKey="temperature" color="#fa8c16" unit="°C" />
            </Col>
            <Col xs={24} lg={12}>
              <MetricChart title="WiFi Signal (dBm)" data={points} dataKey="wifiSignalStrength" color="#722ed1" unit=" dBm" domain={[-100, 0]} />
            </Col>
          </Row>
        )}
      </Content>
    </Layout>
  )
}
