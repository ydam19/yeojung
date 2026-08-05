import { useNavigate, useParams } from 'react-router-dom'
import { useTripStore } from '../store/useTripStore'
import { useDiaryStore } from '../store/useDiaryStore'
import { TopBar } from '../components/layout/TopBar'
import { EmptyState } from '../components/ui/EmptyState'
import { formatDate } from '../utils/dateUtils'

export function DiaryListPage() {
  const { tripId } = useParams<{ tripId: string }>()
  const navigate = useNavigate()
  const { getTrip } = useTripStore()
  const { getEntriesForTrip } = useDiaryStore()

  const trip = getTrip(tripId!)
  const entries = getEntriesForTrip(tripId!)
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date))

  return (
    <div className="flex flex-col min-h-full">
      <TopBar
        title="여행 다이어리"
        right={
          <button onClick={() => navigate(`/trips/${tripId}/diary/new`)} className="text-[#3182F6] text-xl font-light">+</button>
        }
      />

      <div className="flex-1 overflow-y-auto">
        {sorted.length === 0 ? (
          <EmptyState
            emoji="📔"
            title="아직 기록이 없어요"
            subtitle="여행의 소중한 순간을 남겨보세요"
            action={{ label: '첫 기록 남기기', onClick: () => navigate(`/trips/${tripId}/diary/new`) }}
          />
        ) : (
          <div className="p-4 flex flex-col gap-3">
            {sorted.map(entry => (
              <button
                key={entry.id}
                onClick={() => navigate(`/trips/${tripId}/diary/${entry.id}`)}
                className="w-full text-left bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-md transition-shadow"
              >
                {entry.photos[0] && (
                  <img src={entry.photos[0].base64} alt="" className="w-full h-36 object-cover" />
                )}
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">{formatDate(entry.date)}</span>
                    {entry.mood && <span className="text-xl">{entry.mood}</span>}
                  </div>
                  <h3 className="font-bold text-gray-900 mt-1">{entry.title || '(제목 없음)'}</h3>
                  {entry.memo && (
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{entry.memo}</p>
                  )}
                  {entry.photos.length > 1 && (
                    <p className="text-xs text-gray-400 mt-2">📷 사진 {entry.photos.length}장</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {trip && sorted.length > 0 && (
        <div className="p-4 border-t border-gray-100">
          <button
            onClick={() => navigate(`/trips/${tripId}/diary/new`)}
            className="w-full py-3 rounded-xl border-2 border-dashed border-gray-200 text-sm text-gray-400 hover:border-[#3182F6] hover:text-[#3182F6] transition-colors"
          >
            + 새 기록 남기기
          </button>
        </div>
      )}
    </div>
  )
}
