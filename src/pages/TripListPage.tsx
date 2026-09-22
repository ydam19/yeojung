import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { v4 as uuid } from 'uuid'
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
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { usePlanStore } from '../store/usePlanStore'
import { computeAutoAssignment, computeManualAssignment } from '../utils/routePlanner'
import { CATEGORY_EMOJI, DEFAULT_STAY_MINUTES, REGION_CENTERS } from '../data/places'
import type { PlaceItem } from '../data/places'
import type { RouteMode } from '../store/usePlanStore'
import type { PlaceInput } from '../utils/routePlanner'

// ─── PlaceItem → PlaceInput ───────────────────────────────────────────────────

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

// ─── 드래그 가능한 장소 카드 ──────────────────────────────────────────────────

function SortablePlace({
  place,
  dayIndex,
  indexInDay,
  onRemove,
  isDragOverlay,
}: {
  place: PlaceItem
  dayIndex: number
  indexInDay: number
  onRemove?: () => void
  isDragOverlay?: boolean
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: place.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const content = (
    <div className={`flex items-center gap-3 px-3 py-3.5 bg-gray-50 rounded-2xl transition-shadow ${
      isDragging ? 'shadow-lg opacity-50 z-50' : isDragOverlay ? 'shadow-xl opacity-95' : ''
    }`}>
      {/* 드래그 핸들 */}
      {!isDragOverlay && (
        <button
          {...attributes}
          {...listeners}
          className="flex-shrink-0 flex flex-col gap-[3px] px-1 py-1 touch-none cursor-grab active:cursor-grabbing"
          aria-label="순서 변경"
        >
          <span className="block w-4 h-[2px] bg-gray-300 rounded-full" />
          <span className="block w-4 h-[2px] bg-gray-300 rounded-full" />
          <span className="block w-4 h-[2px] bg-gray-300 rounded-full" />
        </button>
      )}
      {isDragOverlay && <div className="w-4 flex-shrink-0" />}

      {/* 순서 번호 */}
      <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
        <span className="text-white text-xs font-bold">{indexInDay + 1}</span>
      </div>

      {/* 날짜 배지 (overlay에서 어느 날짜인지 표시) */}
      {isDragOverlay && (
        <div className="px-1.5 py-0.5 bg-blue-100 rounded-md flex-shrink-0">
          <span className="text-blue-600 text-xs font-bold">Day {dayIndex + 1}</span>
        </div>
      )}

      {/* 카테고리 이모지 */}
      <span className="text-lg flex-shrink-0">{CATEGORY_EMOJI[place.category]}</span>

      {/* 장소 정보 */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{place.name}</p>
        {place.tags[0] === '직접추가' ? (
          <p className="text-xs text-blue-400 mt-0.5">직접 추가</p>
        ) : (
          <p className="text-xs text-gray-400 mt-0.5 truncate">#{place.tags.join(' #')}</p>
        )}
      </div>

      {/* 삭제 버튼 */}
      {onRemove && (
        <button
          onClick={onRemove}
          className="w-7 h-7 flex items-center justify-center rounded-full text-gray-300 hover:bg-red-50 hover:text-red-400 transition-colors flex-shrink-0"
          aria-label={`${place.name} 제거`}
        >
          ✕
        </button>
      )}
    </div>
  )

  if (isDragOverlay) return content

  return (
    <div ref={setNodeRef} style={style}>
      {content}
    </div>
  )
}

// ─── 메인 페이지 ─────────────────────────────────────────────────────────────

export function TripListPage() {
  const navigate = useNavigate()
  const { plan, togglePlace, setRouteMode, setDayAssignment } = usePlanStore()
  const { days, selectedPlaces, routeMode, regionId } = plan
  const numDays = days + 1

  // PlaceInput 변환 (좌표 필요)
  const placeInputs = useMemo(
    () => toPlaceInputs(selectedPlaces, regionId),
    [selectedPlaces, regionId]
  )

  // 유효한 날짜 배정 계산 (store에 없으면 즉시 계산)
  const effectiveAssignment = useMemo<string[][]>(() => {
    if (plan.dayAssignment !== null) return plan.dayAssignment
    if (placeInputs.length === 0) return Array.from({ length: numDays }, () => [])
    return routeMode === 'manual'
      ? computeManualAssignment(placeInputs, numDays)
      : computeAutoAssignment(placeInputs, numDays)
  }, [plan.dayAssignment, placeInputs, numDays, routeMode])

  // effectiveAssignment를 로컬 상태로 유지 (드래그 중 상태 관리)
  const [localAssignment, setLocalAssignment] = useState<string[][]>(effectiveAssignment)

  // store의 배정이 바뀌면 로컬 상태도 동기화
  useEffect(() => {
    setLocalAssignment(effectiveAssignment)
  }, [effectiveAssignment])

  // 처음 로드 시 배정 초기값 저장
  useEffect(() => {
    if (plan.dayAssignment === null && placeInputs.length > 0) {
      setDayAssignment(effectiveAssignment)
    }
  }, [plan.dayAssignment, placeInputs.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // 드래그 중인 아이템 ID
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
  )

  // placeMap: id → PlaceItem
  const placeMap = useMemo(
    () => new Map(selectedPlaces.map(p => [p.id, p])),
    [selectedPlaces]
  )

  // 어느 날짜에 있는지 찾기
  function findDayIdx(id: string): number {
    return localAssignment.findIndex(ids => ids.includes(id))
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
    if (activeDayIdx === overDayIdx) return // 같은 날짜 내 이동 → onDragEnd 에서

    setLocalAssignment(prev => {
      const next = prev.map(ids => [...ids])
      next[activeDayIdx] = next[activeDayIdx].filter(id => id !== activeId)
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

    if (!over) {
      // 드롭 취소 → store에 현재 localAssignment 저장
      setDayAssignment(localAssignment)
      return
    }

    const activeId = active.id as string
    const overId = over.id as string

    if (!overId.startsWith('day-')) {
      const activeDayIdx = findDayIdx(activeId)
      const overDayIdx = findDayIdx(overId)

      if (activeDayIdx === overDayIdx && activeDayIdx !== -1) {
        // 같은 날짜 내 재정렬
        const updated = localAssignment.map((ids, i) => {
          if (i !== activeDayIdx) return ids
          const oldIdx = ids.indexOf(activeId)
          const newIdx = ids.indexOf(overId)
          if (oldIdx === -1 || newIdx === -1) return ids
          return arrayMove(ids, oldIdx, newIdx)
        })
        setLocalAssignment(updated)
        setDayAssignment(updated)
        return
      }
    }

    // 날짜 간 이동은 이미 onDragOver에서 처리 → 저장만
    setDayAssignment(localAssignment)
  }

  function handleRemovePlace(place: PlaceItem) {
    // dayAssignment에서 제거 (togglePlace가 스마트하게 처리)
    togglePlace(place)
  }

  function handleStartRoute() {
    setDayAssignment(localAssignment)
    const tripId = plan.tripId || uuid()
    navigate(`/trips/${tripId}/result`)
  }

  const isEmpty = selectedPlaces.length === 0

  // activeId에 해당하는 장소 & 날짜 인덱스
  const activePlace = activeId ? placeMap.get(activeId) : null
  const activeDayIdx = activeId ? findDayIdx(activeId) : -1
  const activeIndexInDay = activeId && activeDayIdx !== -1
    ? localAssignment[activeDayIdx].indexOf(activeId)
    : 0

  const MODES: { value: RouteMode; label: string; desc: string }[] = [
    { value: 'auto',   label: '🤖 자동 최적화',   desc: 'AI가 이동거리 최소로 동선을 짜줘요' },
    { value: 'manual', label: '✋ 내 순서대로',    desc: '내가 정한 순서 그대로 일정을 짜요' },
  ]

  return (
    <div className="flex flex-col h-full bg-white">
      {/* 장소 목록 */}
      <div className="flex-1 overflow-y-auto px-5">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 pb-20">
            <span className="text-5xl">🗺️</span>
            <p className="text-gray-400 text-sm text-center">
              아직 추가한 장소가 없어요.<br />이전 화면에서 장소를 선택해주세요.
            </p>
          </div>
        ) : (
          <div className="pb-4">
            <p className="text-xs text-gray-400 mb-3">
              총 <span className="text-blue-500 font-semibold">{selectedPlaces.length}개</span> 장소 ·
              날짜 칸 사이로 드래그해서 날짜를 바꿀 수 있어요
            </p>

            <DndContext
              sensors={sensors}
              collisionDetection={pointerWithin}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
            >
              <div className="flex flex-col gap-5">
                {localAssignment.map((ids, dayIdx) => (
                  <div key={dayIdx}>
                    {/* 날짜 헤더 */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs font-bold">{dayIdx + 1}</span>
                      </div>
                      <p className="text-sm font-bold text-gray-800">Day {dayIdx + 1}</p>
                      <span className="text-xs text-gray-400">
                        {ids.length > 0 ? `${ids.length}곳` : '장소 없음'}
                      </span>
                    </div>

                    {/* 날짜 내 장소 목록 + 드롭 존 */}
                    <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                      <DroppableDayZoneWrapper
                        dayIdx={dayIdx}
                        ids={ids}
                        placeMap={placeMap}
                        onRemove={handleRemovePlace}
                      />
                    </SortableContext>
                  </div>
                ))}
              </div>

              {/* 드래그 오버레이 */}
              <DragOverlay dropAnimation={null}>
                {activePlace ? (
                  <SortablePlace
                    place={activePlace}
                    dayIndex={activeDayIdx}
                    indexInDay={activeIndexInDay}
                    isDragOverlay
                  />
                ) : null}
              </DragOverlay>
            </DndContext>
          </div>
        )}
      </div>

      {/* 하단 */}
      {!isEmpty && (
        <div className="px-5 pt-3 pb-5 border-t border-gray-100 space-y-3">
          {/* 동선 모드 토글 */}
          <div>
            <p className="text-xs text-gray-500 font-medium mb-2">동선 짜기 방식</p>
            <div className="flex gap-2">
              {MODES.map(m => (
                <button
                  key={m.value}
                  onClick={() => {
                    setRouteMode(m.value)
                    // 모드 변경 시 배정 초기화 (새 모드로 재계산)
                    setDayAssignment(null)
                  }}
                  className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold border-2 transition-all text-left ${
                    routeMode === m.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-100 bg-gray-50 text-gray-500'
                  }`}
                >
                  <p>{m.label}</p>
                  <p className={`mt-0.5 font-normal leading-tight ${routeMode === m.value ? 'text-blue-400' : 'text-gray-400'}`}>
                    {m.desc}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* 숙소 등록/관리 */}
          {plan.tripId && (
            <button
              onClick={() => navigate(`/trips/${plan.tripId}/accommodations`)}
              className="w-full py-3 rounded-2xl text-sm font-semibold border-2 border-green-200 text-green-700 bg-green-50 hover:bg-green-100 active:scale-95 transition-all"
            >
              🏨 숙소 등록/관리
            </button>
          )}

          <button
            onClick={handleStartRoute}
            className="w-full py-4 rounded-2xl text-base font-bold bg-blue-500 text-white active:scale-95 transition-transform"
          >
            🗺️ 동선 짜기
          </button>
        </div>
      )}
    </div>
  )
}

// ─── 날짜 드롭 존 래퍼 (장소 카드 + 드롭 영역 통합) ─────────────────────────

function DroppableDayZoneWrapper({
  dayIdx,
  ids,
  placeMap,
  onRemove,
}: {
  dayIdx: number
  ids: string[]
  placeMap: Map<string, PlaceItem>
  onRemove: (place: PlaceItem) => void
}) {
  const containerId = `day-${dayIdx}`
  const { setNodeRef, isOver } = useDroppable({ id: containerId })

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col gap-2 p-2 rounded-2xl border-2 transition-colors ${
        isOver ? 'border-blue-300 bg-blue-50' : 'border-transparent'
      }`}
      style={{ minHeight: '52px' }}
    >
      {ids.length === 0 ? (
        <div className={`flex items-center justify-center h-14 rounded-xl border-2 border-dashed text-xs ${
          isOver ? 'border-blue-400 text-blue-400' : 'border-gray-200 text-gray-300'
        }`}>
          여기로 드래그해서 추가
        </div>
      ) : (
        ids.map((id, idxInDay) => {
          const place = placeMap.get(id)
          if (!place) return null
          return (
            <SortablePlace
              key={id}
              place={place}
              dayIndex={dayIdx}
              indexInDay={idxInDay}
              onRemove={() => onRemove(place)}
            />
          )
        })
      )}
    </div>
  )
}
