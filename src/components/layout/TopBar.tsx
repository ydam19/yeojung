import type { ReactNode } from 'react'

interface TopBarProps {
  title?: string
  right?: ReactNode
}

export function TopBar({ title, right }: TopBarProps) {
  return (
    <div className="flex items-center h-14 px-4 bg-white border-b border-gray-100 shrink-0">
      <div className="w-10" />
      <h1 className="flex-1 text-center font-bold text-gray-900 text-base truncate px-2">{title}</h1>
      <div className="w-10 flex justify-end">{right}</div>
    </div>
  )
}
