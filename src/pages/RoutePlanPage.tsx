import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePlanStore } from '../store/usePlanStore'
import { planRoute as planRouteAuto, formatMinutes, INTENSITY_LABELS } from '../utils/routePlanner'
import type { PlaceInput, DayPlan, RoutePlan } from '../utils/routePlanner'
import { CATEGORY_EMOJI, DEFAULT_STAY_MINUTES, REGION_CENTERS } from '../data/places'
import type { PlaceItem } from '../data/places'
import { haversineDistance } from '../utils/geoUtils'
import { loadKakaoSdk, HAS_KAKAO_KEY } from '../utils/kakaoLoader'

// ─── 상수 ────────────────────────────────────────────────────────────────────

const INTENSITY_STYLE = {
  relaxed: { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
  normal:  { bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500' },
  packed:  { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
} as const

// ─── 수동 모드: 사용자 순서 그대로 일수별 순차 분배 ─────────────────────────

function planRouteManual(places: PlaceInput[], numDays: number): RoutePlan {
  if (places.length === 0) {
    return {
      days: Array.from({ length: numDays }, (_, i) => ({
        day: i + 1, places: [], totalDistanceKm: 0, totalMinutes: 0, intensity: 'relaxed' as const,
      })),
      totalDistanceKm: 0,
      totalMinutes: 0,
    }
  }
  // 순서 유지하며 균등 분배
  const perDay = Math.ceil(places.length / numDays)
  const dayPlaces = Array.from({ length: numDays }, (_, i) =>
    places.slice(i * perDay, (i + 1) * perDay)
  )

  let totalDist = 0
  let totalMins = 0
  const days: DayPlan[] = dayPlaces.map((group, i) => {
    let dist = 0
    for (let j = 0; j < group.length - 1; j++) {
      dist += haversineDistance(
        { lat: group[j].lat, lng: group[j].lng },
        { lat: group[j + 1].lat, lng: group[j + 1].lng }
      )
    }
    const travelMins = Math.round((dist / 30) * 60)
    const stayMins = group.reduce((s, p) => s + p.stayMinutes, 0)
    const total = travelMins + stayMins
    totalDist += dist
    totalMins += total
    const intensity = total < 480 ? 'relaxed' : total < 600 ? 'normal' : 'packed'
    return {
      day: i + 1,
      places: group,
      totalDistanceKm: Math.round(dist * 10) / 10,
      totalMinutes: total,
      intensity,
    }
  })

  return {
    days,
    totalDistanceKm: Math.round(totalDist * 10) / 10,
    totalMinutes: totalMins,
  }
}

// ─── PlaceItem → PlaceInput 변환 ─────────────────────────────────────────────

function toPlaceInputs(items: PlaceItem[], regionId: string): PlaceInput[] {
  const center = REGION_CENTERS[regionId] ?? { lat: 37.5665, lng: 126.9780 }
  return items.map((item, idx) => ({
    id: item.id,
    name: item.name,
    lat: item.lat ?? center.lat + (idx % 3 - 1) * 0.005,
    lng: item.lng ?? center.lng + (Math.floor(idx / 3) % 3 - 1) * 0.005,
    stayMinutes: DEFAULT_STAY_MINUTES[item.category],
  }))
}

// ─── 카카오맵 컴포넌트 ────────────────────────────────────────────────────────

interface KakaoMapProps {
  dayPlan: DayPlan
  isReady: boolean
}

function KakaoMap({ dayPlan, isReady }: KakaoMapProps) {
  const mapInstanceRef = useRef<kakao.maps.Map | null>(null)
  const overlaysRef    = useRef<kakao.maps.CustomOverlay[]>([])
  const polylineRef    = useRef<kakao.maps.Polyline | null>(null)

  const containerRef = useCallback((container: HTMLDivElement | null) => {
    if (!isReady || !container) return

    // 지도 초기화 (컨테이너당 1회)
    if (!mapInstanceRef.current) {
      const first = dayPlan.places[0]
      const center = first
        ? new kakao.maps.LatLng(first.lat, first.lng)
        : new kakao.maps.LatLng(37.5665, 126.9780)

      mapInstanceRef.current = new kakao.maps.Map(container, {
        center,
        level: 7,
      })
    }
  }, [isReady]) // dayPlan은 의도적으로 제외 — 지도 인스턴스는 한 번만 생성

  // 마커·폴리라인 갱신 (activeDay 변경 시)
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!isReady || !map) return

    // 기존 레이어 제거
    overlaysRef.current.forEach(o => o.setMap(null))
    overlaysRef.current = []
    if (polylineRef.current) { polylineRef.current.setMap(null); polylineRef.current = null }

    const { places } = dayPlan
    if (places.length === 0) return

    const path: kakao.maps.LatLng[] = []
    const bounds = new kakao.maps.LatLngBounds()

    places.forEach((place, idx) => {
      const pos = new kakao.maps.LatLng(place.lat, place.lng)
      path.push(pos)
      bounds.extend(pos)

      // 번호 마커 (Custom Overlay)
      const isLast = idx === places.length - 1
      const overlay = new kakao.maps.CustomOverlay({
        position: pos,
        yAnchor: 1.3,
        zIndex: 10 + idx,
        content: `
          <div style="
            display:flex;flex-direction:column;align-items:center;gap:2px;
          ">
            <div style="
              width:28px;height:28px;border-radius:50%;
              background:${isLast ? '#FF6B35' : '#3182F6'};
              color:white;font-size:12px;font-weight:700;
              display:flex;align-items:center;justify-content:center;
              border:2px solid white;
              box-shadow:0 2px 6px rgba(0,0,0,0.25);
            ">${idx + 1}</div>
            <div style="
              background:white;border-radius:6px;padding:2px 6px;
              font-size:10px;font-weight:600;color:#333;
              box-shadow:0 1px 4px rgba(0,0,0,0.15);
              white-space:nowrap;max-width:80px;overflow:hidden;
              text-overflow:ellipsis;
            ">${place.name}</div>
          </div>
        `,
      })
      overlay.setMap(map)
      overlaysRef.current.push(overlay)
    })

    // 이동 경로선
    if (path.length > 1) {
      polylineRef.current = new kakao.maps.Polyline({
        path,
        strokeWeight: 3,
        strokeColor: '#3182F6',
        strokeOpacity: 0.75,
        strokeStyle: 'solid',
      })
      polylineRef.current.setMap(map)
    }

    // 모든 마커가 보이도록 지도 범위 조정
    map.setBounds(bounds, 60, 60, 60, 60)
  }, [isReady, dayPlan])

  return (
    <div
      ref={containerRef}
      className="w-full bg-gray-200"
      style={{ height: '240px' }}
    />
  )
}

// ─── 메인 페이지 ─────────────────────────────────────────────────────────────

export function RoutePlanPage() {
  const navigate = useNavigate()
  const { plan, clearPlan } = usePlanStore()
  const [activeDay, setActiveDay] = useState(0)
  const [mapReady, setMapReady] = useState(false)
  const [mapError, setMapError] = useState(false)

  // 카카오 SDK 로드
  useEffect(() => {
    if (!HAS_KAKAO_KEY) { setMapError(true); return }
    loadKakaoSdk()
      .then(() => setMapReady(true))
      .catch(() => setMapError(true))
  }, [])

  // 장소 변환 & 동선 계산
  const placeInputs = useMemo(
    () => toPlaceInputs(plan.selectedPlaces, plan.regionId),
    [plan.selectedPlaces, plan.regionId]
  )

  const numDays = plan.days + 1 // 박 → 일
  const routePlan = useMemo(
    () => plan.routeMode === 'manual'
      ? planRouteManual(placeInputs, numDays)
      : planRouteAuto(placeInputs, numDays),
    [placeInputs, numDays, plan.routeMode]
  )

  const currentDay = routePlan.days[activeDay]

  // activeDay 범위 보정
  const safeActiveDay = Math.min(activeDay, routePlan.days.length - 1)
  if (safeActiveDay !== activeDay) setActiveDay(safeActiveDay)

  // 구간 거리 계산 (연속 장소 간)
  function legKm(idx: number): number {
    const places = currentDay.places
    if (idx >= places.length - 1) return 0
    return haversineDistance(
      { lat: places[idx].lat, lng: places[idx].lng },
      { lat: places[idx + 1].lat, lng: places[idx + 1].lng }
    )
  }

  function handleRestart() {
    clearPlan()
    navigate('/')
  }

  const isEmpty = plan.selectedPlaces.length === 0

  return (
    <div className="flex flex-col h-full bg-white">
      {/* 헤더 */}
      <div className="px-5 pt-10 pb-3 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors flex-shrink-0"
        >
          <span className="text-xl text-gray-600">←</span>
        </button>
        <div>
          <h1 className="text-lg font-bold text-gray-900">동선 결과</h1>
          {plan.regionName && (
            <p className="text-xs text-gray-400">
              {plan.regionName} · {plan.days === 0 ? '당일치기' : `${plan.days}박${numDays}일`} · {plan.selectedPlaces.length}개 장소 · {plan.routeMode === 'manual' ? '내 순서' : '자동 최적화'}
            </p>
          )}
        </div>
      </div>

      {isEmpty ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8">
          <span className="text-5xl">🗺️</span>
          <p className="text-sm text-gray-400 text-center">
            선택한 장소가 없어요.<br />이전 화면에서 장소를 추가해주세요.
          </p>
          <button
            onClick={() => navigate(-1)}
            className="px-5 py-2.5 bg-blue-50 text-blue-500 text-sm font-semibold rounded-full"
          >
            장소 선택하러 가기
          </button>
        </div>
      ) : (
        <>
          {/* Day 탭 */}
          <div className="px-5 pb-3 flex gap-2 overflow-x-auto no-scrollbar">
            {routePlan.days.map((d, i) => (
              <button
                key={d.day}
                onClick={() => setActiveDay(i)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                  activeDay === i
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Day {d.day}
                {d.places.length > 0 && (
                  <span className={`ml-1.5 text-xs ${activeDay === i ? 'text-blue-100' : 'text-gray-400'}`}>
                    {d.places.length}곳
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* 카카오맵 */}
          {mapError ? (
            <div className="mx-5 mb-3 h-[240px] rounded-2xl bg-gray-100 flex flex-col items-center justify-center gap-2 text-gray-400">
              <span className="text-3xl">🗺️</span>
              <p className="text-xs text-center leading-relaxed">
                지도를 불러올 수 없어요.<br />
                <span className="text-blue-400">.env.local</span>에 카카오 키를 설정해주세요.
              </p>
            </div>
          ) : (
            <div className="mx-5 mb-3 rounded-2xl overflow-hidden">
              <KakaoMap key={activeDay} dayPlan={currentDay} isReady={mapReady} />
            </div>
          )}

          {/* 일자 요약 */}
          <div className="flex-1 overflow-y-auto px-5 pb-6">
            {currentDay.places.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-gray-300">
                <span className="text-3xl">📭</span>
                <p className="text-sm">이 날은 장소가 없어요</p>
              </div>
            ) : (
              <>
                {/* 강도 + 통계 */}
                <div className="flex items-center gap-2 mb-4">
                  {(() => {
                    const s = INTENSITY_STYLE[currentDay.intensity]
                    return (
                      <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${s.bg} ${s.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                        {INTENSITY_LABELS[currentDay.intensity]}
                      </span>
                    )
                  })()}
                  <span className="text-xs text-gray-400">
                    {currentDay.totalDistanceKm}km · {formatMinutes(currentDay.totalMinutes)}
                  </span>
                </div>

                {/* 장소 리스트 */}
                <div className="flex flex-col">
                  {currentDay.places.map((place, idx) => {
                    const km = legKm(idx)
                    const travelMins = Math.round((km / 30) * 60)
                    const isLast = idx === currentDay.places.length - 1

                    return (
                      <div key={place.id}>
                        {/* 장소 카드 */}
                        <div className="flex items-start gap-3 py-3">
                          {/* 번호 */}
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5 ${isLast ? 'bg-orange-400' : 'bg-blue-500'}`}>
                            {idx + 1}
                          </div>
                          {/* 정보 */}
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm">{CATEGORY_EMOJI[plan.selectedPlaces.find(p => p.id === place.id)?.category ?? 'attraction']}</span>
                              <p className="text-sm font-semibold text-gray-900">{place.name}</p>
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">체류 {formatMinutes(place.stayMinutes)}</p>
                          </div>
                        </div>

                        {/* 이동 구간 */}
                        {!isLast && (
                          <div className="flex items-center gap-3 pl-3.5 py-1">
                            <div className="w-[1px] h-6 bg-blue-200 ml-3" />
                            <span className="text-xs text-gray-400">
                              이동 {km.toFixed(1)}km · 약 {travelMins}분
                            </span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>

          {/* 하단 버튼 */}
          <div className="px-5 py-4 border-t border-gray-100">
            <button
              onClick={handleRestart}
              className="w-full py-3.5 rounded-2xl text-sm font-bold bg-gray-100 text-gray-600 hover:bg-gray-200 active:scale-95 transition-all"
            >
              처음부터 다시 계획하기
            </button>
          </div>
        </>
      )}
    </div>
  )
}
