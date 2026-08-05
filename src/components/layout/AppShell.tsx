import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'

interface AppShellProps {
  showBottomNav?: boolean
}

export function AppShell({ showBottomNav = true }: AppShellProps) {
  return (
    <div className="flex flex-col h-full max-w-md mx-auto bg-[#F9FAFB]">
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
      {showBottomNav && <BottomNav />}
    </div>
  )
}
