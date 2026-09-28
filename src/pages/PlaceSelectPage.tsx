import { useState, useMemo, useEffect, useRef } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { getPlacesByRegion, searchPlaces, CATEGORY_LABELS, CATEGORY_EMOJI, REGION_CENTERS } from '../data/places'
import { usePlanStore } from '../store/usePlanStore'
import { haversineDistance } from '../utils/geoUtils'
import { searchKeyword, HAS_LOCAL_KEY } from '../utils/kakaoLocalSearch'
import type { LocalSearchResult } from '../utils/kakaoLocalSearch'
import type { PlaceCategory, PlaceItem } from '../data/places'

const REGION_NAMES: Record<string, string> = {
  jeju: '제주도', busan: '부산', gyeongju: '경주',
  seoul: '서울', gangwon: '강원도', jeonju: '전주',
  incheon: '인천', daegu: '대구',
  daejeon: '대전', gwangju: '광주', ulsan: '울산', sejong: '세종',
  gangneung: '강릉', sokcho: '속초', chuncheon: '춘천',
  yeosu: '여수', tongyeong: '통영', buyeo: '부여',
  andong: '안동', pohang: '포항', suncheon: '순천',
}

const ALL_CATEGORIES: PlaceCategory[] = ['attraction', 'restaurant', 'cafe', 'activity']

export function PlaceSelectPage() {
  const { regionId = '' } = useParams<{ regionId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const days = Number(searchParams.get('days') ?? 2)
  // 커스텀 지역일 때 RegionSelectPage에서 전달한 중심 좌표
  const urlLat = searchParams.get('lat')
  const urlLng = searchParams.get('lng')
  const regionCenter: { lat: number; lng: number } | undefined =
    REGION_CENTERS[regionId] ??
    (urlLat && urlLng ? { lat: Number(urlLat), lng: Number(urlLng) } : undefined)

  const { plan, setRegion, togglePlace, isSelected } = usePlanStore()
  // 커스텀 지역(custom-...)은 REGION_NAMES에 없으므로 plan.regionName을 fallback으로 사용
  const regionName = REGION_NAMES[regionId] ?? (plan.regionName || regionId)
  const accom = plan.planAccommodation

  // regionId / days가 바뀌면 플랜 초기화
  useEffect(() => {
    if (plan.regionId !== regionId || plan.days !== days) {
      setRegion(regionId, regionName, days)
    }
  }, [regionId, days]) // eslint-disable-line react-hooks/exhaustive-deps

  const [activeCategory, setActiveCategory] = useState<PlaceCategory | 'all'>('all')
  const [query, setQuery] = useState('')
  const [showCustomSearch, setShowCustomSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<LocalSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  // REST API 기반 — 비동기 SDK 로드 불필요, 키 존재 여부만 확인
  const kakaoReady = HAS_LOCAL_KEY
  const searchInputRef = useRef<HTMLInputElement>(null)

  // 정적 데이터가 없는 지역 → Kakao로 자동 추천 장소 조회
  const [autoPlaces, setAutoPlaces] = useState<PlaceItem[]>([])
  const [autoLoading, setAutoLoading] = useState(false)

  useEffect(() => {
    const hasStatic = getPlacesByRegion(regionId).length > 0
    if (hasStatic) { setAutoPlaces([]); return }
    if (!regionName || regionName === regionId) return

    let cancelled = false

    const center: { lat: number; lng: number } | undefined =
      REGION_CENTERS[regionId] ??
      (urlLat && urlLng ? { lat: Number(urlLat), lng: Number(urlLng) } : undefined)

    setAutoLoading(true)
    setAutoPlaces([])
    searchKeyword(`${regionName} 관광명소`, {
      center,
      radius: center ? 20000 : undefined,
      size: 10,
    }).then(results => {
      if (cancelled) return
      setAutoPlaces(results.map(r => ({
        id: `auto-${r.id}`,
        regionId,
        name: r.place_name,
        category: 'attraction' as PlaceCategory,
        description: r.road_address_name || r.address_name,
        tags: ['카카오 추천'],
        lat: Number(r.y),
        lng: Number(r.x),
      })))
      setAutoLoading(false)
    })

    return () => { cancelled = true }
  }, [regionId, urlLat, urlLng, regionName]) // eslint-disable-line react-hooks/exhaustive-deps

  const recommendedPlaces = useMemo(() => {
    // 직접 추가한 장소는 custom-만 (auto-는 autoPlaces에서 이미 raw에 포함되므로 제외)
    const customPlaces = plan.selectedPlaces.filter(p => p.id.startsWith('custom-'))

    // 검색어가 있으면 이름으로 필터, 없으면 전체 표시
    const customFiltered = query.trim()
      ? customPlaces.filter(p => p.name.includes(query.trim()))
      : customPlaces

    const raw = query.trim()
      ? searchPlaces(regionId, query)
      : (() => {
          const staticAll = getPlacesByRegion(regionId)
          // 정적 데이터 없으면 자동 검색 결과 사용
          const base = staticAll.length > 0 ? staticAll : autoPlaces
          return activeCategory === 'all' ? base : base.filter(p => p.category === activeCategory)
        })()

    // 커스텀 장소를 앞에 병합한 뒤 이름 기준 중복 제거 (안전망)
    const seen = new Set<string>()
    const combined: PlaceItem[] = []
    for (const p of [...customFiltered, ...raw]) {
      if (!seen.has(p.name)) {
        seen.add(p.name)
        combined.push(p)
      }
    }

    // 숙소 좌표가 있으면 숙소 기준 가까운 순으로 정렬
    if (!accom) return combined
    return [...combined].sort((a, b) => {
      // 좌표 없는 장소는 뒤로
      if (!a.lat || !a.lng) return 1
      if (!b.lat || !b.lng) return -1
      const da = haversineDistance({ lat: accom.lat, lng: accom.lng }, { lat: a.lat, lng: a.lng })
      const db = haversineDistance({ lat: accom.lat, lng: accom.lng }, { lat: b.lat, lng: b.lng })
      return da - db
    })
  }, [regionId, query, activeCategory, accom, plan.selectedPlaces, autoPlaces])

  async function handleKakaoSearch() {
    if (!kakaoReady || !searchQuery.trim()) return
    setSearching(true)
    setSearchResults([])

    const results = await searchKeyword(searchQuery, {
      center: regionCenter,
      radius: regionCenter ? 20000 : undefined,
      size: 15,
    })
    setSearching(false)
    setSearchResults(results)
  }

  function handleSelectSearchResult(result: LocalSearchResult) {
    const place: PlaceItem = {
      id: `custom-${result.id}`,
      regionId,
      name: result.place_name,
      category: activeCategory === 'all' ? 'attraction' : activeCategory,
      description: result.road_address_name || result.address_name,
      tags: ['직접추가'],
      lat: Number(result.y),
      lng: Number(result.x),
    }
    togglePlace(place)
    setShowCustomSearch(false)
    setSearchQuery('')
    setSearchResults([])
  }

  function handleFallbackAdd() {
    // 카카오 키 없을 때 이름만으로 추가 (좌표 없음)
    if (!searchQuery.trim()) return
    const place: PlaceItem = {
      id: `custom-${Date.now()}`,
      regionId,
      name: searchQuery.trim(),
      category: activeCategory === 'all' ? 'attraction' : activeCategory,
      description: '직접 추가한 장소',
      tags: ['직접추가'],
    }
    togglePlace(place)
    setShowCustomSearch(false)
    setSearchQuery('')
  }

  const selectedCount = plan.selectedPlaces.length

  return (
    <div className="flex flex-col h-full bg-white">
      {/* 검색창 */}
      <div className="px-5 pb-3">
        <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-4 py-3">
          <span className="text-gray-400">🔍</span>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={`${regionName}에서 가고 싶은 장소 검색`}
            className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-gray-400 text-sm">✕</button>
          )}
        </div>
      </div>

      {/* 카테고리 탭 */}
      {!query && (
        <div className="px-5 pb-3 flex gap-2 overflow-x-auto no-scrollbar">
          {(['all', ...ALL_CATEGORIES] as const).map(cat => {
            const isActive = activeCategory === cat
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat === 'all' ? '전체' : `${CATEGORY_EMOJI[cat]} ${CATEGORY_LABELS[cat]}`}
              </button>
            )
          })}
        </div>
      )}

      {/* 장소 목록 */}
      <div className="flex-1 overflow-y-auto px-5 pb-4">
        {/* 직접 추가 */}
        <div className="mb-3">
          {showCustomSearch ? (
            <div className="bg-gray-50 rounded-2xl p-3 flex flex-col gap-2">
              {/* 검색 입력 */}
              <div className="flex gap-2">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (kakaoReady ? handleKakaoSearch() : handleFallbackAdd())}
                  placeholder={kakaoReady ? '장소 이름으로 검색 (예: 성산일출봉)' : '장소 이름 입력'}
                  autoFocus
                  className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400"
                />
                {kakaoReady ? (
                  <button
                    onClick={handleKakaoSearch}
                    disabled={!searchQuery.trim() || searching}
                    className="px-4 py-2.5 bg-blue-500 text-white text-sm font-semibold rounded-xl disabled:opacity-40 flex-shrink-0"
                  >
                    {searching ? '...' : '검색'}
                  </button>
                ) : (
                  <button
                    onClick={handleFallbackAdd}
                    disabled={!searchQuery.trim()}
                    className="px-4 py-2.5 bg-blue-500 text-white text-sm font-semibold rounded-xl disabled:opacity-40 flex-shrink-0"
                  >
                    추가
                  </button>
                )}
                <button
                  onClick={() => { setShowCustomSearch(false); setSearchQuery(''); setSearchResults([]) }}
                  className="px-3 py-2.5 bg-white border border-gray-200 text-gray-500 text-sm rounded-xl flex-shrink-0"
                >
                  취소
                </button>
              </div>

              {/* 검색 결과 */}
              {searching && (
                <p className="text-xs text-gray-400 text-center py-2">검색 중...</p>
              )}
              {!searching && searchResults.length === 0 && searchQuery && !kakaoReady && (
                <p className="text-xs text-gray-400 px-1">이름만 입력 후 추가하면 좌표 없이 저장돼요</p>
              )}
              {searchResults.length > 0 && (
                <div className="flex flex-col gap-1 max-h-52 overflow-y-auto">
                  {searchResults.map(result => (
                    <button
                      key={result.id}
                      onClick={() => handleSelectSearchResult(result)}
                      className="flex items-start gap-3 px-3 py-2.5 bg-white rounded-xl text-left hover:bg-blue-50 transition-colors"
                    >
                      <span className="text-base mt-0.5 flex-shrink-0">📍</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{result.place_name}</p>
                        <p className="text-xs text-gray-400 truncate mt-0.5">
                          {result.road_address_name || result.address_name}
                        </p>
                        {result.category_group_name && (
                          <span className="text-xs text-blue-500 mt-0.5 inline-block">{result.category_group_name}</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => setShowCustomSearch(true)}
              className="w-full flex items-center gap-2 px-4 py-3 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 text-sm hover:border-blue-300 hover:text-blue-400 transition-colors"
            >
              <span className="text-lg">＋</span>
              <span>목록에 없는 장소 직접 추가</span>
            </button>
          )}
        </div>

        {/* 추천 장소 목록 */}
        {autoLoading && recommendedPlaces.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm text-gray-400">{regionName} 추천 장소 불러오는 중...</p>
          </div>
        ) : recommendedPlaces.length === 0 ? (
          <p className="text-center text-gray-400 text-sm mt-10">검색 결과가 없어요</p>
        ) : (
          <div className="flex flex-col gap-2">
            {!query && (
              accom ? (
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-blue-500 font-semibold">
                    📍 {accom.name} 기준 가까운 순
                  </p>
                </div>
              ) : (
                <p className="text-xs text-gray-400 font-medium mb-1">
                  {activeCategory === 'all' ? '추천 장소' : `${CATEGORY_LABELS[activeCategory]} 추천`}
                </p>
              )
            )}
            {recommendedPlaces.map(place => {
              const selected = isSelected(place.id)
              return (
                <button
                  key={place.id}
                  onClick={() => togglePlace(place)}
                  className={`w-full flex items-start gap-3 p-4 rounded-2xl border-2 text-left transition-all active:scale-[0.98] ${
                    selected ? 'border-blue-400 bg-blue-50' : 'border-transparent bg-gray-50'
                  }`}
                >
                  <span className="text-2xl mt-0.5">{CATEGORY_EMOJI[place.category]}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold text-sm ${selected ? 'text-blue-700' : 'text-gray-900'}`}>
                      {place.name}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{place.description}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {place.tags.map(tag => (
                        <span
                          key={tag}
                          className="text-xs px-2 py-0.5 bg-white rounded-full text-gray-500 border border-gray-200"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  {/* 체크박스 */}
                  <div className={`flex-shrink-0 w-5 h-5 rounded-[5px] border-2 flex items-center justify-center transition-all mt-0.5 ${
                    selected
                      ? 'bg-blue-500 border-blue-500'
                      : 'bg-white border-gray-300'
                  }`}>
                    {selected && (
                      <svg width="11" height="8" viewBox="0 0 11 8" fill="none">
                        <path d="M1 4L4 7L10 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* 하단 바 */}
      <div className="px-5 py-4 border-t border-gray-100">
        <button
          onClick={() => navigate('/trips')}
          disabled={selectedCount === 0}
          className={`w-full py-4 rounded-2xl text-base font-bold transition-all ${
            selectedCount > 0
              ? 'bg-blue-500 text-white active:scale-95'
              : 'bg-gray-100 text-gray-300 cursor-not-allowed'
          }`}
        >
          {selectedCount > 0
            ? `장소 ${selectedCount}개 선택 완료 →`
            : '장소를 1개 이상 선택해주세요'}
        </button>
      </div>
    </div>
  )
}
