export type SafetyStatus = 'SAFE' | 'CAUTION' | 'UNSAFE'

export interface AreaStatus {
  id: number
  name: string
  latitude: number
  longitude: number
  status: SafetyStatus
  maskGuidance: string
  source: string
  updatedAt: string
  recentReportCount: number
}

export interface SafetyCheck {
  nearestArea: string
  distanceKm: number
  status: SafetyStatus
  maskGuidance: string
  advice: string[]
}

export const STATUS_META: Record<
  SafetyStatus,
  { label: string; color: string; bg: string }
> = {
  SAFE: { label: 'Safe', color: '#3B6D11', bg: '#EAF3DE' },
  CAUTION: { label: 'Caution', color: '#854F0B', bg: '#FAEEDA' },
  UNSAFE: { label: 'Unsafe', color: '#A32D2D', bg: '#FCEBEB' },
}
