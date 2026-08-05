import { useNavigate, useParams } from 'react-router-dom'
import { useDiaryStore } from '../store/useDiaryStore'
import { TopBar } from '../components/layout/TopBar'
import { EmptyState } from '../components/ui/EmptyState'
import { formatDate } from '../utils/dateUtils'

export function DiaryEntryPage() {
  const { tripId, entryId } = useParams<{ tripId: string; entryId: string }>()
  const navigate = useNavigate()
  const { getEntry, deleteEntry } = useDiaryStore()
  const entry = getEntry(entryId!)

  if (!entry) {
    return (
      <div className="flex flex-col min-h-full">
        <TopBar title="다이어리" />
        <EmptyState emoji="😅" title="기록을 찾을 수 없어요" action={{ label: '목록으로', onClick: () => navigate(`/trips/${tripId}/diary`) }} />
      </div>
    )
  }

  function handleDelete() {
    if (confirm('이 기록을 삭제할까요?')) {
      deleteEntry(entryId!)
      navigate(`/trips/${tripId}/diary`)
    }
  }

  return (
    <div className="flex flex-col min-h-full">
      <TopBar
        title="다이어리"
        right={
          <div className="flex gap-2">
            <button onClick={() => navigate(`/trips/${tripId}/diary/${entryId}/edit`)} className="text-[#3182F6] text-sm font-medium">편집</button>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto">
        {/* 사진 스크롤 */}
        {entry.photos.length > 0 && (
          <div className="overflow-x-auto flex gap-1 snap-x snap-mandatory">
            {entry.photos.map(photo => (
              <img
                key={photo.id}
                src={photo.base64}
                alt=""
                className="w-full h-64 object-cover shrink-0 snap-start"
                style={{ minWidth: '100%' }}
              />
            ))}
          </div>
        )}

        <div className="p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">{formatDate(entry.date)}</span>
            {entry.mood && <span className="text-2xl">{entry.mood}</span>}
          </div>
          <h2 className="text-xl font-bold text-gray-900">{entry.title || '(제목 없음)'}</h2>
          {entry.memo && (
            <p className="text-sm text-gray-700 mt-4 leading-relaxed whitespace-pre-wrap">{entry.memo}</p>
          )}
        </div>
      </div>

      <div className="p-4 border-t border-gray-100">
        <button onClick={handleDelete} className="w-full py-3 text-sm text-red-400 font-medium hover:text-red-500">
          기록 삭제
        </button>
      </div>
    </div>
  )
}
