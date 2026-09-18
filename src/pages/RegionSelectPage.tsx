import { useState, useEffect } from 'react'
import { useNavigate, useNavigationType } from 'react-router-dom'
import { usePlanStore } from '../store/usePlanStore'
import { useTripStore } from '../store/useTripStore'
import { searchKeyword, HAS_LOCAL_KEY } from '../utils/kakaoLocalSearch'
import type { LocalSearchResult } from '../utils/kakaoLocalSearch'
import type { Trip } from '../types'

interface Region {
  id: string
  name: string
  emoji: string
  description: string
}

const REGIONS: Region[] = [
  { id: 'jeju',     name: '제주도', emoji: '🌊', description: '에메랄드빛 바다와 한라산' },
  { id: 'busan',    name: '부산',   emoji: '🌉', description: '해운대, 광안리, 국제시장' },
  { id: 'gyeongju', name: '경주',   emoji: '🏛️', description: '신라의 역사와 문화유산' },
  { id: 'seoul',    name: '서울',   emoji: '🏙️', description: '도심 속 다양한 즐길거리' },
  { id: 'gangwon',  name: '강원도', emoji: '🏔️', description: '설악산, 속초, 강릉 바다' },
  { id: 'jeonju',   name: '전주',   emoji: '🍚', description: '한옥마을과 전통 한식' },
  { id: 'incheon',  name: '인천',   emoji: '✈️', description: '차이나타운과 섬 여행' },
  { id: 'daegu',    name: '대구',   emoji: '🌹', description: '근대 골목과 팔공산' },
]

type Step = 'select' | 'accom-prompt' | 'accom-form'

export function RegionSelectPage() {
  const navigate = useNavigate()
  const navigationType = useNavigationType()
  const { setPlanAccommodation, setRegion, clearPlan } = usePlanStore()
  const { createTrip, addAccommodation } = useTripStore()

  // handleConfirm에서 생성된 trip을 보관 — handleSaveAccom에서 accommodations에 추가할 때 사용
  const [createdTrip, setCreatedTrip] = useState<Trip | null>(null)

  // PUSH: 다른 페이지에서 새로 진입 → 이전 플랜 초기화
  // POP:  뒤로 가기로 돌아온 경우 → 진행 중인 플랜 유지
  useEffect(() => {
    if (navigationType !== 'POP') {
      clearPlan()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── 지역/기간 선택 ──────────────────────────────────────────────────────────
  const [query, setQuery] = useState('')
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null)
  const [days, setDays] = useState(1)

  // ── 단계 관리 ───────────────────────────────────────────────────────────────
  const [step, setStep] = useState<Step>('select')

  // ── 숙소 폼 상태 ────────────────────────────────────────────────────────────
  const [accomSearchQuery, setAccomSearchQuery] = useState('')
  const [accomSearchResults, setAccomSearchResults] = useState<LocalSearchResult[]>([])
  const [accomSearching, setAccomSearching] = useState(false)
  const [accomSelected, setAccomSelected] = useState<{ name: string; lat: number; lng: number } | null>(null)
  // Kakao 검색 없을 때 수동 입력
  const [accomNameManual, setAccomNameManual] = useState('')
  const [accomLatManual, setAccomLatManual] = useState('')
  const [accomLngManual, setAccomLngManual] = useState('')
  // REST API 기반 — SDK 로드 불필요
  const kakaoReady = HAS_LOCAL_KEY

  const filtered = query.trim()
    ? REGIONS.filter(r => r.name.includes(query.trim()) || r.description.includes(query.trim()))
    : REGIONS

  // ── 이동 목적지 ─────────────────────────────────────────────────────────────
  function goToPlaceSelect() {
    navigate(`/region/${selectedRegion!.id}?days=${days}`)
  }

  // ── Step: select → accom-prompt ─────────────────────────────────────────────
  function handleConfirm() {
    if (!selectedRegion) return

    // 빠른 흐름에서도 실제 trip을 생성해 tripId를 plan에 저장
    // toISOString()은 UTC 기준이라 한국 등 동쪽 타임존에서 날짜가 하루 뒤로 밀림.
    // 로컬 날짜 기준 YYYY-MM-DD를 사용해야 trip.days와 checkIn/checkOut이 일치함.
    const localDate = (d: Date): string =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

    const today = new Date()
    const startDate = localDate(today)
    const endDay = new Date(today)
    endDay.setDate(endDay.getDate() + days)
    const endDate = localDate(endDay)

    const trip = createTrip({
      title: `${selectedRegion.name} 여행`,
      destination: selectedRegion.name,
      startDate,
      endDate,
    })
    setCreatedTrip(trip)
    // region 초기화 + tripId를 한 번에 저장 (두 번 setPlan 호출 방지)
    setRegion(selectedRegion.id, selectedRegion.name, days, trip.id)

    setStep('accom-prompt')
  }

  // ── 숙소 검색 (Kakao) ───────────────────────────────────────────────────────
  async function handleAccomSearch() {
    if (!kakaoReady || !accomSearchQuery.trim()) return
    setAccomSearching(true)
    setAccomSearchResults([])
    const results = await searchKeyword(accomSearchQuery, { size: 8 })
    setAccomSearching(false)
    setAccomSearchResults(results)
  }

  function handleAccomSelectResult(result: LocalSearchResult) {
    setAccomSelected({
      name: result.place_name,
      lat: Number(result.y),
      lng: Number(result.x),
    })
    setAccomSearchResults([])
    setAccomSearchQuery('')
  }

  // ── 숙소 등록 후 다음으로 ────────────────────────────────────────────────────
  function handleSaveAccom() {
    let accom: { name: string; lat: number; lng: number } | null = null
    if (kakaoReady) {
      if (!accomSelected) return
      accom = accomSelected
    } else {
      const name = accomNameManual.trim()
      const lat = parseFloat(accomLatManual)
      const lng = parseFloat(accomLngManual)
      if (!name || isNaN(lat) || isNaN(lng)) return
      accom = { name, lat, lng }
    }

    // planAccommodation에 임시 저장 (장소 추천 거리 정렬용)
    setPlanAccommodation(accom)

    // trip.accommodations에도 정식 Accommodation으로 추가
    if (createdTrip) {
      addAccommodation(createdTrip.id, {
        name: accom.name,
        latitude: accom.lat,
        longitude: accom.lng,
        checkIn: createdTrip.startDate,
        checkOut: createdTrip.endDate,
        pricePerNight: 0,
      })
    }

    goToPlaceSelect()
  }

  const canSaveAccom = kakaoReady
    ? !!accomSelected
    : !!(accomNameManual.trim() && accomLatManual && accomLngManual &&
        !isNaN(parseFloat(accomLatManual)) && !isNaN(parseFloat(accomLngManual)))

  // ── 렌더 ────────────────────────────────────────────────────────────────────

  const summaryText = selectedRegion
    ? `${selectedRegion.name} · ${days === 0 ? '당일치기' : `${days}박${days + 1}일`}`
    : ''

  return (
    <div className="flex flex-col h-full bg-white">
      {/* 헤더 */}
      <div className="px-5 pt-12 pb-5">
        <h1 className="text-2xl font-bold text-gray-900">어디로 떠날까요?</h1>
        <p className="text-sm text-gray-400 mt-1">여행지를 선택하고 기간을 입력해주세요</p>
      </div>

      {/* 검색창 */}
      <div className="px-5 pb-4">
        <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-4 py-3">
          <span className="text-gray-400 text-lg">🔍</span>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="지역 검색 (예: 제주도, 부산)"
            className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-gray-400 text-sm">✕</button>
          )}
        </div>
      </div>

      {/* 지역 리스트 */}
      <div className="flex-1 overflow-y-auto px-5">
        {filtered.length === 0 ? (
          <p className="text-center text-gray-400 text-sm mt-10">검색 결과가 없어요</p>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map(region => {
              const isSelected = selectedRegion?.id === region.id
              return (
                <button
                  key={region.id}
                  onClick={() => { setSelectedRegion(region); setStep('select') }}
                  className={`flex items-center gap-4 w-full px-4 py-4 rounded-2xl border-2 text-left transition-all ${
                    isSelected ? 'border-blue-500 bg-blue-50' : 'border-transparent bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <span className="text-3xl">{region.emoji}</span>
                  <div className="flex-1">
                    <p className={`font-semibold text-base ${isSelected ? 'text-blue-600' : 'text-gray-900'}`}>
                      {region.name}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{region.description}</p>
                  </div>
                  {isSelected && <span className="text-blue-500 text-lg">✓</span>}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* ── 하단 영역: step에 따라 변환 ── */}

      {/* step: 지역 선택 */}
      {step === 'select' && (
        <div className="px-5 py-5 border-t border-gray-100 space-y-4">
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-3">여행 기간</p>
            <div className="flex items-center justify-between bg-gray-50 rounded-2xl px-5 py-3">
              <button
                onClick={() => setDays(d => Math.max(0, d - 1))}
                className="w-9 h-9 rounded-full bg-white shadow-sm text-gray-700 text-lg font-bold flex items-center justify-center active:scale-95 transition-transform"
              >
                −
              </button>
              <div className="text-center">
                {days === 0 ? (
                  <span className="text-2xl font-bold text-gray-900">당일치기</span>
                ) : (
                  <>
                    <span className="text-2xl font-bold text-gray-900">{days}</span>
                    <span className="text-sm text-gray-500 ml-1">박</span>
                    <span className="text-2xl font-bold text-gray-900 ml-2">{days + 1}</span>
                    <span className="text-sm text-gray-500 ml-1">일</span>
                  </>
                )}
              </div>
              <button
                onClick={() => setDays(d => Math.min(14, d + 1))}
                className="w-9 h-9 rounded-full bg-white shadow-sm text-gray-700 text-lg font-bold flex items-center justify-center active:scale-95 transition-transform"
              >
                +
              </button>
            </div>
          </div>
          <button
            onClick={handleConfirm}
            disabled={!selectedRegion}
            className={`w-full py-4 rounded-2xl text-base font-bold transition-all ${
              selectedRegion ? 'bg-blue-500 text-white active:scale-95' : 'bg-gray-100 text-gray-300 cursor-not-allowed'
            }`}
          >
            {selectedRegion
              ? `${selectedRegion.name} · ${days === 0 ? '당일치기' : `${days}박${days + 1}일`} 장소 추천받기`
              : '여행지를 선택해주세요'}
          </button>
        </div>
      )}

      {/* step: 숙소 등록 여부 묻기 */}
      {step === 'accom-prompt' && (
        <div className="px-5 py-5 border-t border-gray-100">
          {/* 선택 요약 */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm font-semibold text-gray-900">{summaryText}</span>
            <button
              onClick={() => setStep('select')}
              className="text-xs text-gray-400 underline"
            >
              변경
            </button>
          </div>

          {/* 프롬프트 카드 */}
          <div className="bg-blue-50 rounded-2xl px-5 py-4 mb-4">
            <p className="text-base font-bold text-gray-900 mb-1">🏨 숙소를 먼저 등록할까요?</p>
            <p className="text-xs text-gray-500 leading-relaxed">
              숙소 위치 기준으로 가까운 장소를 먼저 추천해드려요.
              나중에도 언제든 등록할 수 있어요.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <button
              onClick={() => setStep('accom-form')}
              className="w-full py-3.5 rounded-2xl text-sm font-bold bg-blue-500 text-white active:scale-95 transition-transform"
            >
              🏨 숙소 등록하기
            </button>
            <button
              onClick={() => { setPlanAccommodation(undefined); goToPlaceSelect() }}
              className="w-full py-3 rounded-2xl text-sm font-medium text-gray-500 bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              나중에 하기 →
            </button>
          </div>
        </div>
      )}

      {/* step: 숙소 정보 입력 */}
      {step === 'accom-form' && (
        <div className="px-5 py-5 border-t border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <button onClick={() => setStep('accom-prompt')} className="text-gray-400 text-sm">← 이전</button>
            <p className="text-sm font-bold text-gray-900">숙소 위치 등록</p>
          </div>

          {kakaoReady ? (
            /* Kakao 검색 방식 */
            <div className="flex flex-col gap-3">
              {accomSelected ? (
                /* 선택 완료 상태 */
                <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                  <span className="text-blue-500">📍</span>
                  <p className="flex-1 text-sm font-semibold text-blue-800 truncate">{accomSelected.name}</p>
                  <button
                    onClick={() => setAccomSelected(null)}
                    className="text-xs text-blue-400 hover:text-blue-600 shrink-0"
                  >
                    변경
                  </button>
                </div>
              ) : (
                /* 검색 입력 */
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={accomSearchQuery}
                      onChange={e => setAccomSearchQuery(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAccomSearch()}
                      placeholder="숙소 이름으로 검색 (예: 제주 신라호텔)"
                      className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400"
                    />
                    <button
                      onClick={handleAccomSearch}
                      disabled={!accomSearchQuery.trim() || accomSearching}
                      className="px-4 py-3 bg-blue-500 text-white text-sm font-semibold rounded-xl disabled:opacity-40 shrink-0"
                    >
                      {accomSearching ? '...' : '검색'}
                    </button>
                  </div>
                  {accomSearchResults.length > 0 && (
                    <div className="flex flex-col gap-1 max-h-40 overflow-y-auto border border-gray-100 rounded-xl">
                      {accomSearchResults.map(result => (
                        <button
                          key={result.id}
                          onClick={() => handleAccomSelectResult(result)}
                          className="flex items-start gap-3 px-4 py-2.5 text-left hover:bg-blue-50 transition-colors first:rounded-t-xl last:rounded-b-xl"
                        >
                          <span className="text-base shrink-0 mt-0.5">🏨</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{result.place_name}</p>
                            <p className="text-xs text-gray-400 truncate">
                              {result.road_address_name || result.address_name}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* 수동 입력 방식 (Kakao 키 없을 때) */
            <div className="flex flex-col gap-3">
              <input
                type="text"
                value={accomNameManual}
                onChange={e => setAccomNameManual(e.target.value)}
                placeholder="숙소 이름"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  step="any"
                  value={accomLatManual}
                  onChange={e => setAccomLatManual(e.target.value)}
                  placeholder="위도 (예: 33.4996)"
                  className="px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400"
                />
                <input
                  type="number"
                  step="any"
                  value={accomLngManual}
                  onChange={e => setAccomLngManual(e.target.value)}
                  placeholder="경도 (예: 126.5312)"
                  className="px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400"
                />
              </div>
              <p className="text-xs text-gray-400">💡 네이버 지도에서 숙소 우클릭 → 이 곳의 주소 → 좌표 확인</p>
            </div>
          )}

          <div className="flex flex-col gap-2 mt-4">
            <button
              onClick={handleSaveAccom}
              disabled={!canSaveAccom}
              className={`w-full py-3.5 rounded-2xl text-sm font-bold transition-all ${
                canSaveAccom ? 'bg-blue-500 text-white active:scale-95' : 'bg-gray-100 text-gray-300 cursor-not-allowed'
              }`}
            >
              등록하고 장소 선택하기
            </button>
            <button
              onClick={() => { setPlanAccommodation(undefined); goToPlaceSelect() }}
              className="w-full py-2.5 text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              숙소 없이 계속하기
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
