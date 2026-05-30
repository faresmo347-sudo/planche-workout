'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('App error:', error)
  }, [error])

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: '#fafaf9',
      padding: '2rem',
    }}>
      <div style={{
        textAlign: 'center',
        maxWidth: '400px',
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: '#dcfce7',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.5rem',
        }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#15803d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 8v4"/>
            <path d="M12 16h.01"/>
          </svg>
        </div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1c1917', marginBottom: '0.5rem' }}>
          Loading Error
        </h2>
        <p style={{ fontSize: '0.875rem', color: '#78716c', marginBottom: '1.5rem', lineHeight: 1.5 }}>
          The server is still getting ready. This usually happens during development when the app is being recompiled. Click below to retry.
        </p>
        <button
          onClick={reset}
          style={{
            background: '#15803d',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            padding: '0.75rem 1.5rem',
            fontSize: '0.875rem',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Try Again
        </button>
      </div>
    </div>
  )
}
