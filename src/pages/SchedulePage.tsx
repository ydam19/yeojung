import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useTripStore } from '../store/useTripStore'
import { TopBar } from '../components/layout/TopBar'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { getDayLabel, formatDate } from '../utils/dateUtils'
import { PLACE_CATEGORY_LABELS, PLACE_CATEGORY_EMOJI } from '../types'
import type { PlaceCategory, Place, LatLng } from '../types'
import { naverMapSearchUrl } from '../utils/naverMaps'

const CATEGORIES = Object.keys(PLACE_CATEGORY_LABELS) as PlaceCategory[]

interface PlaceFormData {
  name: string
  address: string
  category: PlaceCategory
  startTime: string
  endTime: string
  notes: string
  lat: string
  lng: string
}

const DEFAULT_FORM: PlaceFormData = {
  name: '', address: '', category: 'attraction',
  startTime: '', endTime: '', notes: '', lat: '', lng: '',
}

export function SchedulePage() {
  const { tripId } = useParams<{ tripId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { getTrip, addPlace, reorderPlaces } = useTripStore()

  const trip = getTrip(tripId!)
  const [selectedDay, setSelectedDay] = useState(Number(searchParams.get('day') ?? 0))
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<PlaceFormData>(DEFAULT_FORM)
  const [dragOver, setDragOver] = useState<number | null>(null)
  const [dragging, setDragging] = useState<number | null>(null)

  if (!trip) { navigate('/'); return null }

  const day = trip.days[selectedDay]

  function handleAdd() {
    if (!form.name.trim()) return
    const coords: LatLng | undefined =
      form.lat && form.lng ? { lat: parseFloat(form.lat), lng: parseFloat(form.lng) } : undefined
    addPlace(tripId!, selectedDay, {
      name: form.name.trim(),
      address: form.address.trim() || undefined,
      category: form.category,
      startTime: form.startTime || undefined,
      endTime: form.endTime || undefined,
      notes: form.notes.trim() || undefined,
      coordinates: coords,
    })
    setForm(DEFAULT_FORM)
    setModalOpen(false)
  }

  function handleDragStart(index: number) { setDragging(index) }
  function handleDragEnter(index: number) { setDragOver(index) }
  function handleDrop() {
    if (dragging === null || dragOver === null || dragging === dragOver) {
      setDragging(null); setDragOver(null); return
    }
    const newPlaces = [...day.places]
    const [moved] = newPlaces.splice(dragging, 1)
    newPlaces.splice(dragOver, 0, moved)
    reorderPlaces(tripId!, selectedDay, newPlaces)
    setDragging(null); setDragOver(null)
  }

  return (
    <div className="flex flex-col min-h-full">
      <TopBar title="일정 관리" />

      {/* 날짜 탭 */}
      <div className="bg-white border-b border-gray-100 overflow-x-auto">
        <div className="flex px-4 py-2 gap-2 min-w-max">
          {trip.days.map((d, i) => (
            <button
              key={d.date}
              onClick={() => setSelectedDay(i)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                i === selectedDay ? 'bg-[#3182F6] text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {getDayLabel(i)} · {formatDate(d.date).slice(6)}
            </button>
          ))}
        </div>
      </div>

      {/* 장소 리스트 */}
      <div className="flex-1 overflow-y-auto p-4">
        {day.places.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">장소를 추가해보세요</div>
        ) : (
          <div className="flex flex-col gap-2">
            {day.places.map((place: Place, i: number) => (
              <div
                key={place.id}
                draggable
                onDragStart={() => handleDragStart(i)}
                onDragEnter={() => handleDragEnter(i)}
                onDragEnd={handleDrop}
                onDragOver={e => e.preventDefault()}
                className={`bg-white rounded-xl p-4 flex items-center gap-3 border transition-all cursor-grab active:cursor-grabbing ${
                  dragOver === i ? 'border-[#3182F6] shadow-md' : 'border-gray-100'
                }`}
              >
                <span className="text-gray-300 text-lg select-none">⠿</span>
                <div className="w-7 h-7 rounded-full bg-[#3182F6] text-white text-xs font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span>{PLACE_CATEGORY_EMOJI[place.category]}</span>
                    <span className="font-semibold text-sm text-gray-900 truncate">{place.name}</span>
                  </div>
                  {place.startTime && (
                    <p className="text-xs text-gray-400">{place.startTime}{place.endTime && ` ~ ${place.endTime}`}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 장소 추가 버튼 */}
      <div className="p-4 border-t border-gray-100">
        <Button fullWidth onClick={() => setModalOpen(true)}>+ 장소 추가</Button>
      </div>

      {/* 장소 추가 모달 */}
      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setForm(DEFAULT_FORM) }} title="장소 추가">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <Input
              label="장소 이름 *"
              placeholder="경복궁"
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            />
            {form.name.trim() && (
              <a
                href={naverMapSearchUrl(form.name)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[#3182F6] flex items-center gap-1 hover:underline"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M6 1C3.24 1 1 3.24 1 6s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zm.5 7.5h-1v-3h1v3zm0-4h-1V3.5h1V4.5z" fill="currentColor"/>
                </svg>
                네이버 지도에서 &quot;{form.name}&quot; 검색하기 →
              </a>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">카테고리</label>
            <div className="grid grid-cols-4 gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setForm(p => ({ ...p, category: cat }))}
                  className={`py-2 rounded-xl text-xs font-medium flex flex-col items-center gap-1 transition-colors ${
                    form.category === cat ? 'bg-[#3182F6] text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  <span className="text-lg">{PLACE_CATEGORY_EMOJI[cat]}</span>
                  {PLACE_CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label="시작 시간" type="time" value={form.startTime} onChange={e => setForm(p => ({ ...p, startTime: e.target.value }))} />
            <Input label="종료 시간" type="time" value={form.endTime} onChange={e => setForm(p => ({ ...p, endTime: e.target.value }))} />
          </div>

          <Input label="주소" placeholder="서울 종로구 사직로 161" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} />

          <div className="flex flex-col gap-1">
            <div className="grid grid-cols-2 gap-3">
              <Input label="위도" placeholder="37.5796" type="number" step="any" value={form.lat} onChange={e => setForm(p => ({ ...p, lat: e.target.value }))} />
              <Input label="경도" placeholder="126.9770" type="number" step="any" value={form.lng} onChange={e => setForm(p => ({ ...p, lng: e.target.value }))} />
            </div>
            <p className="text-xs text-gray-400">
              💡 네이버 지도에서 장소 우클릭 → &quot;이 곳의 주소&quot; → 좌표 복사
            </p>
          </div>

          <Input label="메모" placeholder="입장 시간은 10시~18시" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />

          <Button fullWidth size="lg" onClick={handleAdd} disabled={!form.name.trim()}>추가하기</Button>
        </div>
      </Modal>
    </div>
  )
}
