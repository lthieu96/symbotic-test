'use client'

import { Card } from 'antd'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import dayjs from 'dayjs'
import type { ChartDataPoint } from '../types/robot'

interface MetricChartProps {
  title: string
  data: ChartDataPoint[]
  dataKey: keyof ChartDataPoint
  color: string
  unit?: string
  domain?: [number | 'auto', number | 'auto']
}

/** A single time-series line chart for one metric. */
export default function MetricChart({
  title,
  data,
  dataKey,
  color,
  unit = '',
  domain = ['auto', 'auto'],
}: MetricChartProps) {
  return (
    <Card title={title} className="chart-container" size="small">
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="timestamp"
            tickFormatter={(t) => dayjs(t).format('HH:mm')}
            minTickGap={48}
            tick={{ fontSize: 12 }}
          />
          <YAxis domain={domain} unit={unit} width={48} tick={{ fontSize: 12 }} />
          <Tooltip
            labelFormatter={(t) => dayjs(t).format('YYYY-MM-DD HH:mm:ss')}
            formatter={(value: number) => [`${value}${unit}`, title]}
          />
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  )
}
