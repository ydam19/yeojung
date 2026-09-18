import { useState, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTripStore } from '../store/useTripStore'
import { searchKeyword, HAS_LOCAL_KEY } from '../utils/kakaoLocalSearch'
import type { LocalSearchResult } from '../utils/kakaoLocalSearch'
import { TopBar } from '../components/layout/TopBar'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { formatDateShort } from '../utils/dateUtils'
import type { Accommodation } from '../types'
import { differenceInDays, parseISO } from 'date-fns'

interface AccomFormData {
  name: string
  address: string
  /** 위도 (latitude) — 문자열. 저장 시 parseFloat 변환 */
  lat: string
  /** 경도 (longitude) — 문자열. 저장 시 parseFloat 변환 */
  lng: string
  checkIn: string
  checkOut: string
  pricePerNight: string
}

const DEFAULT_FORM: AccomFormData = {
  name: '', address: '', lat: '', lng: '',
  checkIn: '', checkOut: '', pricePerNight: '',
}

export function AccommodationPage() {
  const { tripId } = useParams<{ tripId: string }>()
  const navigate = useNavigate()
  const { getTrip, addAccommodation, updateAccommodation, deleteAccommodation } = useTripStore()

  // ── 모든 hooks는 조건부 return 전에 선언 ──────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<AccomFormData>(DEFAULT_FORM)
  const [formError, setFormError] = useState('')
  // REST API 기반 — SDK 로드 불필요
  const kakaoReady = HAS_LOCAL_KEY
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<LocalSearchResult[]>([])
  const [locationSelected, setLocationSelected] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // ── 가드 ─────────────────────────────────────────────────────────────────
  const trip = getTrip(tripId!)
  if (!trip) { navigate('/'); return null }

  // 이 아래는 trip이 반드시 존재하는 컨텍스트.
  // 클로저 안에서는 TypeScript가 타입 좁힘을 보장하지 않으므로 trip! 사용.
  const accommodations = (trip.accommodations ?? []).slice().sort(
    (a, b) => a.checkIn.localeCompare(b.checkIn)
  )

  function openAddModal() {
    setEditingId(null)
    setForm({ ...DEFAULT_FORM, checkIn: trip!.startDate, checkOut: trip!.endDate })
    setFormError('')
    setSearchQuery('')
    setSearchResults([])
    setLocationSelected(false)
    setModalOpen(true)
  }

  function openEditModal(accom: Accommodation) {
    setEditingId(accom.id)
    setForm({
      name: accom.name,
      address: accom.address ?? '',
      lat: String(accom.latitude),
      lng: String(accom.longitude),
      checkIn: accom.checkIn,
      checkOut: accom.checkOut,
      pricePerNight: accom.pricePerNight > 0 ? String(accom.pricePerNight) : '',
    })
    setFormError('')
    setSearchQuery('')
    setSearchResults([])
    setLocationSelected(true)
    setModalOpen(true)
  }

  async function handleKakaoSearch() {
    if (!kakaoReady || !searchQuery.trim()) return
    setSearching(true)
    setSearchResults([])
    const results = await searchKeyword(searchQuery, { size: 10 })
    setSearching(false)
    setSearchResults(results)
  }

  function handleSelectLocation(result: LocalSearchResult) {
    // result.x = 경도(longitude), result.y = 위도(latitude) — Kakao API 규칙
    setForm(prev => ({
      ...prev,
      name: result.place_name,
      address: result.road_address_name || result.address_name,
      lat: String(Number(result.y)),  // 위도(latitude) — Number()로 파싱 후 문자열 저장
      lng: String(Number(result.x)),  // 경도(longitude)
    }))
    setLocationSelected(true)
    setSearchResults([])
    setSearchQuery('')
  }

  function validate(): boolean {
    if (!form.name.trim()) { setFormError('숙소 이름을 입력해주세요.'); return false }
    if (!form.checkIn) { setFormError('체크인 날짜를 선택해주세요.'); return false }
    if (!form.checkOut) { setFormError('체크아웃 날짜를 선택해주세요.'); return false }
    if (form.checkIn >= form.checkOut) { setFormError('체크아웃은 체크인보다 늦어야 해요.'); return false }
    setFormError('')
    return true
  }

  function handleSave() {
    if (!validate()) return

    const payload = {
      name: form.name.trim(),
      address: form.address.trim() || undefined,
      latitude: form.lat ? parseFloat(form.lat) : 0,
      longitude: form.lng ? parseFloat(form.lng) : 0,
      checkIn: form.checkIn,
      checkOut: form.checkOut,
      pricePerNight: form.pricePerNight ? parseInt(form.pricePerNight, 10) : 0,
    }

    if (editingId) {
      updateAccommodation(tripId!, editingId, payload)
    } else {
      addAccommodation(tripId!, payload)
    }

    setModalOpen(false)
  }

  function handleDelete(id: string) {
    if (confirm('이 숙소를 삭제할까요?')) {
      deleteAccommodation(tripId!, id)
    }
  }

  function nightCount(checkIn: string, checkOut: string): number {
    return differenceInDays(parseISO(checkOut), parseISO(checkIn))
  }

  function totalPrice(accom: Accommodation): number {
    return accom.pricePerNight * nightCount(accom.checkIn, accom.checkOut)
  }

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      <TopBar title="숙소 관리" />

      <div className="flex-1 overflow-y-auto p-4">
        {accommodations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-5xl mb-4">🏨</div>
            <p className="text-gray-500 text-sm font-medium">등록된 숙소가 없어요</p>
            <p className="text-gray-400 text-xs mt-1">숙소를 추가하면 동선에 자동으로 반영돼요</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {accommodations.map(accom => {
              const nights = nightCount(accom.checkIn, accom.checkOut)
              const total = totalPrice(accom)
              return (
                <div key={accom.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xl shrink-0">🏨</span>
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 text-sm truncate">{accom.name}</p>
                        {accom.address && (
                          <p className="text-xs text-gray-400 truncate mt-0.5">{accom.address}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => openEditModal(accom)}
                        className="px-3 py-1.5 text-xs font-medium text-gray-500 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => handleDelete(accom.id)}
                        className="px-3 py-1.5 text-xs font-medium text-red-500 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                      >
                        삭제
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <div className="flex items-center gap-1.5 bg-blue-50 rounded-lg px-3 py-1.5">
                      <span className="text-xs text-blue-600 font-medium">체크인</span>
                      <span className="text-xs text-blue-800 font-bold">{formatDateShort(accom.checkIn)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-gray-100 rounded-lg px-3 py-1.5">
                      <span className="text-xs text-gray-500 font-medium">체크아웃</span>
                      <span className="text-xs text-gray-700 font-bold">{formatDateShort(accom.checkOut)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-gray-100 rounded-lg px-3 py-1.5">
                      <span className="text-xs text-gray-500">{nights}박</span>
                    </div>
                  </div>

                  {accom.pricePerNight > 0 && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
                      <span>1박 {accom.pricePerNight.toLocaleString()}원</span>
                      <span className="text-gray-300">·</span>
                      <span className="font-semibold text-gray-700">총 {total.toLocaleString()}원</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-100 bg-white">
        <Button fullWidth onClick={openAddModal}>+ 숙소 추가</Button>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? '숙소 수정' : '숙소 추가'}
      >
        <div className="flex flex-col gap-5">

          {/* 위치 검색 */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700">위치 검색</label>

            {locationSelected ? (
              <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                <span className="text-blue-500">📍</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-blue-800 truncate">{form.name}</p>
                  {form.address && (
                    <p className="text-xs text-blue-500 truncate">{form.address}</p>
                  )}
                </div>
                <button
                  onClick={() => { setLocationSelected(false); setSearchQuery('') }}
                  className="text-xs text-blue-400 hover:text-blue-600 shrink-0"
                >
                  변경
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleKakaoSearch()}
                    placeholder={kakaoReady ? '숙소 이름으로 검색 (예: 제주 신라호텔)' : '숙소 이름 직접 입력'}
                    className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#3182F6] bg-white"
                  />
                  {kakaoReady ? (
                    <button
                      onClick={handleKakaoSearch}
                      disabled={!searchQuery.trim() || searching}
                      className="px-4 py-3 bg-[#3182F6] text-white text-sm font-semibold rounded-xl disabled:opacity-40 shrink-0"
                    >
                      {searching ? '...' : '검색'}
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        if (searchQuery.trim()) {
                          setForm(prev => ({ ...prev, name: searchQuery.trim() }))
                          setLocationSelected(true)
                        }
                      }}
                      disabled={!searchQuery.trim()}
                      className="px-4 py-3 bg-[#3182F6] text-white text-sm font-semibold rounded-xl disabled:opacity-40 shrink-0"
                    >
                      확인
                    </button>
                  )}
                </div>

                {searching && (
                  <p className="text-xs text-gray-400 text-center py-2">검색 중...</p>
                )}

                {!kakaoReady && (
                  <p className="text-xs text-gray-400">카카오맵 키 미설정 — 이름만 입력해 추가할 수 있어요</p>
                )}

                {searchResults.length > 0 && (
                  <div className="flex flex-col gap-1 max-h-48 overflow-y-auto border border-gray-100 rounded-xl">
                    {searchResults.map(result => (
                      <button
                        key={result.id}
                        onClick={() => handleSelectLocation(result)}
                        className="flex items-start gap-3 px-4 py-3 text-left hover:bg-blue-50 transition-colors first:rounded-t-xl last:rounded-b-xl"
                      >
                        <span className="text-base mt-0.5 shrink-0">🏨</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{result.place_name}</p>
                          <p className="text-xs text-gray-400 truncate mt-0.5">
                            {result.road_address_name || result.address_name}
                          </p>
                          {result.category_group_name && (
                            <span className="text-xs text-blue-500">{result.category_group_name}</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 숙소 이름 (위치 선택 후 수정 가능) */}
          <Input
            label="숙소 이름 *"
            placeholder="호텔, 게스트하우스 등"
            value={form.name}
            onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
          />

          {/* 체크인 / 체크아웃 */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="체크인 *"
              type="date"
              value={form.checkIn}
              min={trip.startDate}
              max={trip.endDate}
              onChange={e => setForm(prev => ({ ...prev, checkIn: e.target.value }))}
            />
            <Input
              label="체크아웃 *"
              type="date"
              value={form.checkOut}
              min={form.checkIn || trip.startDate}
              max={trip.endDate}
              onChange={e => setForm(prev => ({ ...prev, checkOut: e.target.value }))}
            />
          </div>

          {/* 1박 가격 */}
          <div className="flex flex-col gap-1">
            <Input
              label="1박 가격 (원)"
              type="number"
              placeholder="150000"
              value={form.pricePerNight}
              onChange={e => setForm(prev => ({ ...prev, pricePerNight: e.target.value }))}
            />
            {form.pricePerNight && form.checkIn && form.checkOut && form.checkIn < form.checkOut && (
              <p className="text-xs text-gray-500">
                총 {differenceInDays(parseISO(form.checkOut), parseISO(form.checkIn))}박
                = {(parseInt(form.pricePerNight, 10) * differenceInDays(parseISO(form.checkOut), parseISO(form.checkIn))).toLocaleString()}원
              </p>
            )}
          </div>

          {formError && (
            <p className="text-sm text-red-500 text-center">{formError}</p>
          )}

          <Button fullWidth size="lg" onClick={handleSave} disabled={!form.name.trim()}>
            {editingId ? '수정 완료' : '숙소 등록'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
