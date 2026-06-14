'use client'

import React from 'react'
import { AntdRegistry as NextAntdRegistry } from '@ant-design/nextjs-registry'

/** SSR style registry for Ant Design v5 under the Next.js App Router. */
const AntdRegistry = ({ children }: { children: React.ReactNode }) => {
  return <NextAntdRegistry>{children}</NextAntdRegistry>
}

export default AntdRegistry
