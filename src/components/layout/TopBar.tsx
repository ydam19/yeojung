import { useNavigate } from 'react-router-dom'
import type { ReactNode } from 'react'

interface TopBarProps {
  title?: string
  showBack?: boolean
  right?: ReactNode
  onBack?: () => void
}

export function TopBar({ title, showBack = true, right, onBack }: TopBarProps) {
  const navigate = useNavigate()

  function handleBack() {
    if (onBack) onBack()
    else navigate(-1)
  }

  return (
    <div className="flex items-center h-14 px-4 bg-white border-b border-gray-100 shrink-0">
      {showBack ? (
        <button onClick={handleBack} className="w-10 h-10 -ml-2 flex items-center justify-center text-gray-700 hover:bg-gray-100 rounded-xl">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      ) : (
        <div className="w-10" />
      )}
      <h1 className="flex-1 text-center font-bold text-gray-900 text-base truncate px-2">{title}</h1>
      <div className="w-10 flex justify-end">{right}</div>
    </div>
  )
}
