import type { ReactNode } from 'react'

interface NoticeProps {
  kind?: 'info' | 'warn' | 'error' | 'success'
  children: ReactNode
}

/** A calm message box. role="alert" makes screen readers announce errors. */
export function Notice({ kind = 'info', children }: NoticeProps) {
  return (
    <div className={`notice notice-${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
      {children}
    </div>
  )
}
