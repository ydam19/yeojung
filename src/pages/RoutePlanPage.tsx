import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  pointerWithin,
  useDroppable,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { usePlanStore } from '../store/usePlanStore'
import type { TravelMode } from '../store/usePlanStore'
import { useTripStore } from '../store/useTripStore'
import {
  computeAutoAssignment,
  computeManualAssignment,
  planRouteFromAssignment,
  planRouteTransitFromAssignment,
  getDayTransitLeg,
  formatMinutes,
  INTENSITY_LABELS,
} from '../utils/routePlanner'
import type { PlaceInput, DayPlan, RoutePlan, AccomConstraint, TransitLeg } from '../utils/routePlanner'
import { HAS_TRANSIT_KEY } from '../utils/kakaoTransit'
import { fetchDayCarRoute, HAS_DIRECTIONS_KEY } from '../utils/kakaoDirections'
import type { TransitSection } from '../utils/kakaoTransit'
import { CATEGORY_EMOJI, DEFAULT_STAY_MINUTES, REGION_CENTERS } from '../data/places'
import type { PlaceItem } from '../data/places'
import { haversineDistance } from '../utils/geoUtils'
import { loadKakaoSdk, HAS_KAKAO_KEY } from '../utils/kakaoLoader'
import { formatDateShort } from '../utils/dateUtils'

// ─── 상수 ────────────────────────────────────────────────────────────────────

const INTENSITY_STYLE = {
  relaxed: { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
  normal:  { bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500' },
  packed:  { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
} as const

// ─── PlaceItem → PlaceInput 변환 ─────────────────────────────────────────────

function toPlaceInputs(
  items: PlaceItem[],
  regionId: string,
  stayOverrides?: Record<string, number>,
): PlaceInput[] {
  const center = REGION_CENTERS[regionId] ?? { lat: 37.5665, lng: 126.9780 }
  return items.map((item, idx) => ({
    id: item.id,
    name: item.name,
    lat: item.lat ?? center.lat + (idx % 3 - 1) * 0.005,
    lng: item.lng ?? center.lng + (Math.floor(idx / 3) % 3 - 1) * 0.005,
    stayMinutes: stayOverrides?.[item.id] ?? DEFAULT_STAY_MINUTES[item.category],
  }))
}

// ─── 체류 시간 강도 계산 (슬라이더 조정 기준) ────────────────────────────────

function calcAdjustedIntensity(
  totalMinutes: number,
  transferCount?: number,
): { label: string; bg: string; text: string; dot: string } {
  const STYLES = {
    relaxed: { label: '여유', bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
    normal:  { label: '보통', bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500' },
    packed:  { label: '빡빡', bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
  } as const
  type Grade = keyof typeof STYLES
  const RANK: Record<Grade, number> = { relaxed: 0, normal: 1, packed: 2 }

  let grade: Grade =
    totalMinutes < 480 ? 'relaxed' :
    totalMinutes < 660 ? 'normal'  :
    'packed'

  if (transferCount != null) {
    const transferGrade: Grade =
      transferCount > 6 ? 'packed' :
      transferCount > 3 ? 'normal' :
      'relaxed'
    if (RANK[transferGrade] > RANK[grade]) grade = transferGrade
  }

  return STYLES[grade]
}

// ─── 대중교통 구간 색상 ───────────────────────────────────────────────────────

type SectionMode = 'WALK' | 'BUS' | 'SUBWAY' | 'EXPRESSBUS' | 'TRAIN' | 'FERRY'

// 환승 구간마다 색 변화 (버스/지하철 각각 팔레트)
const BUS_PALETTE     = ['#3182F6', '#1D4ED8', '#6366F1', '#0EA5E9', '#2563EB']
const SUBWAY_PALETTE  = ['#F97316', '#EA580C', '#DC2626', '#D97706', '#C2410C']

/**
 * transitSegmentIdx: 전체 경로에서 몇 번째 비-도보 구간인지 (0-based).
 * lineColor가 있으면 API 색상을 우선, 없으면 팔레트 순환.
 */
function getSectionStyle(
  mode: SectionMode,
  lineColor?: string,
  transitSegmentIdx = 0,
): { color: string; weight: number; opacity: number; style: string } {
  if (mode === 'WALK') return { color: '#6B7280', weight: 4, opacity: 0.9, style: 'dot' }
  if (mode === 'BUS' || mode === 'EXPRESSBUS') {
    const color = lineColor ? `#${lineColor}` : BUS_PALETTE[transitSegmentIdx % BUS_PALETTE.length]
    return { color, weight: 6, opacity: 1.0, style: 'solid' }
  }
  if (mode === 'SUBWAY' || mode === 'TRAIN') {
    const color = lineColor ? `#${lineColor}` : SUBWAY_PALETTE[transitSegmentIdx % SUBWAY_PALETTE.length]
    return { color, weight: 6, opacity: 1.0, style: 'solid' }
  }
  return { color: '#6366F1', weight: 6, opacity: 1.0, style: 'solid' }
}

/**
 * carRoutePoints가 있으면 실제 도로 경로로 폴리라인 그리기,
 * 없으면 직선 fallback.
 */
function drawCarPolylines(
  map: kakao.maps.Map,
  straightPath: kakao.maps.LatLng[],
  polylinesRef: React.MutableRefObject<kakao.maps.Polyline[]>,
  carRoutePoints?: [number, number][] | null,
): void {
  // 실제 도로 경로가 있으면 사용
  if (carRoutePoints && carRoutePoints.length >= 2) {
    if (import.meta.env.DEV) {
      console.log('[drawCarPolylines] 실제 도로 경로 사용, 포인트 수:', carRoutePoints.length)
    }
    const roadPath = carRoutePoints.map(([lng, lat]) => new kakao.maps.LatLng(lat, lng))
    const pl = new kakao.maps.Polyline({
      path: roadPath,
      strokeWeight: 5,
      strokeColor: '#3182F6',
      strokeOpacity: 0.95,
      strokeStyle: 'solid',
    })
    pl.setMap(map)
    polylinesRef.current.push(pl)
    return
  }

  // fallback: 직선 경로
  if (import.meta.env.DEV) {
    console.log('[drawCarPolylines] 직선 fallback, 포인트 수:', straightPath.length)
  }
  if (straightPath.length < 2) return
  const pl = new kakao.maps.Polyline({
    path: straightPath,
    strokeWeight: 5,
    strokeColor: '#3182F6',
    strokeOpacity: 0.95,
    strokeStyle: 'dashed',
  })
  pl.setMap(map)
  polylinesRef.current.push(pl)
}

function drawTransitPolylines(
  map: kakao.maps.Map,
  dayPlan: DayPlan,
  polylinesRef: React.MutableRefObject<kakao.maps.Polyline[]>,
): void {
  const legs = dayPlan.transitLegs
  if (!legs || legs.length === 0) return

  if (import.meta.env.DEV) {
    console.log('[drawTransitPolylines] legs:', legs.length, legs.map(l => l?.sections.map(s => `${s.mode}(${s.points.length}pts)`)))
  }

  let drawnCount = 0
  let transitSegmentIdx = 0  // 비-도보 구간 번호 (환승 색 구분용)

  legs.forEach(leg => {
    if (!leg) return
    leg.sections.forEach(sec => {
      const isTransit = sec.mode !== 'WALK'
      if (sec.points.length >= 2) {
        const secPath = sec.points.map(([lng, lat]) => new kakao.maps.LatLng(lat, lng))
        const style = getSectionStyle(sec.mode as SectionMode, sec.lineColor, transitSegmentIdx)
        const pl = new kakao.maps.Polyline({
          path: secPath,
          strokeWeight: style.weight,
          strokeColor: style.color,
          strokeOpacity: style.opacity,
          strokeStyle: style.style as 'solid' | 'shortdash' | 'dash' | 'dot',
        })
        pl.setMap(map)
        polylinesRef.current.push(pl)
        drawnCount++
      }
      if (isTransit) transitSegmentIdx++
    })
  })

  // API에서 경로 points를 주지 않은 경우 → 장소 순서대로 직선 폴백
  if (drawnCount === 0) {
    const waypoints: kakao.maps.LatLng[] = []
    if (dayPlan.accommodation) {
      waypoints.push(new kakao.maps.LatLng(dayPlan.accommodation.lat, dayPlan.accommodation.lng))
    }
    dayPlan.places.forEach(p => waypoints.push(new kakao.maps.LatLng(p.lat, p.lng)))
    if (dayPlan.accommodation && dayPlan.places.length > 0) {
      waypoints.push(new kakao.maps.LatLng(dayPlan.accommodation.lat, dayPlan.accommodation.lng))
    }
    if (waypoints.length >= 2) {
      const fallback = new kakao.maps.Polyline({
        path: waypoints,
        strokeWeight: 5,
        strokeColor: '#6366F1',
        strokeOpacity: 0.9,
        strokeStyle: 'dash',
      })
      fallback.setMap(map)
      polylinesRef.current.push(fallback)
    }
  }
}

// ─── 카카오맵 컴포넌트 ────────────────────────────────────────────────────────

interface KakaoMapProps {
  dayPlan: DayPlan
  isReady: boolean
  travelMode: TravelMode
  /** 항상 지도에 표시할 전체 숙소 목록 */
  allAccommodations?: AccomConstraint[]
  /** 자동차 모드 실제 도로 경로 좌표 [lng, lat][] (없으면 직선 fallback) */
  carRoutePoints?: [number, number][] | null
}

function KakaoMap({ dayPlan, isReady, travelMode, allAccommodations, carRoutePoints }: KakaoMapProps) {
  const mapInstanceRef   = useRef<kakao.maps.Map | null>(null)
  const overlaysRef      = useRef<kakao.maps.CustomOverlay[]>([])
  const polylinesRef     = useRef<kakao.maps.Polyline[]>([])
  const containerRef     = useRef<HTMLDivElement | null>(null)
  const initialBoundsSet = useRef(false)

  // ── 지도 인스턴스 생성 (마운트 시 1회 또는 isReady 변경 시) ──────────────
  useEffect(() => {
    if (!isReady || !containerRef.current || mapInstanceRef.current) return
    const first = dayPlan.places[0] ?? dayPlan.accommodation
    const center = first
      ? new kakao.maps.LatLng(first.lat, first.lng)
      : new kakao.maps.LatLng(37.5665, 126.9780)
    mapInstanceRef.current = new kakao.maps.Map(containerRef.current, { center, level: 7 })
  }, [isReady]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── 마커/폴리라인 그리기 (데이터가 실제로 바뀔 때만) ─────────────────────
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!isReady || !map) return

    overlaysRef.current.forEach(o => o.setMap(null))
    overlaysRef.current = []
    polylinesRef.current.forEach(p => p.setMap(null))
    polylinesRef.current = []

    const { places, accommodation: accom } = dayPlan
    // 표시할 숙소: allAccommodations 전체(있으면), 없으면 현재 날의 숙소
    const accoms = allAccommodations && allAccommodations.length > 0
      ? allAccommodations
      : (accom ? [accom] : [])

    if (places.length === 0 && accoms.length === 0) return

    const path: kakao.maps.LatLng[] = []
    const bounds = new kakao.maps.LatLngBounds()

    // ── 모든 숙소 마커를 항상 표시 ───────────────────────────────────────────
    accoms.forEach(a => {
      console.log('[숙소마커] 그리는 중:', a.name, a.lat, a.lng)
      const aPos = new kakao.maps.LatLng(a.lat, a.lng)
      bounds.extend(aPos)

      const popupOverlay = new kakao.maps.CustomOverlay({
        position: aPos,
        yAnchor: 1.15,
        zIndex: 200,
        content: `
          <div style="
            background:white;border-radius:12px;padding:10px 14px;
            box-shadow:0 4px 20px rgba(0,0,0,0.18);
            border:1.5px solid #10B981;
            white-space:nowrap;position:relative;
          ">
            <p style="margin:0 0 5px;font-size:13px;font-weight:700;color:#065F46;">
              🏠 ${a.name}
            </p>
            <p style="margin:0;font-size:11px;color:#6B7280;">
              체크인 &nbsp;<b style="color:#374151;">${formatDateShort(a.checkIn)}</b>
            </p>
            <p style="margin:3px 0 0;font-size:11px;color:#6B7280;">
              체크아웃 <b style="color:#374151;">${formatDateShort(a.checkOut)}</b>
            </p>
            <div style="
              position:absolute;bottom:-7px;left:50%;
              transform:translateX(-50%) rotate(45deg);
              width:12px;height:12px;background:white;
              border-right:1.5px solid #10B981;border-bottom:1.5px solid #10B981;
            "></div>
          </div>
        `,
      })

      const markerEl = document.createElement('div')
      markerEl.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:3px;cursor:pointer;'

      const iconEl = document.createElement('div')
      iconEl.style.cssText = `
        width:36px;height:36px;border-radius:12px;
        background:#10B981;color:white;font-size:18px;
        display:flex;align-items:center;justify-content:center;
        border:2.5px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);
      `
      iconEl.textContent = '🏠'

      const labelEl = document.createElement('div')
      labelEl.style.cssText = `
        background:white;border-radius:6px;padding:2px 7px;
        font-size:10px;font-weight:700;color:#10B981;
        box-shadow:0 1px 4px rgba(0,0,0,0.15);
        max-width:90px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
      `
      labelEl.textContent = a.name

      markerEl.appendChild(iconEl)
      markerEl.appendChild(labelEl)

      let popupVisible = false
      markerEl.addEventListener('click', e => {
        e.stopPropagation()
        popupVisible = !popupVisible
        if (popupVisible) popupOverlay.setMap(map)
        else popupOverlay.setMap(null)
      })

      const aOverlay = new kakao.maps.CustomOverlay({
        position: aPos,
        content: markerEl,
        yAnchor: 1.3,
        zIndex: 20,
      })
      aOverlay.setMap(map)
      overlaysRef.current.push(aOverlay, popupOverlay)
    })

    // 경로 계산용 path에는 기존처럼 해당 날의 숙소만 사용
    if (accom) {
      path.push(new kakao.maps.LatLng(accom.lat, accom.lng))
    }

    places.forEach((place, idx) => {
      const pos = new kakao.maps.LatLng(place.lat, place.lng)
      path.push(pos)
      bounds.extend(pos)

      const isLast = idx === places.length - 1
      const overlay = new kakao.maps.CustomOverlay({
        position: pos,
        yAnchor: 1.3,
        zIndex: 10 + idx,
        content: `
          <div style="display:flex;flex-direction:column;align-items:center;gap:2px;">
            <div style="
              width:28px;height:28px;border-radius:50%;
              background:${isLast ? '#FF6B35' : '#3182F6'};
              color:white;font-size:12px;font-weight:700;
              display:flex;align-items:center;justify-content:center;
              border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.25);
            ">${idx + 1}</div>
            <div style="
              background:white;border-radius:6px;padding:2px 6px;
              font-size:10px;font-weight:600;color:#333;
              box-shadow:0 1px 4px rgba(0,0,0,0.15);
              white-space:nowrap;max-width:80px;overflow:hidden;text-overflow:ellipsis;
            ">${place.name}</div>
          </div>
        `,
      })
      overlay.setMap(map)
      overlaysRef.current.push(overlay)
    })

    if (accom && places.length > 0) {
      path.push(new kakao.maps.LatLng(accom.lat, accom.lng))
    }

    if (travelMode === 'transit') {
      drawTransitPolylines(map, dayPlan, polylinesRef)
    } else {
      drawCarPolylines(map, path, polylinesRef, carRoutePoints)
    }

    // setBounds는 최초 1회만 호출 — 이후 사용자 줌/패닝 상태 유지
    if (!initialBoundsSet.current) {
      if (places.length === 0 && accoms.length > 0) {
        map.setCenter(new kakao.maps.LatLng(accoms[0].lat, accoms[0].lng))
        map.setLevel(5)
      } else {
        map.setBounds(bounds, 60, 60, 60, 60)
      }
      initialBoundsSet.current = true
    }
  }, [isReady, dayPlan, travelMode, allAccommodations, carRoutePoints])

  return (
    <div
      ref={containerRef}
      className="w-full bg-gray-200"
      style={{ height: '240px' }}
    />
  )
}

// ─── 대중교통 구간 상세 표시 ──────────────────────────────────────────────────

function getSectionIcon(mode: string): string {
  if (mode === 'WALK') return '🚶'
  if (mode === 'BUS' || mode === 'EXPRESSBUS') return '🚌'
  if (mode === 'SUBWAY') return '🚇'
  if (mode === 'TRAIN') return '🚆'
  if (mode === 'FERRY') return '⛴️'
  return '🚌'
}

function TransitSectionRow({
  section,
  colorIdx,
}: {
  section: TransitSection
  colorIdx: number
}) {
  const mins = Math.max(1, Math.round(section.sectionTime / 60))
  const icon = getSectionIcon(section.mode)
  const isWalk = section.mode === 'WALK'

  // 탑승역 / 하차역
  const fromStop = section.stops?.[0]
  const toStop   = section.stops && section.stops.length > 1
    ? section.stops[section.stops.length - 1]
    : undefined
  // 중간 경유 정류장 수 (탑승·하차 제외)
  const midStops = section.stops ? Math.max(0, section.stops.length - 2) : null

  const busColors    = ['text-blue-700 bg-blue-50 border-blue-200', 'text-indigo-700 bg-indigo-50 border-indigo-200', 'text-sky-700 bg-sky-50 border-sky-200', 'text-blue-800 bg-blue-100 border-blue-300']
  const subwayColors = ['text-orange-700 bg-orange-50 border-orange-200', 'text-amber-700 bg-amber-50 border-amber-200', 'text-red-700 bg-red-50 border-red-200', 'text-orange-800 bg-orange-100 border-orange-300']
  const walkStyle    = 'text-gray-500 bg-gray-50 border-gray-200'

  const colorClass = isWalk
    ? walkStyle
    : (section.mode === 'SUBWAY' || section.mode === 'TRAIN')
      ? subwayColors[colorIdx % subwayColors.length]
      : busColors[colorIdx % busColors.length]

  return (
    <div className={`flex items-start gap-2.5 px-3 py-2 rounded-xl border ${colorClass}`}>
      <span className="text-sm mt-0.5 flex-shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        {/* 노선명 + 출발→도착 */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {section.lineName && !isWalk && (
            <span className="font-bold text-xs">{section.lineName}</span>
          )}
          {isWalk && <span className="font-semibold text-xs">도보</span>}
          {!isWalk && fromStop && toStop && (
            <span className="text-xs opacity-80 truncate max-w-[180px]">
              {fromStop} → {toStop}
            </span>
          )}
          {!isWalk && fromStop && !toStop && (
            <span className="text-xs opacity-80 truncate max-w-[180px]">{fromStop}</span>
          )}
        </div>
        {/* 안내 텍스트 (lineName이 없거나 guidance가 더 구체적인 경우) */}
        {!isWalk && section.guidance && !section.lineName && (
          <p className="text-xs opacity-70 mt-0.5 truncate">{section.guidance}</p>
        )}
        {/* 시간 + 정류장 수 */}
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-xs opacity-70">{mins}분</span>
          {midStops != null && midStops > 0 && (
            <span className="text-xs opacity-60">
              · {midStops}개 {section.mode === 'SUBWAY' || section.mode === 'TRAIN' ? '역' : '정류장'} 경유
            </span>
          )}
          {section.distance > 0 && (
            <span className="text-xs opacity-50">
              · {(section.distance / 1000).toFixed(1)}km
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function TransitLegDetail({ leg }: { leg: TransitLeg }) {
  // 각 section에 색상 인덱스 부여 (비-도보만 카운트)
  type Item =
    | { kind: 'transfer' }
    | { kind: 'section'; section: TransitSection; colorIdx: number }

  const items: Item[] = []
  let colorIdx = 0

  leg.sections.forEach((sec, idx) => {
    const prev = idx > 0 ? leg.sections[idx - 1] : null
    // 비-도보 → 비-도보 전환이면 환승 표시
    if (prev && prev.mode !== 'WALK' && sec.mode !== 'WALK') {
      items.push({ kind: 'transfer' })
    }
    const ci = sec.mode !== 'WALK' ? colorIdx++ : 0
    items.push({ kind: 'section', section: sec, colorIdx: ci })
  })

  return (
    <div className="ml-10 flex flex-col gap-1.5 py-1.5 pr-1">
      {items.map((item, idx) => {
        if (item.kind === 'transfer') {
          return (
            <div key={idx} className="flex items-center gap-1.5 px-3 py-0.5">
              <span className="text-xs font-semibold text-orange-500">🔁 환승</span>
            </div>
          )
        }
        return (
          <TransitSectionRow
            key={idx}
            section={item.section}
            colorIdx={item.colorIdx}
          />
        )
      })}
    </div>
  )
}

// ─── 날짜 배정 편집기 (cross-day DnD) ────────────────────────────────────────

function SortablePlaceChip({
  id,
  name,
  emoji,
  isDragOverlay,
}: {
  id: string
  name: string
  emoji: string
  isDragOverlay?: boolean
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  if (isDragOverlay) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl shadow-lg border border-blue-300 opacity-95">
        <span className="text-base">{emoji}</span>
        <span className="text-sm font-semibold text-gray-900 truncate max-w-[140px]">{name}</span>
      </div>
    )
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-all ${
        isDragging
          ? 'opacity-40 bg-gray-50 border-dashed border-gray-300'
          : 'bg-white border-gray-100 shadow-sm'
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        className="flex-shrink-0 flex flex-col gap-[3px] px-0.5 touch-none cursor-grab active:cursor-grabbing"
        aria-label="드래그"
      >
        <span className="block w-3.5 h-[2px] bg-gray-300 rounded-full" />
        <span className="block w-3.5 h-[2px] bg-gray-300 rounded-full" />
        <span className="block w-3.5 h-[2px] bg-gray-300 rounded-full" />
      </button>
      <span className="text-base flex-shrink-0">{emoji}</span>
      <span className="text-sm font-medium text-gray-800 truncate">{name}</span>
    </div>
  )
}

function DroppableDayZone({
  dayIdx,
  ids,
  placeMap,
  categoryMap,
}: {
  dayIdx: number
  ids: string[]
  placeMap: Map<string, PlaceInput>
  categoryMap: Map<string, string>
}) {
  const containerId = `day-${dayIdx}`
  const { setNodeRef, isOver } = useDroppable({ id: containerId })

  return (
    <SortableContext items={ids} strategy={verticalListSortingStrategy}>
      <div
        ref={setNodeRef}
        className={`min-h-[52px] flex flex-col gap-1.5 p-2 rounded-2xl border-2 transition-colors ${
          isOver ? 'border-blue-400 bg-blue-50' : 'border-transparent bg-gray-50'
        }`}
      >
        {ids.length === 0 ? (
          <div className={`flex items-center justify-center h-12 rounded-xl border-2 border-dashed text-xs ${
            isOver ? 'border-blue-400 text-blue-400' : 'border-gray-200 text-gray-300'
          }`}>
            여기로 드래그해서 옮기기
          </div>
        ) : (
          ids.map(id => {
            const place = placeMap.get(id)
            const emoji = categoryMap.get(id) ?? '📍'
            return (
              <SortablePlaceChip
                key={id}
                id={id}
                name={place?.name ?? id}
                emoji={emoji}
              />
            )
          })
        )}
      </div>
    </SortableContext>
  )
}

interface DayAssignmentEditorProps {
  assignment: string[][]
  placeMap: Map<string, PlaceInput>
  categoryMap: Map<string, string>
  numDays: number
  onSave: (newAssignment: string[][]) => void
  onClose: () => void
}

function DayAssignmentEditor({
  assignment,
  placeMap,
  categoryMap,
  numDays,
  onSave,
  onClose,
}: DayAssignmentEditorProps) {
  const [local, setLocal] = useState<string[][]>(() => {
    // assignment를 numDays 길이로 보정
    const a = assignment.map(ids => [...ids])
    while (a.length < numDays) a.push([])
    return a
  })
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
  )

  // 어떤 날짜 구역에 id가 있는지 찾기
  function findDayIdx(id: string): number {
    return local.findIndex(ids => ids.includes(id))
  }

  function handleDragStart({ active }: DragStartEvent) {
    setActiveId(active.id as string)
  }

  function handleDragOver({ active, over }: DragOverEvent) {
    if (!over) return
    const activeId = active.id as string
    const overId = over.id as string

    const activeDayIdx = findDayIdx(activeId)
    let overDayIdx: number
    if (overId.startsWith('day-')) {
      overDayIdx = parseInt(overId.replace('day-', ''))
    } else {
      overDayIdx = findDayIdx(overId)
    }

    if (activeDayIdx === -1 || overDayIdx === -1) return
    if (activeDayIdx === overDayIdx) return // 같은 날짜 내 이동은 onDragEnd에서

    setLocal(prev => {
      const next = prev.map(ids => [...ids])
      // 원래 날짜에서 제거
      next[activeDayIdx] = next[activeDayIdx].filter(id => id !== activeId)
      // 대상 날짜에 삽입
      if (overId.startsWith('day-')) {
        next[overDayIdx].push(activeId)
      } else {
        const overIdx = next[overDayIdx].indexOf(overId)
        next[overDayIdx].splice(Math.max(0, overIdx), 0, activeId)
      }
      return next
    })
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null)
    if (!over) return
    const activeId = active.id as string
    const overId = over.id as string

    if (overId.startsWith('day-')) return // 컨테이너 위에서 끝난 경우 이미 처리됨

    const activeDayIdx = findDayIdx(activeId)
    const overDayIdx = findDayIdx(overId)

    if (activeDayIdx !== overDayIdx || activeDayIdx === -1) return

    // 같은 날짜 내 재정렬
    setLocal(prev => {
      const next = prev.map(ids => [...ids])
      const oldIdx = next[activeDayIdx].indexOf(activeId)
      const newIdx = next[activeDayIdx].indexOf(overId)
      if (oldIdx !== -1 && newIdx !== -1) {
        next[activeDayIdx] = arrayMove(next[activeDayIdx], oldIdx, newIdx)
      }
      return next
    })
  }

  const activePlace = activeId ? placeMap.get(activeId) : null
  const activeEmoji = activeId ? (categoryMap.get(activeId) ?? '📍') : null

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      {/* 헤더 */}
      <div className="px-5 pt-10 pb-4 flex items-center gap-3 border-b border-gray-100">
        <button
          onClick={onClose}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
        >
          <span className="text-xl text-gray-600">←</span>
        </button>
        <div className="flex-1">
          <h2 className="text-base font-bold text-gray-900">날짜별 장소 편집</h2>
          <p className="text-xs text-gray-400">드래그해서 날짜 간 장소를 이동해요</p>
        </div>
        <button
          onClick={() => onSave(local)}
          className="px-4 py-2 bg-blue-500 text-white text-sm font-bold rounded-xl"
        >
          완료
        </button>
      </div>

      {/* 날짜 섹션 */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <DndContext
          sensors={sensors}
          collisionDetection={pointerWithin}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex flex-col gap-4">
            {local.map((ids, dayIdx) => (
              <div key={dayIdx}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-bold">{dayIdx + 1}</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-800">Day {dayIdx + 1}</p>
                  <span className="text-xs text-gray-400 ml-auto">{ids.length}곳</span>
                </div>
                <DroppableDayZone
                  dayIdx={dayIdx}
                  ids={ids}
                  placeMap={placeMap}
                  categoryMap={categoryMap}
                />
              </div>
            ))}
          </div>

          <DragOverlay dropAnimation={null}>
            {activeId && activePlace && activeEmoji ? (
              <SortablePlaceChip
                id={activeId}
                name={activePlace.name}
                emoji={activeEmoji}
                isDragOverlay
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  )
}

// ─── 메인 페이지 ─────────────────────────────────────────────────────────────

export function RoutePlanPage() {
  const navigate = useNavigate()
  const { tripId } = useParams<{ tripId: string }>()
  const { plan, clearPlan, setTravelMode, setDayAssignment, setStayOverride } = usePlanStore()
  const { getTrip } = useTripStore()
  const [activeDay, setActiveDay] = useState(0)
  const [mapReady, setMapReady] = useState(false)
  const [mapError, setMapError] = useState(false)
  const [transitPlan, setTransitPlan] = useState<RoutePlan | null>(null)
  const [isComputing, setIsComputing] = useState(false)
  const [showEditor, setShowEditor] = useState(false)
  // 체류 시간 슬라이더 로컬 상태 (즉시 반응, store는 onPointerUp에서 업데이트)
  const [localStay, setLocalStay] = useState<Record<string, number>>({})
  // 자동차 모드 실제 도로 경로 캐시 (일자 인덱스 → [lng,lat][] | null)
  const [carRoutePaths, setCarRoutePaths] = useState<Map<number, [number, number][] | null>>(
    () => new Map()
  )


  const trip = tripId ? getTrip(tripId) : undefined
  if (import.meta.env.DEV) {
    console.log('[RoutePlanPage] URL tripId:', tripId, '| trip 찾음:', !!trip)
  }

  // 카카오 SDK 로드
  useEffect(() => {
    if (!HAS_KAKAO_KEY) { setMapError(true); return }
    loadKakaoSdk()
      .then(() => setMapReady(true))
      .catch(() => setMapError(true))
  }, [])

  // 지도에 항상 표시할 전체 숙소 목록 (날짜 무관)
  const allAccommodations = useMemo<AccomConstraint[]>(() => {
    const result = (trip?.accommodations ?? []).map(a => ({
      id: a.id,
      name: a.name,
      lat: a.latitude,
      lng: a.longitude,
      checkIn: a.checkIn,
      checkOut: a.checkOut,
    }))
    console.log('[allAccommodations] trip 존재 여부:', !!trip, '| trip.id:', trip?.id)
    console.log('[allAccommodations] trip?.accommodations:', trip?.accommodations)
    console.log('[allAccommodations] 변환 결과:', result)
    return result
  }, [trip])

  // 날짜 인덱스(0-based) → 해당 날에 적용할 숙소 제약 맵
  const dayAccommodations = useMemo<Map<number, AccomConstraint> | undefined>(() => {
    const accoms = trip?.accommodations
    if (!accoms?.length || !trip?.days?.length) return undefined
    const map = new Map<number, AccomConstraint>()
    trip.days.forEach((tripDay, idx) => {
      // checkOut 당일에도 숙소에서 출발하므로 <= 로 포함.
      // createTrip은 로컬 날짜 기준으로 date를 생성하므로 checkIn/checkOut과 일치해야 함.
      const matched = accoms.find(
        a => a.checkIn <= tripDay.date && tripDay.date <= a.checkOut
      )
      if (import.meta.env.DEV) {
        console.log(
          `[dayAccommodations] day ${idx} (${tripDay.date})`,
          matched
            ? `→ 숙소 매칭: ${matched.name} (${matched.checkIn}~${matched.checkOut})`
            : `→ 매칭 없음 (숙소 checkIn/checkOut: ${accoms.map(a => `${a.checkIn}~${a.checkOut}`).join(', ')})`
        )
      }
      if (matched) {
        map.set(idx, {
          id: matched.id,
          name: matched.name,
          lat: matched.latitude,
          lng: matched.longitude,
          checkIn: matched.checkIn,
          checkOut: matched.checkOut,
        })
      }
    })
    if (import.meta.env.DEV) {
      console.log(`[dayAccommodations] 결과: ${map.size}일에 숙소 배정됨 (전체 ${trip.days.length}일)`)
    }
    return map.size > 0 ? map : undefined
  }, [trip])

  const placeInputs = useMemo(
    () => toPlaceInputs(plan.selectedPlaces, plan.regionId, plan.stayOverrides),
    [plan.selectedPlaces, plan.regionId, plan.stayOverrides]
  )

  // placeInputs가 바뀔 때 localStay에 새 장소만 추가 (기존 값 덮어쓰지 않음)
  useEffect(() => {
    setLocalStay(prev => {
      let hasNew = false
      const update: Record<string, number> = {}
      placeInputs.forEach(p => {
        if (!(p.id in prev)) {
          update[p.id] = p.stayMinutes
          hasNew = true
        }
      })
      return hasNew ? { ...prev, ...update } : prev
    })
  }, [placeInputs])

  const numDays = plan.days + 1 // 박 → 일

  // 날짜 배정 — null이면 즉시 계산 (useMemo로 렌더링과 동기)
  const effectiveAssignment = useMemo<string[][]>(() => {
    if (plan.dayAssignment !== null) return plan.dayAssignment
    if (placeInputs.length === 0) return Array.from({ length: numDays }, () => [])
    return plan.routeMode === 'manual'
      ? computeManualAssignment(placeInputs, numDays)
      : computeAutoAssignment(placeInputs, numDays)
  }, [plan.dayAssignment, placeInputs, numDays, plan.routeMode])

  // 처음 계산한 배정을 스토어에 저장 (다음 렌더 사이클에)
  useEffect(() => {
    if (plan.dayAssignment === null && placeInputs.length > 0) {
      setDayAssignment(effectiveAssignment)
    }
  }, [plan.dayAssignment, placeInputs.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // 자동차 계획 (배정 기반)
  const carPlan = useMemo(
    () => planRouteFromAssignment(
      effectiveAssignment,
      placeInputs,
      numDays,
      dayAccommodations,
      plan.routeMode === 'manual',
    ),
    [effectiveAssignment, placeInputs, numDays, plan.routeMode, dayAccommodations]
  )

  // 대중교통 계획 (배정 기반, 비동기)
  const travelMode = plan.travelMode ?? 'car'
  useEffect(() => {
    if (travelMode !== 'transit' || !HAS_TRANSIT_KEY) return
    let cancelled = false
    setIsComputing(true)
    setTransitPlan(null)
    planRouteTransitFromAssignment(effectiveAssignment, placeInputs, numDays, dayAccommodations)
      .then(result => {
        if (!cancelled) { setTransitPlan(result); setIsComputing(false) }
      })
    return () => { cancelled = true; setIsComputing(false) }
  }, [travelMode, effectiveAssignment, placeInputs, numDays, dayAccommodations]) // eslint-disable-line react-hooks/exhaustive-deps

  const routePlan = travelMode === 'transit' && transitPlan ? transitPlan : carPlan
  const currentDay = useMemo(
    () => routePlan.days[Math.min(activeDay, routePlan.days.length - 1)],
    [routePlan, activeDay],
  )

  // activeDay 범위 보정
  const safeActiveDay = Math.min(activeDay, routePlan.days.length - 1)
  if (safeActiveDay !== activeDay) setActiveDay(safeActiveDay)

  // 편집기용 placeMap, categoryMap
  const editorPlaceMap = useMemo(() => new Map(placeInputs.map(p => [p.id, p])), [placeInputs])
  const editorCategoryMap = useMemo(() =>
    new Map(plan.selectedPlaces.map(p => [p.id, CATEGORY_EMOJI[p.category]])),
    [plan.selectedPlaces]
  )

  // 자동차 모드 실제 도로 경로 fetch (activeDay 변경 또는 routePlan 변경 시)
  useEffect(() => {
    if (travelMode !== 'car' || !HAS_DIRECTIONS_KEY) return
    if (carRoutePaths.has(activeDay)) return   // 이미 캐시됨

    const day = routePlan.days[activeDay]
    if (!day || day.places.length === 0) return

    // 경유 순서: [숙소?, 장소들..., 숙소?]
    const stops: Array<{ lat: number; lng: number }> = []
    if (day.accommodation) stops.push({ lat: day.accommodation.lat, lng: day.accommodation.lng })
    day.places.forEach(p => stops.push({ lat: p.lat, lng: p.lng }))
    if (day.accommodation && day.places.length > 0) {
      stops.push({ lat: day.accommodation.lat, lng: day.accommodation.lng })
    }

    let cancelled = false
    fetchDayCarRoute(stops).then(result => {
      if (!cancelled) {
        setCarRoutePaths(prev => {
          const next = new Map(prev)
          next.set(activeDay, result)
          return next
        })
      }
    })
    return () => { cancelled = true }
  }, [travelMode, activeDay, routePlan]) // eslint-disable-line react-hooks/exhaustive-deps

  // travelMode나 routePlan이 바뀌면 캐시 초기화
  useEffect(() => {
    setCarRoutePaths(new Map())
  }, [travelMode, effectiveAssignment]) // eslint-disable-line react-hooks/exhaustive-deps

  function legKm(idx: number): number {
    const places = currentDay.places
    if (idx >= places.length - 1) return 0
    return haversineDistance(
      { lat: places[idx].lat, lng: places[idx].lng },
      { lat: places[idx + 1].lat, lng: places[idx + 1].lng }
    )
  }

  function transitLegInfo(idx: number): TransitLeg | undefined {
    return getDayTransitLeg(currentDay, idx)
  }

  function handleRestart() {
    clearPlan()
    navigate('/')
  }

  function handleSaveAssignment(newAssignment: string[][]) {
    setDayAssignment(newAssignment)
    setTransitPlan(null) // 재계산 트리거
    setShowEditor(false)
  }

  const isEmpty = plan.selectedPlaces.length === 0

  return (
    <>
      {/* 날짜 배정 편집기 오버레이 */}
      {showEditor && (
        <DayAssignmentEditor
          assignment={effectiveAssignment}
          placeMap={editorPlaceMap}
          categoryMap={editorCategoryMap}
          numDays={numDays}
          onSave={handleSaveAssignment}
          onClose={() => setShowEditor(false)}
        />
      )}

      <div className="flex flex-col h-full bg-white">
        {/* 이동수단 토글 */}
        {HAS_TRANSIT_KEY && (
          <div className="px-5 pt-4 pb-2 flex justify-end">
            <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
              <button
                onClick={() => setTravelMode('car')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  travelMode === 'car'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                🚗 자동차
              </button>
              <button
                onClick={() => setTravelMode('transit')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  travelMode === 'transit'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                🚌 대중교통
              </button>
            </div>
          </div>
        )}

        {/* 대중교통 계산 중 */}
        {isComputing && (
          <div className="mx-5 mb-2 px-4 py-2.5 bg-blue-50 rounded-xl flex items-center gap-2">
            <span className="text-blue-500 text-sm animate-spin">⟳</span>
            <p className="text-xs text-blue-600 font-medium">대중교통 경로 계산 중...</p>
          </div>
        )}

        {isEmpty ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8">
            <span className="text-5xl">🗺️</span>
            <p className="text-sm text-gray-400 text-center">
              선택한 장소가 없어요.<br />이전 화면에서 장소를 추가해주세요.
            </p>
          </div>
        ) : (
          <>
            {/* Day 탭 + 편집 버튼 */}
            <div className="px-5 pb-3 flex items-center gap-2">
              <div className="flex gap-2 overflow-x-auto no-scrollbar flex-1">
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
              {/* 날짜 편집 버튼 */}
              <button
                onClick={() => setShowEditor(true)}
                className="flex-shrink-0 px-3 py-2 bg-gray-100 text-gray-600 text-xs font-semibold rounded-full hover:bg-gray-200 transition-colors"
              >
                📋 편집
              </button>
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
                <KakaoMap
                  key={`${activeDay}-${travelMode}`}
                  dayPlan={currentDay}
                  isReady={mapReady}
                  travelMode={travelMode}
                  allAccommodations={allAccommodations}
                  carRoutePoints={travelMode === 'car' ? carRoutePaths.get(activeDay) : undefined}
                />
              </div>
            )}

            {/* 일자 요약 */}
            <div className="flex-1 overflow-y-auto px-5 pb-6">
              {currentDay.places.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2 text-gray-300">
                  <span className="text-3xl">📭</span>
                  <p className="text-sm">이 날은 장소가 없어요</p>
                  <button
                    onClick={() => setShowEditor(true)}
                    className="mt-2 px-4 py-2 bg-blue-50 text-blue-500 text-xs font-semibold rounded-full"
                  >
                    📋 날짜 편집하기
                  </button>
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
                      const isLast = idx === currentDay.places.length - 1
                      const leg = travelMode === 'transit' ? transitLegInfo(idx) : undefined
                      const km = legKm(idx)
                      const travelMins = leg
                        ? Math.round(leg.durationSecs / 60)
                        : Math.round((km / 30) * 60)
                      const stayVal = localStay[place.id] ?? place.stayMinutes

                      return (
                        <div key={place.id}>
                          {/* 장소 카드 */}
                          <div className="flex items-start gap-3 py-3">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5 ${isLast ? 'bg-orange-400' : 'bg-blue-500'}`}>
                              {idx + 1}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm">{CATEGORY_EMOJI[plan.selectedPlaces.find(p => p.id === place.id)?.category ?? 'attraction']}</span>
                                <p className="text-sm font-semibold text-gray-900">{place.name}</p>
                              </div>
                              {/* 체류 시간 슬라이더 */}
                              <div className="mt-2">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs text-gray-400">체류 시간</span>
                                  <span className="text-xs font-semibold text-blue-600">
                                    {formatMinutes(stayVal)}
                                  </span>
                                </div>
                                <input
                                  type="range"
                                  min={30}
                                  max={240}
                                  step={10}
                                  value={stayVal}
                                  onChange={e => {
                                    const val = parseInt(e.target.value)
                                    setLocalStay(prev => ({ ...prev, [place.id]: val }))
                                  }}
                                  onPointerUp={e => {
                                    const val = parseInt((e.target as HTMLInputElement).value)
                                    setStayOverride(place.id, val)
                                  }}
                                  className="w-full accent-blue-500"
                                  style={{ height: '20px' }}
                                />
                                <div className="flex justify-between text-[10px] text-gray-300 mt-0.5">
                                  <span>30분</span>
                                  <span>4시간</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* 장소 간 이동 구간 (마지막 아닐 때) */}
                          {!isLast && (
                            travelMode === 'transit' && leg && leg.sections.length > 0 ? (
                              <div className="mb-1">
                                {leg.fare > 0 ? (
                                  <div className="flex items-center gap-2 ml-10 mb-1">
                                    <div className="w-px h-4 bg-blue-200 -ml-3.5" />
                                    <span className="text-xs text-gray-400">
                                      약 {travelMins}분 · {leg.fare.toLocaleString()}원
                                    </span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 ml-10 mb-1">
                                    <div className="w-px h-4 bg-blue-200 -ml-3.5" />
                                    <span className="text-xs text-gray-400">약 {travelMins}분</span>
                                  </div>
                                )}
                                <TransitLegDetail leg={leg} />
                              </div>
                            ) : (
                              <div className="flex items-center gap-3 pl-3.5 py-1">
                                <div className="w-[1px] h-6 bg-blue-200 ml-3" />
                                <span className="text-xs text-gray-400">
                                  이동 {km.toFixed(1)}km · 약 {travelMins}분
                                </span>
                              </div>
                            )
                          )}

                          {/* 마지막 장소 → 숙소 귀환 구간 */}
                          {isLast && currentDay.accommodation && (() => {
                            const accom = currentDay.accommodation!
                            const returnLeg = travelMode === 'transit'
                              ? transitLegInfo(idx)   // pN → accom leg
                              : undefined
                            const returnMins = returnLeg
                              ? Math.round(returnLeg.durationSecs / 60)
                              : (() => {
                                  const d = haversineDistance(
                                    { lat: place.lat, lng: place.lng },
                                    { lat: accom.lat, lng: accom.lng },
                                  )
                                  return Math.round((d / 30) * 60)
                                })()
                            const returnKm = haversineDistance(
                              { lat: place.lat, lng: place.lng },
                              { lat: accom.lat, lng: accom.lng },
                            )

                            return (
                              <div className="mb-2">
                                {/* 구분선 + 소요 시간 */}
                                {travelMode === 'transit' && returnLeg && returnLeg.sections.length > 0 ? (
                                  <div className="mb-1">
                                    {returnLeg.fare > 0 ? (
                                      <div className="flex items-center gap-2 ml-10 mb-1">
                                        <div className="w-px h-4 bg-green-200 -ml-3.5" />
                                        <span className="text-xs text-gray-400">
                                          약 {returnMins}분 · {returnLeg.fare.toLocaleString()}원
                                        </span>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-2 ml-10 mb-1">
                                        <div className="w-px h-4 bg-green-200 -ml-3.5" />
                                        <span className="text-xs text-gray-400">약 {returnMins}분</span>
                                      </div>
                                    )}
                                    <TransitLegDetail leg={returnLeg} />
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-3 pl-3.5 py-1">
                                    <div className="w-[1px] h-6 bg-green-200 ml-3" />
                                    <span className="text-xs text-gray-400">
                                      귀환 {returnKm.toFixed(1)}km · 약 {returnMins}분
                                    </span>
                                  </div>
                                )}
                                {/* 숙소 도착 표시 */}
                                <div className="flex items-center gap-3 py-2.5 pl-0.5">
                                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm bg-emerald-100 flex-shrink-0">
                                    🏠
                                  </div>
                                  <div>
                                    <p className="text-xs font-semibold text-emerald-700">{accom.name}</p>
                                    <p className="text-[10px] text-gray-400">숙소 도착</p>
                                  </div>
                                </div>
                              </div>
                            )
                          })()}
                        </div>
                      )
                    })}
                  </div>

                  {/* 하루 활동 시간 요약 */}
                  {(() => {
                    const origStay = currentDay.places.reduce((s, p) => s + p.stayMinutes, 0)
                    const travelMins = currentDay.totalMinutes - origStay
                    const adjStay = currentDay.places.reduce(
                      (s, p) => s + (localStay[p.id] ?? p.stayMinutes), 0
                    )
                    const adjTotal = travelMins + adjStay
                    const totalTransfers = travelMode === 'transit'
                      ? (currentDay.transitLegs?.reduce((s, leg) => s + (leg?.transferCount ?? 0), 0) ?? 0)
                      : undefined
                    const badge = calcAdjustedIntensity(adjTotal, totalTransfers)

                    return (
                      <div className="mt-4 p-4 bg-gray-50 rounded-2xl">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-gray-700">총 활동 시간</span>
                          <div className="flex items-center gap-2">
                            <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${badge.bg} ${badge.text}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                              {badge.label}
                            </span>
                            <span className="text-sm font-bold text-gray-900">{formatMinutes(adjTotal)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1.5 text-xs text-gray-400">
                          <span>이동 {formatMinutes(travelMins)}</span>
                          <span className="text-gray-300">+</span>
                          <span>체류 {formatMinutes(adjStay)}</span>
                        </div>
                      </div>
                    )
                  })()}
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
    </>
  )
}
