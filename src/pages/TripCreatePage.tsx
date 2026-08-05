import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTripStore } from '../store/useTripStore'
import { TopBar } from '../components/layout/TopBar'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'

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
        resolve(canvas.toDataURL('image/jpeg', 0.75))
      }
      img.src = e.target!.result as string
    }
    reader.readAsDataURL(file)
  })
}

export function TripCreatePage() {
  const navigate = useNavigate()
  const { createTrip } = useTripStore()
  const fileRef = useRef<HTMLInputElement>(null)

  const [title, setTitle] = useState('')
  const [destination, setDestination] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [cover, setCover] = useState<string | undefined>()
  const [errors, setErrors] = useState<Record<string, string>>({})

  async function handleCover(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) setCover(await resizeImage(file))
  }

  function validate() {
    const errs: Record<string, string> = {}
    if (!title.trim()) errs.title = '여행 이름을 입력해주세요'
    if (!destination.trim()) errs.destination = '여행지를 입력해주세요'
    if (!startDate) errs.startDate = '출발일을 선택해주세요'
    if (!endDate) errs.endDate = '귀국일을 선택해주세요'
    if (startDate && endDate && endDate < startDate) errs.endDate = '귀국일은 출발일 이후여야 해요'
    return errs
  }

  function handleSubmit() {
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    const trip = createTrip({ title, destination, startDate, endDate, coverImageBase64: cover })
    navigate(`/trips/${trip.id}`)
  }

  return (
    <div className="flex flex-col min-h-full">
      <TopBar title="새 여행 만들기" />

      <div className="flex-1 p-5 flex flex-col gap-5">
        {/* 커버 이미지 */}
        <div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleCover} />
          {cover ? (
            <div className="relative rounded-2xl overflow-hidden h-44">
              <img src={cover} alt="" className="w-full h-full object-cover" />
              <button
                onClick={() => setCover(undefined)}
                className="absolute top-2 right-2 bg-black/50 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm"
              >×</button>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full h-36 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-[#3182F6] hover:text-[#3182F6] transition-colors"
            >
              <span className="text-2xl">🖼️</span>
              <span className="text-sm">커버 사진 추가 (선택)</span>
            </button>
          )}
        </div>

        <Input
          label="여행 이름"
          placeholder="오사카 벚꽃 여행"
          value={title}
          onChange={e => { setTitle(e.target.value); setErrors(p => ({ ...p, title: '' })) }}
          error={errors.title}
        />

        <Input
          label="여행지"
          placeholder="일본 오사카"
          value={destination}
          onChange={e => { setDestination(e.target.value); setErrors(p => ({ ...p, destination: '' })) }}
          error={errors.destination}
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="출발일"
            type="date"
            value={startDate}
            onChange={e => { setStartDate(e.target.value); setErrors(p => ({ ...p, startDate: '' })) }}
            error={errors.startDate}
          />
          <Input
            label="귀국일"
            type="date"
            value={endDate}
            min={startDate}
            onChange={e => { setEndDate(e.target.value); setErrors(p => ({ ...p, endDate: '' })) }}
            error={errors.endDate}
          />
        </div>
      </div>

      <div className="p-5 border-t border-gray-100">
        <Button fullWidth size="lg" onClick={handleSubmit}>
          여행 만들기
        </Button>
      </div>
    </div>
  )
}
