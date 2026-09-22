import { useNavigate } from 'react-router-dom'
import { useTripStore } from '../store/useTripStore'
import { EmptyState } from '../components/ui/EmptyState'
import { formatDateRange, getDDayLabel, getTripStatus } from '../utils/dateUtils'
import type { Trip } from '../types'

function TripCard({ trip, onClick }: { trip: Trip; onClick: () => void }) {
  const status = getTripStatus(trip.startDate, trip.endDate)
  const statusLabel =
    status === 'ongoing' ? '여행 중' :
    status === 'upcoming' ? getDDayLabel(trip.startDate) :
    '다녀온 여행'

  const statusColor =
    status === 'ongoing' ? 'bg-green-100 text-green-700' :
    status === 'upcoming' ? 'bg-blue-100 text-[#3182F6]' :
    'bg-gray-100 text-gray-500'

  const gradients = [
    'from-blue-400 to-indigo-500',
    'from-orange-400 to-pink-500',
    'from-green-400 to-teal-500',
    'from-purple-400 to-pink-500',
    'from-yellow-400 to-orange-500',
  ]
  const gradient = gradients[trip.id.charCodeAt(0) % gradients.length]

  return (
    <button onClick={onClick} className="w-full text-left bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      {trip.coverImageBase64 ? (
        <img src={trip.coverImageBase64} alt="" className="w-full h-36 object-cover" />
      ) : (
        <div className={`w-full h-36 bg-gradient-to-br ${gradient} flex items-end p-4`}>
          <span className="text-white text-2xl font-bold opacity-80">{trip.destination}</span>
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-gray-900 text-base">{trip.title}</h3>
          <span className={`text-xs font-semibold px-2 py-1 rounded-full shrink-0 ${statusColor}`}>{statusLabel}</span>
        </div>
        <p className="text-sm text-gray-500 mt-1">{formatDateRange(trip.startDate, trip.endDate)}</p>
        {trip.collaborators.length > 0 && (
          <div className="flex items-center gap-1 mt-2">
            {trip.collaborators.slice(0, 4).map(c => (
              <div key={c.id} style={{ backgroundColor: c.avatarColor }} className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold">
                {c.nickname[0]}
              </div>
            ))}
            {trip.collaborators.length > 4 && (
              <span className="text-xs text-gray-400">+{trip.collaborators.length - 4}</span>
            )}
          </div>
        )}
      </div>
    </button>
  )
}

export function HomePage() {
  const navigate = useNavigate()
  const { trips } = useTripStore()

  const sorted = [...trips].sort((a, b) => b.startDate.localeCompare(a.startDate))

  return (
    <div className="flex flex-col min-h-full">
      <div className="flex-1 p-4">
        {sorted.length === 0 ? (
          <EmptyState
            emoji="✈️"
            title="첫 여행을 계획해보세요"
            subtitle="일정, 지도, 다이어리를 한 곳에서 관리해요"
            action={{ label: '+ 새 여행 만들기', onClick: () => navigate('/trips/new') }}
          />
        ) : (
          <div className="flex flex-col gap-3">
            {sorted.map(trip => (
              <TripCard key={trip.id} trip={trip} onClick={() => navigate(`/trips/${trip.id}`)} />
            ))}
          </div>
        )}
      </div>

      {sorted.length > 0 && (
        <div className="p-4 pb-2">
          <button
            onClick={() => navigate('/trips/new')}
            className="w-full py-3 rounded-xl border-2 border-dashed border-gray-200 text-sm text-gray-400 font-medium hover:border-[#3182F6] hover:text-[#3182F6] transition-colors"
          >
            + 새 여행 만들기
          </button>
        </div>
      )}
    </div>
  )
}
