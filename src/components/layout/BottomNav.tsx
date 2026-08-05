import { NavLink, useParams } from 'react-router-dom'

const tabs = [
  {
    label: '홈',
    path: (tripId?: string) => tripId ? `/trips/${tripId}` : '/',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M3 9.5L11 3L19 9.5V19H14V14H8V19H3V9.5Z"
          stroke={active ? '#3182F6' : '#9CA3AF'} strokeWidth="1.7" strokeLinejoin="round" fill={active ? '#EFF6FF' : 'none'} />
      </svg>
    ),
  },
  {
    label: '일정',
    path: (tripId?: string) => tripId ? `/trips/${tripId}/schedule` : '/trips/new',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <rect x="3" y="5" width="16" height="14" rx="2" stroke={active ? '#3182F6' : '#9CA3AF'} strokeWidth="1.7" />
        <path d="M7 3V7M15 3V7M3 10H19" stroke={active ? '#3182F6' : '#9CA3AF'} strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: '지도',
    path: (tripId?: string) => tripId ? `/trips/${tripId}/map` : '/',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M3 5.5L8 3L14 5.5L19 3V16.5L14 19L8 16.5L3 19V5.5Z" stroke={active ? '#3182F6' : '#9CA3AF'} strokeWidth="1.7" strokeLinejoin="round" />
        <path d="M8 3V16.5M14 5.5V19" stroke={active ? '#3182F6' : '#9CA3AF'} strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: '다이어리',
    path: (tripId?: string) => tripId ? `/trips/${tripId}/diary` : '/',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <rect x="4" y="3" width="14" height="16" rx="2" stroke={active ? '#3182F6' : '#9CA3AF'} strokeWidth="1.7" />
        <path d="M8 8H14M8 12H12" stroke={active ? '#3182F6' : '#9CA3AF'} strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    ),
  },
]

export function BottomNav() {
  const { tripId } = useParams<{ tripId?: string }>()

  return (
    <nav className="flex bg-white border-t border-gray-100 pb-safe shrink-0">
      {tabs.map(tab => {
        const to = tab.path(tripId)
        return (
          <NavLink
            key={tab.label}
            to={to}
            end={tab.label === '홈'}
            className="flex-1 flex flex-col items-center gap-0.5 py-2.5"
          >
            {({ isActive }) => (
              <>
                {tab.icon(isActive)}
                <span className={`text-[10px] font-medium ${isActive ? 'text-[#3182F6]' : 'text-gray-400'}`}>
                  {tab.label}
                </span>
              </>
            )}
          </NavLink>
        )
      })}
    </nav>
  )
}
