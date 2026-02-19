
'use client'

import { useCallback, useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'

import { fetchIssLocation, getApiIssWsUrl } from '../../lib/api'
import type { IssLocation } from '../../lib/types'

type IssTrackerState = {
  data: IssLocation | null
  error: string | null
  loading: boolean
}

type WsStatus = 'connecting' | 'reconnecting' | 'connected'

const IssMap = dynamic(() => import('../../components/IssMap'), { ssr: false })

function formatTimestamp(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleString()
}

export default function IssTrackerPage() {
  const [state, setState] = useState<IssTrackerState>({
    data: null,
    error: null,
    loading: true,
  })
  const [wsStatus, setWsStatus] = useState<WsStatus>('connecting')
  const [hasReceivedFirstWsMessage, setHasReceivedFirstWsMessage] = useState(false)
  const [focusSignal, setFocusSignal] = useState(0)

  const loadIssLocation = useCallback(async () => {
    try {
      const data = await fetchIssLocation()
      setState({ data, error: null, loading: false })
    } catch (error) {
      setState({
        data: null,
        error: error instanceof Error ? error.message : 'ISS data unavailable',
        loading: false,
      })
    }
  }, [])

  useEffect(() => {
    let stopped = false
    let ws: WebSocket | null = null
    let reconnectAttempts = 0
    let reconnectTimer: number | null = null

    const connect = () => {
      const wsUrl = `${getApiIssWsUrl()}/iss/stream`
      setWsStatus(reconnectAttempts > 0 ? 'reconnecting' : 'connecting')
      try {
        ws = new WebSocket(wsUrl)
      } catch (e) {
        // Fallback: do a one-time fetch and schedule reconnect
        setWsStatus('reconnecting')
        void loadIssLocation()
        scheduleReconnect()
        return
      }

      ws.onopen = () => {
        reconnectAttempts = 0
        setWsStatus('connected')
      }

      ws.onmessage = (e) => {
        try {
          const payload = JSON.parse(e.data) as IssLocation
          setHasReceivedFirstWsMessage(prev => {
            if (!prev) setFocusSignal(s => s + 1)
            return true
          })
          setState({ data: payload, error: null, loading: false })
        } catch (err) {
          // ignore parse errors
        }
      }

      ws.onclose = () => {
        if (stopped) return
        setWsStatus('reconnecting')
        scheduleReconnect()
      }

      ws.onerror = () => {
        // Errors will trigger onclose; close socket proactively
        setWsStatus('reconnecting')
        try {
          ws?.close()
        } catch (e) {
          /* ignore */
        }
      }
    }

    const scheduleReconnect = () => {
      reconnectAttempts = Math.min(10, reconnectAttempts + 1)
      const backoff = Math.min(30000, Math.pow(2, reconnectAttempts) * 1000)
      const jitter = Math.floor(Math.random() * 1000)
      reconnectTimer = window.setTimeout(() => {
        if (!stopped) connect()
      }, backoff + jitter)
    }

    // Attempt to get an initial snapshot while WS connects
    void loadIssLocation()
    connect()

    return () => {
      stopped = true
      if (reconnectTimer) window.clearTimeout(reconnectTimer)
      try {
        ws?.close()
      } catch (e) {
        /* ignore */
      }
    }
  }, [loadIssLocation])

  const { data, error, loading } = state

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10">
      <header className="mb-8 relative">
        <h1
          className="text-3xl font-semibold font-mono tracking-wide"
          style={{ color: 'var(--accent)' }}
        >
          ISS Live Tracker
        </h1>
        <p className="mt-2 text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>
          Real-time telemetry refreshed every 1 second via NASAPEDIA backend.
        </p>
        <Link href="/" className="absolute right-0 top-0 space-btn" aria-label="Back to home">
          Back Home
        </Link>
      </header>

      {!hasReceivedFirstWsMessage ? (
        <div className="mb-4 flex items-center gap-3 space-glass rounded-xl p-4 font-mono text-sm" style={{ color: 'var(--text-secondary)' }}>
          <span
            className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
            aria-hidden="true"
          />
          <span>
            {wsStatus === 'reconnecting'
              ? 'Reconnecting to live ISS stream...'
              : wsStatus === 'connected'
                ? 'Connected. Waiting for first live ISS update...'
                : 'Connecting to live ISS stream...'}
          </span>
        </div>
      ) : null}

      {loading ? (
        <div className="space-glass rounded-xl p-6 font-mono text-sm" style={{ color: 'var(--text-secondary)' }}>
          Loading ISS telemetry...
        </div>
      ) : null}

      {!loading && error ? (
        <div
          className="space-glass rounded-xl p-6 font-mono text-sm"
          style={{ borderColor: 'rgba(239,68,68,0.3)', color: '#fca5a5' }}
        >
          {error}
        </div>
      ) : null}

      {!loading && !error && data ? (
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div className="space-glass rounded-xl p-4">
              <div className="relative">
                <div className="absolute right-3 top-3 z-20">
                  <button
                    type="button"
                    className="space-btn"
                    onClick={() => setFocusSignal(s => s + 1)}
                  >
                    Focus
                  </button>
                </div>
                <IssMap
                  latitude={data.latitude}
                  longitude={data.longitude}
                  altitudeKm={typeof data.altitude === 'number' ? data.altitude : null}
                  focusSignal={focusSignal}
                  focusAnimate={true}
                />
              </div>
          </div>
          <div className="space-glass rounded-xl p-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TelemetryItem label="Latitude" value={data.latitude.toFixed(6)} />
              <TelemetryItem label="Longitude" value={data.longitude.toFixed(6)} />
              <TelemetryItem label="Velocity" value={`${data.velocity.toFixed(2)} km/h`} />
              <TelemetryItem label="Visibility" value={data.visibility} />
              <TelemetryItem label="Timestamp" value={formatTimestamp(data.timestamp)} />
              {typeof data.altitude === 'number' ? (
                <TelemetryItem label="Altitude" value={`${data.altitude.toFixed(2)} km`} />
              ) : null}
            </div>
          </div>
        </section>
      ) : null}
    </main>
  )
}

type TelemetryItemProps = {
  label: string
  value: string
}

function TelemetryItem({ label, value }: TelemetryItemProps) {
  return (
    <article className="rounded-lg border p-4 font-mono" style={{ borderColor: 'var(--border)' }}>
      <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
        {label}
      </p>
      <p className="mt-2 text-lg" style={{ color: 'var(--text-primary)' }}>
        {value}
      </p>
    </article>
  )
}
