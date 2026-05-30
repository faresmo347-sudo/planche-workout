'use client'

import { useEffect } from 'react'
import { initFromServer } from '@/lib/client-data'

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initFromServer()
  }, [])

  return <>{children}</>
}
