import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useTripStore } from '../store/useTripStore'
import { TopBar } from '../components/layout/TopBar'
import { getDayLabel, formatDate } from '../utils/dateUtils'
import { defaultCenter, getBounds } from '../utils/geoUtils'
import { naverMapCoordUrl } from '../utils/naverMaps'
import type { Place } from '../types'
import { PLACE_CATEGORY_EMOJI } from '../types'

// Leaflet 기본 아이콘 버그 수정
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

function createNumberedIcon(num: number, color = '#3182F6') {
  return L.divIcon({
    className: '',
    html: `<div style="
      background:${color};color:white;font-size:11px;font-weight:700;
      width:28px;height:28px;border-radius:50%;display:flex;align-items:center;
      justify-content:center;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)">
      ${num}
    </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })
}

function FitBounds({ coords }: { coords: [number, number][] }) {
  const map = useMap()
  useEffect(() => {
    if (coords.length === 0) return
    if (coords.length === 1) { map.setView(coords[0], 14); return }
    const bounds = getBounds(coords.map(([lat, lng]) => ({ lat, lng })))
    if (bounds) map.fitBounds(bounds, { padding: [40, 40] })
  }, [map, coords])
  return null
}

export function MapPage() {
  const { tripId } = useParams<{ tripId: string }>()
  const navigate = useNavigate()
  const { getTrip } = useTripStore()
  const trip = getTrip(tripId!)
  const [selectedDay, setSelectedDay] = useState<number | 'all'>('all')

  if (!trip) { navigate('/'); return null }

  const allPlaces: (Place & { dayIndex: number })[] = trip.days.flatMap((d, i) =>
    d.places.map(p => ({ ...p, dayIndex: i }))
  )

  const filteredPlaces = selectedDay === 'all'
    ? allPlaces
    : allPlaces.filter(p => p.dayIndex === selectedDay)

  const withCoords = filteredPlaces.filter(p => p.coordinates)
  const coords: [number, number][] = withCoords.map(p => [p.coordinates!.lat, p.coordinates!.lng])
  const center = defaultCenter(filteredPlaces)

  const dayColors = ['#3182F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4']

  return (
    <div className="flex flex-col min-h-full">
      <TopBar title="경로 지도" />

      {/* 날짜 필터 */}
      <div className="bg-white border-b border-gray-100 overflow-x-auto shrink-0">
        <div className="flex px-4 py-2 gap-2 min-w-max">
          <button
            onClick={() => setSelectedDay('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${selectedDay === 'all' ? 'bg-[#3182F6] text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            전체
          </button>
          {trip.days.map((d, i) => (
            <button
              key={d.date}
              onClick={() => setSelectedDay(i)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors`}
              style={
                selectedDay === i
                  ? { backgroundColor: dayColors[i % dayColors.length], color: 'white' }
                  : { backgroundColor: '#F3F4F6', color: '#4B5563' }
              }
            >
              {getDayLabel(i)} · {formatDate(d.date).slice(6)}
            </button>
          ))}
        </div>
      </div>

      {/* 지도 */}
      <div className="flex-1 relative">
        {withCoords.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
            <span className="text-4xl">📍</span>
            <p className="text-sm">장소에 좌표를 추가하면 지도에 표시돼요</p>
            <p className="text-xs text-gray-300">일정 관리에서 장소를 추가할 때 위도/경도를 입력해주세요</p>
          </div>
        ) : (
          <MapContainer
            center={[center.lat, center.lng]}
            zoom={13}
            className="w-full h-full"
            style={{ zIndex: 0 }}
          >
            <TileLayer
              attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FitBounds coords={coords} />

            {withCoords.map((place, idx) => {
              const color = selectedDay === 'all' ? dayColors[place.dayIndex % dayColors.length] : dayColors[(place.dayIndex) % dayColors.length]
              return (
                <Marker
                  key={place.id}
                  position={[place.coordinates!.lat, place.coordinates!.lng]}
                  icon={createNumberedIcon(idx + 1, color)}
                >
                  <Popup>
                    <div className="text-sm min-w-[140px]">
                      <div className="font-bold">{PLACE_CATEGORY_EMOJI[place.category]} {place.name}</div>
                      {place.startTime && <div className="text-gray-500">{place.startTime}{place.endTime && ` ~ ${place.endTime}`}</div>}
                      {place.notes && <div className="text-gray-400 text-xs mt-1">{place.notes}</div>}
                      <a
                        href={naverMapCoordUrl(place.coordinates!.lat, place.coordinates!.lng, place.name)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 flex items-center gap-1 text-[#03C75A] font-medium text-xs hover:underline"
                      >
                        <svg width="12" height="12" viewBox="0 0 18 18" fill="currentColor">
                          <path d="M9 1C5.13 1 2 4.13 2 8c0 5.25 7 10 7 10s7-4.75 7-10c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S7.62 5.5 9 5.5s2.5 1.12 2.5 2.5S10.38 10.5 9 10.5z"/>
                        </svg>
                        네이버 지도에서 보기
                      </a>
                    </div>
                  </Popup>
                </Marker>
              )
            })}

            {/* 경로 선 */}
            {selectedDay === 'all' ? (
              trip.days.map((_, dayIdx) => {
                const dayCoords = allPlaces
                  .filter(p => p.dayIndex === dayIdx && p.coordinates)
                  .map(p => [p.coordinates!.lat, p.coordinates!.lng] as [number, number])
                if (dayCoords.length < 2) return null
                return (
                  <Polyline
                    key={dayIdx}
                    positions={dayCoords}
                    color={dayColors[dayIdx % dayColors.length]}
                    weight={3}
                    dashArray="8, 6"
                    opacity={0.8}
                  />
                )
              })
            ) : (
              coords.length >= 2 && (
                <Polyline
                  positions={coords}
                  color={dayColors[selectedDay % dayColors.length]}
                  weight={3}
                  dashArray="8, 6"
                  opacity={0.8}
                />
              )
            )}
          </MapContainer>
        )}
      </div>
    </div>
  )
}
