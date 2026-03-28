import Button from './Button'

interface EmptyStateProps {
  message: string
  icon?: string
  action?: string
  onAction?: () => void
}

export default function EmptyState({ message, icon = '📭', action, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <span className="text-4xl mb-3">{icon}</span>
      <p className="text-gray-500 text-sm mb-4">{message}</p>
      {action && onAction && (
        <Button variant="primary" size="sm" onClick={onAction}>
          {action}
        </Button>
      )}
    </div>
  )
}
