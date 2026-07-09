import type { AreaStatus, SafetyCheck } from './types'

const BASE = '/api'

export async function fetchAreaStatuses(): Promise<AreaStatus[]> {
  const res = await fetch(`${BASE}/areas/status`)
  if (!res.ok) throw new Error(`Failed to load area statuses (${res.status})`)
  return res.json()
}

export async function checkMyLocation(lat: number, lng: number): Promise<SafetyCheck> {
  const res = await fetch(`${BASE}/safety-check?lat=${lat}&lng=${lng}`)
  if (!res.ok) throw new Error(`Safety check failed (${res.status})`)
  return res.json()
}

export async function fetchRecentReports(): Promise<Array<{ latitude: number; longitude: number; note: string; reportedAt: string }>> {
  const res = await fetch(`${BASE}/reports`)
  if (!res.ok) throw new Error(`Failed to fetch reports (${res.status})`)
  return res.json()
}

export async function submitReport(lat: number, lng: number, note: string): Promise<void> {
  const res = await fetch(`${BASE}/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ latitude: lat, longitude: lng, note }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `Report failed (${res.status})`)
  }
}

export function subscribeToAreaUpdates(
  onUpdate: (areas: AreaStatus[]) => void,
  onConnectionChange?: (connected: boolean) => void,
): () => void {
  const source = new EventSource(`${BASE}/areas/stream`)
  source.addEventListener('areas', (event) => {
    const data = JSON.parse((event as MessageEvent).data) as AreaStatus[]
    onUpdate(data)
  })
  source.onopen = () => onConnectionChange?.(true)
  source.onerror = () => onConnectionChange?.(false)
  return () => source.close()
}
