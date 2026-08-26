import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

interface Region {
  id: string
  name: string
  emoji: string
  description: string
}

const REGIONS: Region[] = [
  { id: 'jeju', name: '제주도', emoji: '🌊', description: '에메랄드빛 바다와 한라산' },
  { id: 'busan', name: '부산', emoji: '🌉', description: '해운대, 광안리, 국제시장' },
  { id: 'gyeongju', name: '경주', emoji: '🏛️', description: '신라의 역사와 문화유산' },
  { id: 'seoul', name: '서울', emoji: '🏙️', description: '도심 속 다양한 즐길거리' },
  { id: 'gangwon', name: '강원도', emoji: '🏔️', description: '설악산, 속초, 강릉 바다' },
  { id: 'jeonju', name: '전주', emoji: '🍚', description: '한옥마을과 전통 한식' },
  { id: 'incheon', name: '인천', emoji: '✈️', description: '차이나타운과 섬 여행' },
  { id: 'daegu', name: '대구', emoji: '🌹', description: '근대 골목과 팔공산' },
]

export function RegionSelectPage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null)
  const [days, setDays] = useState(1)

  const filtered = query.trim()
    ? REGIONS.filter(r =>
        r.name.includes(query.trim()) || r.description.includes(query.trim())
      )
    : REGIONS

  function handleConfirm() {
    if (!selectedRegion) return
    navigate(`/region/${selectedRegion.id}?days=${days}`)
  }

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
            <button
              onClick={() => setQuery('')}
              className="text-gray-400 text-sm"
            >
              ✕
            </button>
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
                  onClick={() => setSelectedRegion(region)}
                  className={`flex items-center gap-4 w-full px-4 py-4 rounded-2xl border-2 text-left transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-transparent bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <span className="text-3xl">{region.emoji}</span>
                  <div className="flex-1">
                    <p className={`font-semibold text-base ${isSelected ? 'text-blue-600' : 'text-gray-900'}`}>
                      {region.name}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{region.description}</p>
                  </div>
                  {isSelected && (
                    <span className="text-blue-500 text-lg">✓</span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* 여행 기간 + 확인 버튼 */}
      <div className="px-5 py-5 border-t border-gray-100 space-y-4">
        {/* 여행 기간 */}
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

        {/* 확인 버튼 */}
        <button
          onClick={handleConfirm}
          disabled={!selectedRegion}
          className={`w-full py-4 rounded-2xl text-base font-bold transition-all ${
            selectedRegion
              ? 'bg-blue-500 text-white active:scale-95'
              : 'bg-gray-100 text-gray-300 cursor-not-allowed'
          }`}
        >
          {selectedRegion
            ? `${selectedRegion.name} · ${days === 0 ? '당일치기' : `${days}박${days + 1}일`} 장소 추천받기`
            : '여행지를 선택해주세요'}
        </button>
      </div>
    </div>
  )
}
