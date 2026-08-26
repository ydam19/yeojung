import { useNavigate } from 'react-router-dom'
import { v4 as uuid } from 'uuid'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
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
import { CATEGORY_EMOJI } from '../data/places'
import type { PlaceItem } from '../data/places'
import type { RouteMode } from '../store/usePlanStore'

// ─── 드래그 가능한 장소 아이템 ───────────────────────────────────────────────

function SortablePlace({
  place,
  index,
  onRemove,
}: {
  place: PlaceItem
  index: number
  onRemove: () => void
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 px-3 py-3.5 bg-gray-50 rounded-2xl transition-shadow ${
        isDragging ? 'shadow-lg opacity-80 z-50' : ''
      }`}
    >
      {/* 드래그 핸들 */}
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

      {/* 순서 번호 */}
      <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
        <span className="text-white text-xs font-bold">{index + 1}</span>
      </div>

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
      <button
        onClick={onRemove}
        className="w-7 h-7 flex items-center justify-center rounded-full text-gray-300 hover:bg-red-50 hover:text-red-400 transition-colors flex-shrink-0"
        aria-label={`${place.name} 제거`}
      >
        ✕
      </button>
    </div>
  )
}

// ─── 메인 페이지 ─────────────────────────────────────────────────────────────

export function TripListPage() {
  const navigate = useNavigate()
  const { plan, togglePlace, reorderPlaces, setRouteMode } = usePlanStore()
  const { regionName, days, selectedPlaces, routeMode } = plan

  // 터치(모바일) + 포인터(데스크톱) 센서
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 6 },
    })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = selectedPlaces.findIndex(p => p.id === active.id)
    const newIdx = selectedPlaces.findIndex(p => p.id === over.id)
    reorderPlaces(arrayMove(selectedPlaces, oldIdx, newIdx))
  }

  function handleStartRoute() {
    const tripId = uuid()
    navigate(`/trips/${tripId}/result`)
  }

  const isEmpty = selectedPlaces.length === 0

  const MODES: { value: RouteMode; label: string; desc: string }[] = [
    { value: 'auto',   label: '🤖 자동 최적화',   desc: 'AI가 이동거리 최소로 동선을 짜줘요' },
    { value: 'manual', label: '✋ 내 순서대로',    desc: '내가 정한 순서 그대로 일정을 짜요' },
  ]

  return (
    <div className="flex flex-col h-full bg-white">
      {/* 헤더 */}
      <div className="px-5 pt-10 pb-4 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
        >
          <span className="text-xl text-gray-600">←</span>
        </button>
        <div>
          <h1 className="text-lg font-bold text-gray-900">내 여행 리스트</h1>
          {regionName && (
            <p className="text-xs text-gray-400">
              {regionName} · {days === 0 ? '당일치기' : `${days}박${days + 1}일`}
            </p>
          )}
        </div>
      </div>

      {/* 장소 목록 */}
      <div className="flex-1 overflow-y-auto px-5">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 pb-20">
            <span className="text-5xl">🗺️</span>
            <p className="text-gray-400 text-sm text-center">
              아직 추가한 장소가 없어요.<br />이전 화면에서 장소를 선택해주세요.
            </p>
            <button
              onClick={() => navigate(-1)}
              className="px-5 py-2.5 bg-blue-50 text-blue-500 text-sm font-semibold rounded-full"
            >
              장소 선택하러 가기
            </button>
          </div>
        ) : (
          <div className="pb-4">
            {/* 요약 */}
            <p className="text-xs text-gray-400 mb-3">
              총 <span className="text-blue-500 font-semibold">{selectedPlaces.length}개</span> 장소 ·
              드래그해서 순서를 바꿔보세요
            </p>

            {/* 드래그 가능한 리스트 */}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={selectedPlaces.map(p => p.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="flex flex-col gap-2">
                  {selectedPlaces.map((place, idx) => (
                    <SortablePlace
                      key={place.id}
                      place={place}
                      index={idx}
                      onRemove={() => togglePlace(place)}
                    />
                  ))}
                </div>
              </SortableContext>
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
                  onClick={() => setRouteMode(m.value)}
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

          <button
            onClick={handleStartRoute}
            className="w-full py-4 rounded-2xl text-base font-bold bg-blue-500 text-white active:scale-95 transition-transform"
          >
            🗺️ 동선 짜기
          </button>
          <button
            onClick={() => navigate(-1)}
            className="w-full py-2 text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            장소 더 추가하기
          </button>
        </div>
      )}
    </div>
  )
}
