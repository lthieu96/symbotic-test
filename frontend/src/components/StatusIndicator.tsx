'use client'

import type { RobotStatus } from '../types/robot'

const LABELS: Record<RobotStatus, string> = {
  online: 'Online',
  offline: 'Offline',
  warning: 'Warning',
}

/** Coloured dot + label. Colours/animation come from globals.css (.status-*). */
export default function StatusIndicator({ status }: { status: RobotStatus }) {
  return (
    <span>
      <span className={`status-indicator status-${status}`} />
      {LABELS[status]}
    </span>
  )
}
