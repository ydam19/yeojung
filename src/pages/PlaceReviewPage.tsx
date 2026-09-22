import { useNavigate, useLocation } from 'react-router-dom'
import { TopBar } from '../components/layout/TopBar'
import { useTripStore } from '../store/useTripStore'
import { naverMapSearchUrl } from '../utils/naverMaps'
import { PLACE_CATEGORY_EMOJI } from '../types'
import type { Attraction } from '../data/attractions'

interface LocationState {
  selected: Attraction[]
  regionId: string
}

export function PlaceReviewPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as LocationState | null
  const { createTrip, addPlacesBulk } = useTripStore()

  if (!state?.selected?.length) {
    navigate('/discover')
    return null
  }

  const { selected } = state

  function handleCreateTrip() {
    const today = new Date().toISOString().slice(0, 10)
    const destination = selected[0]?.address?.split(' ').slice(0, 2).join(' ') ?? '미정'
    const trip = createTrip({ title: '새 여행', destination, startDate: today, endDate: today })

    addPlacesBulk(trip.id, 0, selected.map(a => ({
      name: a.name,
      address: a.address,
      category: a.category,
      coordinates: { lat: a.lat, lng: a.lng },
      notes: a.description,
    })))

    navigate(`/trips/${trip.id}`)
  }

  return (
    <div className="flex flex-col h-full">
      <TopBar title="선택한 장소" />

      <div className="flex-1 overflow-y-auto p-4">
        <p className="text-sm text-gray-400 mb-4 px-1">총 {selected.length}개 장소 · 순서를 확인해보세요</p>

        <div className="flex flex-col gap-2">
          {selected.map((place, i) => (
            <div key={place.id} className="bg-white rounded-2xl p-4 border border-gray-100 flex items-start gap-3">
              {/* 번호 */}
              <div className="w-7 h-7 rounded-full bg-[#3182F6] text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                {i + 1}
              </div>

              {/* 내용 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span>{PLACE_CATEGORY_EMOJI[place.category]}</span>
                  <span className="font-bold text-gray-900 text-sm">{place.name}</span>
                </div>
                {place.description && (
                  <p className="text-xs text-gray-500 mt-0.5">{place.description}</p>
                )}
                <p className="text-xs text-gray-300 mt-0.5 truncate">{place.address}</p>
              </div>

              {/* 네이버 지도 */}
              <a
                href={naverMapSearchUrl(place.name)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-300 hover:text-[#03C75A] transition-colors shrink-0 mt-0.5"
                title="네이버 지도에서 보기"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
                  <path d="M9 1C5.13 1 2 4.13 2 8c0 5.25 7 10 7 10s7-4.75 7-10c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S7.62 5.5 9 5.5s2.5 1.12 2.5 2.5S10.38 10.5 9 10.5z"/>
                </svg>
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* 하단 버튼 */}
      <div className="p-4 border-t border-gray-100 bg-white flex flex-col gap-2">
        <button
          onClick={handleCreateTrip}
          className="w-full py-3.5 rounded-xl bg-[#3182F6] text-white font-bold text-sm hover:bg-blue-600 active:scale-95 transition-all"
        >
          이 장소들로 여행 만들기 ✈️
        </button>
        <button
          onClick={() => navigate('/')}
          className="w-full py-2.5 text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          일단 저장하고 나중에 설정하기
        </button>
      </div>
    </div>
  )
}
