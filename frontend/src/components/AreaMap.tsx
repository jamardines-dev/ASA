import { useEffect, useRef } from 'react'
import {
  MapContainer,
  TileLayer,
  Circle,
  Marker,
  Popup,
  Pane,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import L from 'leaflet'
import type { AreaStatus } from '../types'
import { STATUS_META } from '../types'
import type { LatLng } from '../App'
import type { AshReport } from '../App'

const CEBU_CENTER: [number, number] = [10.32, 123.8]
const ZONE_RADIUS_METERS = 5500

const pinIcon = L.divIcon({
  className: 'pin-icon',
  html: '<div class="pin-icon-inner">📍</div>',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
})

function areaMarkerIcon(status: AreaStatus['status'], justChanged: boolean) {
  const classes = ['area-pin', status === 'UNSAFE' ? 'pulse-pin' : '', justChanged ? 'flash-pin' : '']
    .filter(Boolean)
    .join(' ')
  return L.divIcon({
    className: classes,
    html: `<div class="area-pin-body" style="--pin-color: ${STATUS_META[status].color}"></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 20],
    popupAnchor: [0, -18],
  })
}

function reportMarkerIcon() {
  return L.divIcon({
    className: 'report-pin',
    html: '<div class="report-pin-body">🔴</div>',
    iconSize: [20, 20],
    iconAnchor: [10, 20],
    popupAnchor: [0, -18],
  })
}

interface Props {
  areas: AreaStatus[]
  reports: AshReport[]
  onSelect: (area: AreaStatus) => void
  changedIds: Set<number>
  activeLocation: LatLng | null
  pickMode: boolean
  onPickLocation: (lat: number, lng: number) => void
  onDragLocation: (lat: number, lng: number) => void
}

export default function AreaMap({
  areas,
  reports,
  onSelect,
  changedIds,
  activeLocation,
  pickMode,
  onPickLocation,
  onDragLocation,
}: Props) {
  return (
    <MapContainer center={CEBU_CENTER} zoom={10} scrollWheelZoom className={pickMode ? 'pick-mode' : ''}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <Pane name="zoneBlobs" style={{ filter: 'blur(20px)', zIndex: 350 }}>
        {areas.map((area) => (
          <Circle
            key={area.id}
            pane="zoneBlobs"
            center={[area.latitude, area.longitude]}
            radius={ZONE_RADIUS_METERS}
            className="zone-blob"
            pathOptions={{
              stroke: false,
              fillColor: `url(#zone-gradient-${area.status})`,
              fillOpacity: 1,
            }}
          />
        ))}
        <ZoneGradientDefs areasKey={areas.length} />
      </Pane>

      {areas.map((area) => {
        const meta = STATUS_META[area.status]
        const justChanged = changedIds.has(area.id)
        return (
          <Marker
            key={area.id}
            position={[area.latitude, area.longitude]}
            icon={areaMarkerIcon(area.status, justChanged)}
            eventHandlers={{ click: () => onSelect(area) }}
          >
            <Popup>
              <div className="popup-name">{area.name}</div>
              <div className="popup-row">
                Status: <strong style={{ color: meta.color }}>{meta.label}</strong>
              </div>
              <div className="popup-row">Mask: {area.maskGuidance}</div>
              <div className="popup-row">Source: {area.source}</div>
              {area.recentReportCount > 0 && (
                <div className="popup-row">
                  {area.recentReportCount} crowd report{area.recentReportCount > 1 ? 's' : ''} in the last 3h
                </div>
              )}
            </Popup>
          </Marker>
        )
      })}

      {reports.map((report, idx) => (
        <Marker
          key={`report-${idx}`}
          position={[report.latitude, report.longitude]}
          icon={reportMarkerIcon()}
        >
          <Popup>
            <div className="popup-name">Ash Sighting Report</div>
            <div className="popup-row">{report.note}</div>
            <div className="popup-row" style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
              {new Date(report.reportedAt).toLocaleTimeString()}
            </div>
          </Popup>
        </Marker>
      ))}

      {activeLocation && (
        <Marker
          position={[activeLocation.lat, activeLocation.lng]}
          icon={pinIcon}
          draggable
          eventHandlers={{
            dragend: (e) => {
              const pos = (e.target as L.Marker).getLatLng()
              onDragLocation(pos.lat, pos.lng)
            },
          }}
        />
      )}

      <PickModeHandler pickMode={pickMode} onPick={onPickLocation} />
      <CursorController pickMode={pickMode} />
      <FlyToLocation location={activeLocation} />
    </MapContainer>
  )
}

const SVG_NS = 'http://www.w3.org/2000/svg'

/** Injects per-status radial gradients into the zoneBlobs pane's SVG so zones fade center→edge instead of flat opacity. */
function ZoneGradientDefs({ areasKey }: { areasKey: number }) {
  const map = useMap()
  useEffect(() => {
    const pane = map.getPane('zoneBlobs')
    const svg = pane?.querySelector('svg')
    if (!svg || svg.querySelector('#zone-gradients')) return

    const defs = document.createElementNS(SVG_NS, 'defs')
    defs.id = 'zone-gradients'
    ;(Object.keys(STATUS_META) as Array<keyof typeof STATUS_META>).forEach((key) => {
      const gradient = document.createElementNS(SVG_NS, 'radialGradient')
      gradient.id = `zone-gradient-${key}`
      const stopCenter = document.createElementNS(SVG_NS, 'stop')
      stopCenter.setAttribute('offset', '0%')
      stopCenter.setAttribute('stop-color', STATUS_META[key].color)
      stopCenter.setAttribute('stop-opacity', '0.6')
      const stopEdge = document.createElementNS(SVG_NS, 'stop')
      stopEdge.setAttribute('offset', '100%')
      stopEdge.setAttribute('stop-color', STATUS_META[key].color)
      stopEdge.setAttribute('stop-opacity', '0')
      gradient.appendChild(stopCenter)
      gradient.appendChild(stopEdge)
      defs.appendChild(gradient)
    })
    svg.insertBefore(defs, svg.firstChild)
  }, [map, areasKey])
  return null
}

function PickModeHandler({ pickMode, onPick }: { pickMode: boolean; onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      if (!pickMode) return
      onPick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

function CursorController({ pickMode }: { pickMode: boolean }) {
  const map = useMap()
  const container = useRef(map.getContainer())
  useEffect(() => {
    container.current.style.cursor = pickMode ? 'crosshair' : ''
  }, [pickMode])
  return null
}

const LOCATION_FLY_ZOOM = 14

/** Flies/zooms the map to the pin whenever the active location is set or moved. */
function FlyToLocation({ location }: { location: LatLng | null }) {
  const map = useMap()
  useEffect(() => {
    if (!location) return
    map.flyTo([location.lat, location.lng], Math.max(map.getZoom(), LOCATION_FLY_ZOOM), {
      duration: 1.2,
    })
  }, [location?.lat, location?.lng])
  return null
}
