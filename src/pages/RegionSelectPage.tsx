import { useNavigate } from 'react-router-dom'
import { REGIONS } from '../data/attractions'

export function RegionSelectPage() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col min-h-full bg-white">
      <div className="px-5 pt-12 pb-6">
        <h1 className="text-2xl font-bold text-gray-900">어디로 떠날까요?</h1>
        <p className="text-sm text-gray-400 mt-1">지역을 선택하면 명소를 추천해드려요</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-8">
        <div className="grid grid-cols-2 gap-3">
          {REGIONS.map(region => (
            <button
              key={region.id}
              onClick={() => navigate(`/discover/${region.id}`)}
              className={`bg-gradient-to-br ${region.color} rounded-2xl p-5 flex flex-col items-start gap-2 text-white shadow-sm hover:shadow-md active:scale-95 transition-all`}
            >
              <span className="text-3xl">{region.emoji}</span>
              <span className="font-bold text-lg">{region.name}</span>
              <span className="text-xs text-white/70">{region.attractions.length}개 명소</span>
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 py-4 border-t border-gray-100">
        <button
          onClick={() => navigate('/')}
          className="w-full text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          내 여행 목록 보기 →
        </button>
      </div>
    </div>
  )
}
