import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTripStore } from '../store/useTripStore'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'

export function TripEditPage() {
  const { tripId } = useParams<{ tripId: string }>()
  const navigate = useNavigate()
  const { getTrip, updateTrip, deleteTrip } = useTripStore()
  const trip = getTrip(tripId!)

  const [title, setTitle] = useState(trip?.title ?? '')
  const [destination, setDestination] = useState(trip?.destination ?? '')

  if (!trip) {
    navigate('/')
    return null
  }

  function handleSave() {
    updateTrip(tripId!, { title, destination })
    navigate(`/trips/${tripId}`)
  }

  function handleDelete() {
    if (confirm('이 여행을 삭제할까요? 일정과 다이어리도 모두 사라져요.')) {
      deleteTrip(tripId!)
      navigate('/')
    }
  }

  return (
    <div className="flex flex-col min-h-full">
      <div className="flex-1 p-5 flex flex-col gap-5">
        <Input label="여행 이름" value={title} onChange={e => setTitle(e.target.value)} />
        <Input label="여행지" value={destination} onChange={e => setDestination(e.target.value)} />
      </div>
      <div className="p-5 flex flex-col gap-3 border-t border-gray-100">
        <Button fullWidth size="lg" onClick={handleSave}>저장</Button>
        <Button fullWidth size="lg" variant="danger" onClick={handleDelete}>여행 삭제</Button>
      </div>
    </div>
  )
}
