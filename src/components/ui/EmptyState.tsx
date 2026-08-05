import { Button } from './Button'

interface EmptyStateProps {
  emoji?: string
  title: string
  subtitle?: string
  action?: { label: string; onClick: () => void }
}

export function EmptyState({ emoji = '🗺️', title, subtitle, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 px-6 text-center">
      <span className="text-5xl">{emoji}</span>
      <h3 className="font-bold text-gray-800 text-base">{title}</h3>
      {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
      {action && (
        <Button onClick={action.onClick} size="md" className="mt-2">
          {action.label}
        </Button>
      )}
    </div>
  )
}
