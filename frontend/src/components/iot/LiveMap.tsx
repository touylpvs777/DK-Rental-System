import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

export interface LiveMapDevice {
  id: number
  name: string
  deviceId: string | null
  latitude: number
  longitude: number
  lastUpdate: string | null
  isLive?: boolean
}

interface LiveMapProps {
  devices: LiveMapDevice[]
  /** Device id to pan/zoom to and pop open (e.g. from clicking its table row). */
  focusId?: number | null
  className?: string
  emptyLabel?: string
}

// Vientiane, Laos — initial view before any device data has loaded;
// FitToDevices immediately re-centers once real coordinates arrive.
const DEFAULT_CENTER: [number, number] = [17.9757, 102.6331]
const DEFAULT_ZOOM = 12

// Custom SVG pin (via L.divIcon) instead of Leaflet's default marker image:
// avoids the classic broken-marker-icon issue bundlers like Vite cause with
// Leaflet's image-URL-based default icon, and lets the pin color reflect
// live/offline status. The live pulse uses Tailwind's built-in `animate-ping`
// utility, so no extra CSS file is needed for it — `className: ''` clears
// Leaflet's own `.leaflet-div-icon` default (white box + gray border) so the
// pin's transparent SVG background actually shows through.
function buildPinIcon(isLive: boolean): L.DivIcon {
  const color = isLive ? '#22c55e' : '#9ca3af'
  return L.divIcon({
    className: '',
    html: `
      <div class="relative h-[38px] w-7">
        ${isLive ? '<span class="absolute left-[7px] top-[7px] h-3 w-3 animate-ping rounded-full bg-emerald-400 opacity-75"></span>' : ''}
        <svg width="28" height="38" viewBox="0 0 28 38" xmlns="http://www.w3.org/2000/svg">
          <path d="M14 0C6.3 0 0 6.3 0 14c0 9.8 14 24 14 24s14-14.2 14-24C28 6.3 21.7 0 14 0z" fill="${color}" stroke="#ffffff" stroke-width="1.5"/>
          <circle cx="14" cy="14" r="5.5" fill="#ffffff"/>
        </svg>
      </div>
    `,
    iconSize: [28, 38],
    iconAnchor: [14, 38],
    popupAnchor: [0, -34],
    tooltipAnchor: [0, -28],
  })
}

const LIVE_ICON = buildPinIcon(true)
const OFFLINE_ICON = buildPinIcon(false)

function FitToDevices({ devices }: { devices: LiveMapDevice[] }) {
  const map = useMap()

  useEffect(() => {
    if (devices.length === 0) return
    if (devices.length === 1) {
      map.setView([devices[0].latitude, devices[0].longitude], 15)
      return
    }
    const bounds = L.latLngBounds(devices.map((d) => [d.latitude, d.longitude] as [number, number]))
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 })
  }, [devices, map])

  return null
}

function FocusDevice({
  devices,
  focusId,
  markerRefs,
}: {
  devices: LiveMapDevice[]
  focusId: number | null | undefined
  markerRefs: React.RefObject<Map<number, L.Marker>>
}) {
  const map = useMap()

  useEffect(() => {
    if (focusId == null) return
    const device = devices.find((d) => d.id === focusId)
    if (!device) return
    map.setView([device.latitude, device.longitude], 16, { animate: true })
    markerRefs.current.get(focusId)?.openPopup()
  }, [focusId, devices, map, markerRefs])

  return null
}

function formatLastUpdate(iso: string | null): string {
  if (!iso) return 'No location data yet'
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'Updated just now'
  if (mins < 60) return `Updated ${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `Updated ${hours}h ago`
  const days = Math.floor(hours / 24)
  return `Updated ${days}d ago`
}

export default function LiveMap({
  devices,
  focusId,
  className = '',
  emptyLabel = 'No forklifts currently reporting GPS location.',
}: LiveMapProps) {
  const markerRefs = useRef<Map<number, L.Marker>>(new Map())

  return (
    // `isolate` gives this card its own stacking context so the z-[1001] on
    // the empty-state overlay below is only ever compared against Leaflet's
    // own internal layers (max 1000), not against unrelated ancestors
    // elsewhere on the page (sidebar/header) that might also carry z-index.
    <div className={`relative isolate h-96 w-full overflow-hidden rounded-2xl border border-[var(--color-border)] shadow-md ${className}`}>
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        scrollWheelZoom
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitToDevices devices={devices} />
        <FocusDevice devices={devices} focusId={focusId} markerRefs={markerRefs} />
        {devices.map((d) => (
          <Marker
            key={d.id}
            position={[d.latitude, d.longitude]}
            icon={d.isLive ? LIVE_ICON : OFFLINE_ICON}
            ref={(m) => {
              if (m) markerRefs.current.set(d.id, m)
              else markerRefs.current.delete(d.id)
            }}
          >
            {/* Hover: compact tooltip. Click: fuller popup. Both carry the
                same identity + last-update info, so either interaction works. */}
            <Tooltip direction="top" offset={[0, -6]}>
              <span className="font-semibold">{d.name}</span>{d.deviceId ? ` — ${d.deviceId}` : ''}
            </Tooltip>
            <Popup>
              {/* Popup chrome renders over map tiles, not the app shell, so
                  it's kept on a plain light background intentionally rather
                  than wired to the app's dark-mode tokens — a dark popup box
                  would fight with the light OpenStreetMap tiles behind it. */}
              <div className="min-w-[140px] text-xs leading-relaxed">
                <div className="text-sm font-bold text-slate-800">{d.name}</div>
                {d.deviceId && <div className="mt-0.5 font-mono text-slate-500">{d.deviceId}</div>}
                <div className="mt-1 text-slate-400">{formatLastUpdate(d.lastUpdate)}</div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {devices.length === 0 && (
        // z-[1001]: leaflet.css puts `.leaflet-control-container` at z-index
        // 1000 and gives map tiles `mix-blend-mode: plus-lighter` (a Chromium
        // rendering workaround baked into Leaflet itself), which pulls
        // `.leaflet-container` into its own compositing context — a sibling
        // overlay with `z-index: auto` loses to that and renders invisibly
        // *underneath* the tiles despite being later in the DOM. An explicit
        // z-index above Leaflet's own highest (1000) is required to win.
        <div className="pointer-events-none absolute inset-0 z-[1001] flex items-center justify-center bg-[var(--color-surface)] p-6 text-center text-sm text-[var(--color-text-muted)]">
          {emptyLabel}
        </div>
      )}
    </div>
  )
}
