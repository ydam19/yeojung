import { useNavigate, useParams } from 'react-router-dom'
import { useTripStore } from '../store/useTripStore'
import { TopBar } from '../components/layout/TopBar'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { formatDate, formatDateRange, getDayLabel } from '../utils/dateUtils'
import { PLACE_CATEGORY_EMOJI } from '../types'
import { naverMapSearchUrl, naverMapCoordUrl } from '../utils/naverMaps'
import type { TripDay } from '../types'

function DaySection({ day, index, tripId, onAddPlace }: { day: TripDay; index: number; tripId: string; onAddPlace: () => void }) {
  const { deletePlace } = useTripStore()

  return (
    <div className="mb-4">
      <div className="flex items-center gap-3 px-5 py-3 bg-gray-50 border-y border-gray-100">
        <div className="bg-[#3182F6] text-white text-xs font-bold px-2.5 py-1 rounded-full">{getDayLabel(index)}</div>
        <span className="text-sm text-gray-500">{formatDate(day.date)}</span>
      </div>

      {day.places.length > 0 ? (
        <div className="px-4 pt-2 pb-1">
          {day.places.map((place, placeIdx) => (
            <div key={place.id} className="flex items-start gap-3 py-3">
              <div className="flex flex-col items-center">
                <div className="w-7 h-7 rounded-full bg-[#3182F6] text-white text-xs font-bold flex items-center justify-center shrink-0">
                  {placeIdx + 1}
                </div>
                {placeIdx < day.places.length - 1 && <div className="w-0.5 h-8 bg-gray-200 mt-1" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-base">{PLACE_CATEGORY_EMOJI[place.category]}</span>
                      <span className="font-semibold text-gray-900 text-sm">{place.name}</span>
                    </div>
                    {(place.startTime || place.endTime) && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {place.startTime}{place.startTime && place.endTime && ' ~ '}{place.endTime}
                      </p>
                    )}
                    {place.notes && <p className="text-xs text-gray-500 mt-1">{place.notes}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={
                        place.coordinates
                          ? naverMapCoordUrl(place.coordinates.lat, place.coordinates.lng, place.name)
                          : naverMapSearchUrl(place.name)
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      title="네이버 지도에서 보기"
                      className="text-gray-300 hover:text-[#03C75A] transition-colors"
                      onClick={e => e.stopPropagation()}
                    >
                      <svg width="16" height="16" viewBox="0 0 18 18" fill="currentColor">
                        <path d="M9 1C5.13 1 2 4.13 2 8c0 5.25 7 10 7 10s7-4.75 7-10c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S7.62 5.5 9 5.5s2.5 1.12 2.5 2.5S10.38 10.5 9 10.5z"/>
                      </svg>
                    </a>
                    <button
                      onClick={() => deletePlace(tripId, index, place.id)}
                      className="text-gray-300 hover:text-red-400 transition-colors text-lg leading-none"
                    >×</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="px-4 py-3">
          <p className="text-sm text-gray-400 text-center py-2">아직 장소가 없어요</p>
        </div>
      )}

      <div className="px-4 pb-3">
        <button
          onClick={onAddPlace}
          className="w-full py-2.5 rounded-xl border border-dashed border-gray-200 text-sm text-gray-400 hover:border-[#3182F6] hover:text-[#3182F6] transition-colors"
        >
          + 장소 추가
        </button>
      </div>
    </div>
  )
}

export function TripDetailPage() {
  const { tripId } = useParams<{ tripId: string }>()
  const navigate = useNavigate()
  const { getTrip } = useTripStore()
  const trip = getTrip(tripId!)

  if (!trip) {
    return (
      <div className="flex flex-col min-h-full">
        <TopBar title="여행 상세" />
        <EmptyState emoji="😅" title="여행을 찾을 수 없어요" action={{ label: '홈으로', onClick: () => navigate('/') }} />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-full">
      <TopBar
        title={trip.title}
        right={
          <button onClick={() => navigate(`/trips/${tripId}/edit`)} className="text-sm text-[#3182F6] font-medium">
            편집
          </button>
        }
      />

      {/* 헤더 */}
      <div className="bg-white px-5 py-4 border-b border-gray-100">
        {trip.coverImageBase64 && (
          <img src={trip.coverImageBase64} alt="" className="w-full h-32 object-cover rounded-xl mb-3" />
        )}
        <p className="text-sm font-semibold text-gray-700">📍 {trip.destination}</p>
        <p className="text-xs text-gray-400 mt-0.5">{formatDateRange(trip.startDate, trip.endDate)}</p>

        <div className="flex gap-2 mt-4">
          <Button variant="secondary" size="sm" onClick={() => navigate(`/trips/${tripId}/map`)}>
            🗺️ 지도 보기
          </Button>
          <Button variant="secondary" size="sm" onClick={() => navigate(`/trips/${tripId}/share`)}>
            👥 공유
          </Button>
        </div>
      </div>

      {/* 일정 목록 */}
      <div className="flex-1 overflow-y-auto">
        {trip.days.length === 0 ? (
          <EmptyState emoji="📅" title="일정이 없어요" />
        ) : (
          trip.days.map((day, i) => (
            <DaySection
              key={day.date}
              day={day}
              index={i}
              tripId={trip.id}
              onAddPlace={() => navigate(`/trips/${tripId}/schedule?day=${i}`)}
            />
          ))
        )}
      </div>
    </div>
  )
}
