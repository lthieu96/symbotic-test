'use client'

import { Progress, Table, Tag, Tooltip } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useRouter } from 'next/navigation'
import dayjs from 'dayjs'
import type { Robot } from '../types/robot'
import { LOW_BATTERY_PCT } from '../lib/constants'
import StatusIndicator from './StatusIndicator'

function batteryColor(pct: number): string {
  if (pct < LOW_BATTERY_PCT) return '#ff4d4f'
  if (pct < 50) return '#faad14'
  return '#52c41a'
}

const columns: ColumnsType<Robot> = [
  {
    title: 'Robot ID',
    dataIndex: 'robotId',
    key: 'robotId',
    sorter: (a, b) => a.robotId.localeCompare(b.robotId),
    defaultSortOrder: 'ascend',
    render: (id: string) => <strong>{id}</strong>,
  },
  {
    title: 'Status',
    dataIndex: 'status',
    key: 'status',
    filters: [
      { text: 'Online', value: 'online' },
      { text: 'Warning', value: 'warning' },
      { text: 'Offline', value: 'offline' },
    ],
    onFilter: (value, r) => r.status === value,
    render: (_, r) => <StatusIndicator status={r.status ?? 'online'} />,
  },
  {
    title: 'Battery',
    dataIndex: 'batteryPercentage',
    key: 'batteryPercentage',
    sorter: (a, b) => a.batteryPercentage - b.batteryPercentage,
    render: (pct: number) => (
      <Progress
        percent={Math.round(pct)}
        size="small"
        strokeColor={batteryColor(pct)}
        style={{ width: 120 }}
      />
    ),
  },
  {
    title: 'Charging',
    dataIndex: 'isCharging',
    key: 'isCharging',
    render: (charging: boolean) =>
      charging ? <Tag color="green">Charging</Tag> : <Tag>Discharging</Tag>,
  },
  {
    title: 'WiFi',
    dataIndex: 'wifiSignalStrength',
    key: 'wifiSignalStrength',
    sorter: (a, b) => a.wifiSignalStrength - b.wifiSignalStrength,
    render: (dbm: number) => `${dbm} dBm`,
  },
  {
    title: 'Temp',
    dataIndex: 'temperature',
    key: 'temperature',
    sorter: (a, b) => a.temperature - b.temperature,
    render: (t: number) => `${t.toFixed(1)} °C`,
  },
  {
    title: 'Memory',
    dataIndex: 'memoryUsage',
    key: 'memoryUsage',
    sorter: (a, b) => a.memoryUsage - b.memoryUsage,
    render: (m: number) => `${Math.round(m)} %`,
  },
  {
    title: 'Last Seen',
    dataIndex: 'lastSeen',
    key: 'lastSeen',
    render: (ts: string | undefined, r) => {
      const value = ts ?? r.timestamp
      return (
        <Tooltip title={dayjs(value).format('YYYY-MM-DD HH:mm:ss')}>
          {dayjs(value).format('HH:mm:ss')}
        </Tooltip>
      )
    },
  },
]

/** Sortable/filterable list of all robots. Clicking a row opens the detail page (Q3). */
export default function RobotTable({ robots }: { robots: Robot[] }) {
  const router = useRouter()

  return (
    <Table<Robot>
      columns={columns}
      dataSource={robots}
      rowKey="robotId"
      pagination={false}
      onRow={(robot) => ({
        onClick: () => router.push(`/robots/${robot.robotId}`),
        style: { cursor: 'pointer' },
      })}
    />
  )
}
