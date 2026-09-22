import { useState, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { REGIONS, ALL_ATTRACTIONS, type Attraction } from '../data/attractions'
import { naverMapSearchUrl } from '../utils/naverMaps'
import { PLACE_CATEGORY_EMOJI } from '../types'

const MAX_SELECT = 10

export function AttractionSelectPage() {
  const { regionId } = useParams<{ regionId: string }>()
  const navigate = useNavigate()

  const region = REGIONS.find(r => r.id === regionId)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Attraction[]>([])

  const displayList = useMemo(() => {
    if (!query.trim()) return region?.attractions ?? []
    const q = query.trim().toLowerCase()
    return ALL_ATTRACTIONS.filter(a =>
      a.name.toLowerCase().includes(q) ||
      a.address.toLowerCase().includes(q) ||
      a.description?.toLowerCase().includes(q)
    )
  }, [query, region])

  function toggle(attraction: Attraction) {
    setSelected(prev => {
      const exists = prev.find(a => a.id === attraction.id)
      if (exists) return prev.filter(a => a.id !== attraction.id)
      if (prev.length >= MAX_SELECT) return prev
      return [...prev, attraction]
    })
  }

  function handleNext() {
    if (selected.length === 0) return
    navigate('/discover/review', { state: { selected, regionId } })
  }

  if (!region) {
    navigate('/discover')
    return null
  }

  return (
    <div className="flex flex-col h-full">
      {/* 검색창 */}
      <div className="bg-white px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-4 py-2.5">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-gray-400 shrink-0">
            <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="장소 검색..."
            className="flex-1 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
          )}
        </div>
      </div>

      {/* 선택 카운터 */}
      {selected.length > 0 && (
        <div className="bg-blue-50 px-5 py-2 flex items-center justify-between">
          <span className="text-xs text-[#3182F6] font-semibold">{selected.length}/{MAX_SELECT}개 선택됨</span>
          <button onClick={() => setSelected([])} className="text-xs text-gray-400 hover:text-red-400">전체 해제</button>
        </div>
      )}

      {/* 명소 리스트 */}
      <div className="flex-1 overflow-y-auto">
        {query && displayList.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-12 px-5">
            <p className="text-sm text-gray-400">"{query}"에 대한 검색 결과가 없어요</p>
            <a
              href={naverMapSearchUrl(query)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-[#03C75A] text-white text-sm font-semibold px-5 py-3 rounded-xl hover:bg-green-600 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 18 18" fill="currentColor">
                <path d="M9 1C5.13 1 2 4.13 2 8c0 5.25 7 10 7 10s7-4.75 7-10c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S7.62 5.5 9 5.5s2.5 1.12 2.5 2.5S10.38 10.5 9 10.5z"/>
              </svg>
              네이버 지도에서 "{query}" 검색하기
            </a>
          </div>
        ) : (
          <div className="p-4 flex flex-col gap-2">
            {query && (
              <p className="text-xs text-gray-400 px-1 mb-1">전체 지역 검색 결과 {displayList.length}개</p>
            )}
            {displayList.map(attraction => {
              const isSelected = selected.some(a => a.id === attraction.id)
              const isDisabled = !isSelected && selected.length >= MAX_SELECT

              return (
                <button
                  key={attraction.id}
                  onClick={() => !isDisabled && toggle(attraction)}
                  disabled={isDisabled}
                  className={`w-full text-left flex items-center gap-3 p-4 rounded-2xl border transition-all ${
                    isSelected
                      ? 'bg-blue-50 border-[#3182F6]'
                      : isDisabled
                      ? 'bg-gray-50 border-gray-100 opacity-50 cursor-not-allowed'
                      : 'bg-white border-gray-100 hover:border-gray-300 active:scale-[0.98]'
                  }`}
                >
                  {/* 체크박스 */}
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                    isSelected ? 'bg-[#3182F6] border-[#3182F6]' : 'border-gray-300'
                  }`}>
                    {isSelected && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>

                  {/* 내용 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-base">{PLACE_CATEGORY_EMOJI[attraction.category]}</span>
                      <span className="font-semibold text-gray-900 text-sm">{attraction.name}</span>
                      {query && 'regionName' in attraction && (
                        <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
                          {(attraction as typeof attraction & { regionName: string }).regionName}
                        </span>
                      )}
                    </div>
                    {attraction.description && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{attraction.description}</p>
                    )}
                    <p className="text-xs text-gray-300 mt-0.5 truncate">{attraction.address}</p>
                  </div>

                  {/* 네이버 지도 */}
                  <a
                    href={naverMapSearchUrl(attraction.name)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="text-gray-300 hover:text-[#03C75A] transition-colors shrink-0"
                  >
                    <svg width="16" height="16" viewBox="0 0 18 18" fill="currentColor">
                      <path d="M9 1C5.13 1 2 4.13 2 8c0 5.25 7 10 7 10s7-4.75 7-10c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S7.62 5.5 9 5.5s2.5 1.12 2.5 2.5S10.38 10.5 9 10.5z"/>
                    </svg>
                  </a>
                </button>
              )
            })}

            {/* 검색 중 네이버 지도 추가 옵션 */}
            {query && displayList.length > 0 && (
              <a
                href={naverMapSearchUrl(query)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-3 text-sm text-[#03C75A] font-medium hover:underline mt-1"
              >
                <svg width="14" height="14" viewBox="0 0 18 18" fill="currentColor">
                  <path d="M9 1C5.13 1 2 4.13 2 8c0 5.25 7 10 7 10s7-4.75 7-10c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S7.62 5.5 9 5.5s2.5 1.12 2.5 2.5S10.38 10.5 9 10.5z"/>
                </svg>
                네이버 지도에서 더 검색하기
              </a>
            )}
          </div>
        )}
      </div>

      {/* 하단 버튼 */}
      <div className="p-4 border-t border-gray-100 bg-white">
        <button
          onClick={handleNext}
          disabled={selected.length === 0}
          className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all ${
            selected.length > 0
              ? 'bg-[#3182F6] text-white hover:bg-blue-600 active:scale-95'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          {selected.length > 0 ? `${selected.length}개 장소 확인하기 →` : '장소를 선택해주세요'}
        </button>
      </div>
    </div>
  )
}
