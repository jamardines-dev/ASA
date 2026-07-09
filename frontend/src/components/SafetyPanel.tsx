import { useState } from 'react'
import type { ReactNode } from 'react'
import type { AreaStatus, SafetyCheck } from '../types'
import { STATUS_META } from '../types'
import { checkMyLocation, submitReport, fetchRecentReports } from '../api'
import type { LatLng, LocationSource } from '../App'

interface Props {
  selected: AreaStatus | null
  activeLocation: LatLng | null
  locationSource: LocationSource
  locationError: string | null
  showLocationPrompt: boolean
  onEnableLocation: () => void
  onDismissLocationPrompt: () => void
  onReportSubmitted?: () => void
  pickMode: boolean
  onTogglePickMode: () => void
  onClearLocation: () => void
}

type ReportPhase = 'idle' | 'locating' | 'form' | 'submitting' | 'success'

export default function SafetyPanel({
  selected,
  activeLocation,
  locationSource,
  locationError,
  showLocationPrompt,
  onEnableLocation,
  onDismissLocationPrompt,
  pickMode,
  onTogglePickMode,
  onClearLocation,
  onReportSubmitted,
}: Props) {
  const [check, setCheck] = useState<SafetyCheck | null>(null)
  const [checking, setChecking] = useState(false)
  const [checkError, setCheckError] = useState<string | null>(null)

  const [reportPhase, setReportPhase] = useState<ReportPhase>('idle')
  const [reportCoords, setReportCoords] = useState<LatLng | null>(null)
  const [reportNote, setReportNote] = useState('')
  const [reportError, setReportError] = useState<string | null>(null)

  const runCheck = () => {
    if (activeLocation) {
      setChecking(true)
      setCheckError(null)
      checkMyLocation(activeLocation.lat, activeLocation.lng)
        .then(setCheck)
        .catch(() => setCheckError("Couldn't reach the server. Is the backend running?"))
        .finally(() => setChecking(false))
      return
    }
    if (!navigator.geolocation) {
      setCheckError('Geolocation is not supported by this browser.')
      return
    }
    setChecking(true)
    setCheckError(null)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const result = await checkMyLocation(pos.coords.latitude, pos.coords.longitude)
          setCheck(result)
        } catch {
          setCheckError("Couldn't reach the server. Is the backend running?")
        } finally {
          setChecking(false)
        }
      },
      () => {
        setCheckError('Location permission denied. Tap a marker on the map instead.')
        setChecking(false)
      },
    )
  }

  const startReport = () => {
    if (activeLocation) {
      setReportCoords(activeLocation)
      setReportPhase('form')
      return
    }
    if (!navigator.geolocation) {
      setReportError('Geolocation is not supported by this browser.')
      return
    }
    setReportPhase('locating')
    setReportError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setReportCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setReportPhase('form')
      },
      () => {
        setReportError('Location permission denied. Use "Set my location" instead.')
        setReportPhase('idle')
      },
    )
  }

  const submitTheReport = async () => {
    if (!reportCoords) return
    setReportPhase('submitting')
    setReportError(null)
    try {
      await submitReport(reportCoords.lat, reportCoords.lng, reportNote)
      setReportPhase('success')
      setReportNote('')
      onReportSubmitted?.()
      setTimeout(() => setReportPhase('idle'), 4000)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Couldn't submit your report. Is the backend running?"
      setReportError(message)
      setReportPhase('form')
    }
  }

  const cancelReport = () => {
    setReportPhase('idle')
    setReportNote('')
    setReportError(null)
  }

  return (
    <>
      <div className="panel">
        <h2>My location</h2>
        {showLocationPrompt && (
          <div className="location-prompt">
            <p>Enable location to see your position and automatically check if you're in a safe area.</p>
            <div className="location-prompt-actions">
              <button className="check-btn" onClick={onEnableLocation}>
                Enable location
              </button>
              <button className="check-btn secondary" onClick={onDismissLocationPrompt}>
                Not now
              </button>
            </div>
          </div>
        )}
        <button className={`pick-btn${pickMode ? ' active' : ''}`} onClick={onTogglePickMode}>
          {pickMode ? 'Tap the map to set your location…' : '📌 Set my location'}
        </button>
        {locationSource === 'gps' && (
          <p className="muted location-line">Using your current location</p>
        )}
        {locationSource === 'pinned' && (
          <p className="muted location-line">
            Using pinned location ·{' '}
            <button className="link-btn" onClick={onClearLocation}>
              Use my current location
            </button>
          </p>
        )}
        {!activeLocation && locationError && <p className="muted location-line">{locationError}</p>}

        <button className="check-btn" onClick={runCheck} disabled={checking} style={{ marginTop: 10 }}>
          {checking ? 'Checking…' : '📍 Am I in a safe area?'}
        </button>
        {checkError && <p className="muted" style={{ marginBottom: 0 }}>{checkError}</p>}
        {check && (
          <StatusBlock
            title={
              <>
                {check.nearestArea} <span className="mono-readout">· {check.distanceKm} km away</span>
              </>
            }
            status={check.status}
            mask={check.maskGuidance}
            advice={check.advice}
          />
        )}

        <button
          className="check-btn secondary"
          onClick={startReport}
          disabled={reportPhase === 'locating' || reportPhase === 'submitting'}
          style={{ marginTop: 10 }}
        >
          {reportPhase === 'locating' ? 'Locating…' : '🌋 Report ash here'}
        </button>
        {reportError && <p className="muted" style={{ marginBottom: 0 }}>{reportError}</p>}
        {reportPhase === 'success' && <p className="success-msg">Thanks — your report was submitted.</p>}
        {reportPhase === 'form' || reportPhase === 'submitting' ? (
          <div className="report-form">
            <textarea
              placeholder="What do you see? (optional)"
              value={reportNote}
              onChange={(e) => setReportNote(e.target.value)}
              rows={2}
            />
            <div className="report-form-actions">
              <button className="check-btn" onClick={submitTheReport} disabled={reportPhase === 'submitting'}>
                {reportPhase === 'submitting' ? 'Submitting…' : 'Submit'}
              </button>
              <button className="check-btn secondary" onClick={cancelReport} disabled={reportPhase === 'submitting'}>
                Cancel
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="panel">
        <h2>Selected area</h2>
        {selected ? (
          <StatusBlock
            title={selected.name}
            status={selected.status}
            mask={selected.maskGuidance}
            advice={[]}
            source={selected.source}
          />
        ) : (
          <p className="muted" style={{ margin: 0 }}>
            Tap a marker on the map to see its status and mask guidance.
          </p>
        )}
      </div>
    </>
  )
}

function StatusBlock({
  title,
  status,
  mask,
  advice,
  source,
}: {
  title: ReactNode
  status: AreaStatus['status']
  mask: string
  advice: string[]
  source?: string
}) {
  const meta = STATUS_META[status]
  const maskNeeded = status !== 'SAFE'
  return (
    <div className="status-block" style={{ borderLeftColor: meta.color, background: meta.bg }}>
      <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 6 }}>{title}</div>
      <span className="status-pill" style={{ background: meta.bg, color: meta.color }}>
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: meta.color,
            display: 'inline-block',
          }}
        />
        {meta.label}
      </span>
      <div className="mask-line">
        <span aria-hidden>{maskNeeded ? '😷' : '✓'}</span>
        <span>
          <strong>Face mask:</strong> {mask}
        </span>
      </div>
      {source && <p className="muted" style={{ marginBottom: 0 }}>Source: {source}</p>}
      {advice.length > 0 && (
        <ul className="advice">
          {advice.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
