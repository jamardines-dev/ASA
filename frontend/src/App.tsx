import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import AreaMap from './components/AreaMap'
import SafetyPanel from './components/SafetyPanel'
import { fetchAreaStatuses, fetchRecentReports, subscribeToAreaUpdates } from './api'
import type { AreaStatus } from './types'
import { STATUS_META } from './types'

export interface AshReport {
  latitude: number
  longitude: number
  note: string
  reportedAt: string
}

export interface LatLng {
  lat: number
  lng: number
}

export type LocationSource = 'gps' | 'pinned' | null

const FLASH_DURATION_MS = 2500

const ASH_PARTICLES = Array.from({ length: 18 }, () => ({
  left: Math.random() * 100,
  delay: Math.random() * 22,
  duration: 16 + Math.random() * 14,
  drift: (Math.random() - 0.5) * 60,
  size: 2 + Math.random() * 2,
}))

function AshDrift() {
  return (
    <div className="ash-drift" aria-hidden="true">
      {ASH_PARTICLES.map((p, i) => (
        <span
          key={i}
          className="ash-particle"
          style={
            {
              left: `${p.left}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
              '--drift': `${p.drift}px`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  )
}

export default function App() {
  const [areas, setAreas] = useState<AreaStatus[]>([])
  const [reports, setReports] = useState<AshReport[]>([])
  const [selected, setSelected] = useState<AreaStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeLocation, setActiveLocation] = useState<LatLng | null>(null)
  const [locationSource, setLocationSource] = useState<LocationSource>(null)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [pickMode, setPickMode] = useState(false)
  const [live, setLive] = useState(false)
  const [changedIds, setChangedIds] = useState<Set<number>>(new Set())
  const [locationPromptAnswered, setLocationPromptAnswered] = useState(false)

  const requestGpsLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by this browser.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setActiveLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLocationSource('gps')
        setLocationError(null)
      },
      () => {
        setActiveLocation(null)
        setLocationSource(null)
        setLocationError('Location permission denied. Use "Set my location" to pin it manually.')
      },
    )
  }

  const prevStatusRef = useRef<Record<number, AreaStatus['status']>>({})

  const applyAreas = (data: AreaStatus[]) => {
    const prev = prevStatusRef.current
    const changed = new Set<number>()
    data.forEach((a) => {
      if (prev[a.id] && prev[a.id] !== a.status) changed.add(a.id)
    })
    prevStatusRef.current = Object.fromEntries(data.map((a) => [a.id, a.status]))
    if (changed.size > 0) {
      setChangedIds(changed)
      setTimeout(() => setChangedIds(new Set()), FLASH_DURATION_MS)
    }
    setAreas(data)
    setError(null)
  }

  useEffect(() => {
    fetchAreaStatuses()
      .then(applyAreas)
      .catch(() =>
        setError("Couldn't load area statuses. Make sure the backend is running on port 8080."),
      )

    fetchRecentReports()
      .then(setReports)
      .catch(() => console.error("Couldn't load reports"))

    const unsubscribe = subscribeToAreaUpdates(applyAreas, setLive)
    return unsubscribe
  }, [])

  const enableLocation = () => {
    setLocationPromptAnswered(true)
    requestGpsLocation()
  }

  const dismissLocationPrompt = () => setLocationPromptAnswered(true)

  const refreshReports = async () => {
    try {
      const fresh = await fetchRecentReports()
      setReports(fresh)
    } catch {
      console.error("Couldn't refresh reports")
    }
  }

  const counts = areas.reduce(
    (acc, a) => {
      acc[a.status] += 1
      return acc
    },
    { SAFE: 0, CAUTION: 0, UNSAFE: 0 } as Record<AreaStatus['status'], number>,
  )

  return (
    <div className="app">
      <AshDrift />
      <header className="header">
        <div>
          <h1 className="sr-only">ASA PH — Area Safety Alert</h1>
          <div className="title-row">
            <img src="/logo-mark.svg" alt="" className="brand-mark" />
            <img src="/wordmark.svg" alt="" className="brand-wordmark" />
          </div>
          <p>Live ashfall area safety map — tap a marker or check your location</p>
          <div className="summary-strip">
            {(Object.keys(STATUS_META) as Array<keyof typeof STATUS_META>).map((key) => (
              <span key={key} style={{ color: STATUS_META[key].color }}>
                {counts[key]} {STATUS_META[key].label.toLowerCase()}
              </span>
            ))}
            <span className={`live-indicator${live ? ' connected' : ''}`}>
              <span className="live-dot" />
              {live ? 'Live' : 'Reconnecting…'}
            </span>
          </div>
        </div>
        <div className="legend">
          {(Object.keys(STATUS_META) as Array<keyof typeof STATUS_META>).map((key) => (
            <span
              key={key}
              className="legend-pill"
              style={{ background: STATUS_META[key].bg, color: STATUS_META[key].color }}
            >
              <span className="dot" style={{ background: STATUS_META[key].color }} />
              {STATUS_META[key].label}
            </span>
          ))}
        </div>
      </header>

      {error && <div className="error" style={{ marginBottom: 12 }}>{error}</div>}

      <div className="layout">
        <div className="map-card">
          <AreaMap
            areas={areas}
            reports={reports}
            onSelect={setSelected}
            changedIds={changedIds}
            activeLocation={activeLocation}
            pickMode={pickMode}
            onPickLocation={(lat, lng) => {
              setActiveLocation({ lat, lng })
              setLocationSource('pinned')
              setLocationError(null)
              setPickMode(false)
            }}
            onDragLocation={(lat, lng) => {
              setActiveLocation({ lat, lng })
              setLocationSource('pinned')
            }}
          />
        </div>
        <aside className="side">
          <SafetyPanel
            selected={selected}
            activeLocation={activeLocation}
            locationSource={locationSource}
            locationError={locationError}
            showLocationPrompt={!locationPromptAnswered}
            onEnableLocation={enableLocation}
            onDismissLocationPrompt={dismissLocationPrompt}
            pickMode={pickMode}
            onTogglePickMode={() => setPickMode((v) => !v)}
            onClearLocation={requestGpsLocation}
            onReportSubmitted={refreshReports}
          />
        </aside>
      </div>
    </div>
  )
}
