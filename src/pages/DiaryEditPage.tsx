import { useState, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useDiaryStore } from '../store/useDiaryStore'
import { TopBar } from '../components/layout/TopBar'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { MOOD_EMOJIS, type MoodEmoji, type DiaryPhoto } from '../types'
import { v4 as uuid } from 'uuid'

function resizeImage(file: File): Promise<string> {
  return new Promise(resolve => {
    const reader = new FileReader()
    reader.onload = e => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const maxW = 800
        const ratio = Math.min(1, maxW / img.width)
        canvas.width = img.width * ratio
        canvas.height = img.height * ratio
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.7))
      }
      img.src = e.target!.result as string
    }
    reader.readAsDataURL(file)
  })
}

export function DiaryEditPage() {
  const { tripId, entryId } = useParams<{ tripId: string; entryId?: string }>()
  const navigate = useNavigate()
  const { getEntry, createEntry, updateEntry } = useDiaryStore()

  const existing = entryId ? getEntry(entryId) : undefined
  const fileRef = useRef<HTMLInputElement>(null)

  const [date, setDate] = useState(existing?.date ?? new Date().toISOString().slice(0, 10))
  const [title, setTitle] = useState(existing?.title ?? '')
  const [memo, setMemo] = useState(existing?.memo ?? '')
  const [photos, setPhotos] = useState<DiaryPhoto[]>(existing?.photos ?? [])
  const [mood, setMood] = useState<MoodEmoji | undefined>(existing?.mood)

  async function handlePhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, 5 - photos.length)
    const newPhotos = await Promise.all(files.map(async f => ({
      id: uuid(),
      base64: await resizeImage(f),
    })))
    setPhotos(p => [...p, ...newPhotos])
  }

  function removePhoto(id: string) {
    setPhotos(p => p.filter(ph => ph.id !== id))
  }

  function handleSave() {
    if (!title.trim() && !memo.trim() && photos.length === 0) return
    const data = { tripId: tripId!, date, title, memo, photos, mood }
    if (existing) {
      updateEntry(existing.id, data)
      navigate(`/trips/${tripId}/diary/${existing.id}`)
    } else {
      const entry = createEntry(data)
      navigate(`/trips/${tripId}/diary/${entry.id}`)
    }
  }

  return (
    <div className="flex flex-col min-h-full">
      <TopBar title={existing ? '기록 편집' : '새 기록'} />

      <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
        {/* 날짜 */}
        <Input label="날짜" type="date" value={date} onChange={e => setDate(e.target.value)} />

        {/* 기분 */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">오늘의 기분</label>
          <div className="flex gap-2">
            {MOOD_EMOJIS.map(emoji => (
              <button
                key={emoji}
                onClick={() => setMood(p => p === emoji ? undefined : emoji)}
                className={`text-2xl w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                  mood === emoji ? 'bg-blue-100 ring-2 ring-[#3182F6]' : 'bg-gray-100'
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {/* 제목 */}
        <Input label="제목" placeholder="오늘의 여행 제목" value={title} onChange={e => setTitle(e.target.value)} />

        {/* 사진 */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">사진 ({photos.length}/5)</label>
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotos} />
          <div className="grid grid-cols-3 gap-2">
            {photos.map(photo => (
              <div key={photo.id} className="relative aspect-square">
                <img src={photo.base64} alt="" className="w-full h-full object-cover rounded-xl" />
                <button
                  onClick={() => removePhoto(photo.id)}
                  className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                >×</button>
              </div>
            ))}
            {photos.length < 5 && (
              <button
                onClick={() => fileRef.current?.click()}
                className="aspect-square rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-400 hover:border-[#3182F6] hover:text-[#3182F6] transition-colors"
              >
                <span className="text-2xl">+</span>
              </button>
            )}
          </div>
        </div>

        {/* 메모 */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">메모</label>
          <textarea
            value={memo}
            onChange={e => {
              setMemo(e.target.value)
              e.target.style.height = 'auto'
              e.target.style.height = e.target.scrollHeight + 'px'
            }}
            placeholder="오늘의 여행을 기록해보세요..."
            rows={5}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#3182F6] outline-none text-sm text-gray-900 placeholder:text-gray-400 resize-none transition"
          />
        </div>
      </div>

      <div className="p-5 border-t border-gray-100">
        <Button fullWidth size="lg" onClick={handleSave}>저장</Button>
      </div>
    </div>
  )
}
