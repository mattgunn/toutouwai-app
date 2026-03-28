import Button from './Button'

interface EmptyStateProps {
  message: string
  icon?: React.ReactNode
  subtitle?: string
  action?: string
  onAction?: () => void
}

export default function EmptyState({ message, icon = '📭', subtitle, action, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-16 h-16 rounded-full bg-gray-800/50 flex items-center justify-center mb-4 mx-auto">
        {typeof icon === 'string' ? (
          <span className="text-3xl">{icon}</span>
        ) : (
          icon
        )}
      </div>
      <p className="text-gray-500 text-sm mb-1">{message}</p>
      {subtitle && <p className="text-gray-600 text-xs mb-4">{subtitle}</p>}
      {!subtitle && <div className="mb-3" />}
      {action && onAction && (
        <Button variant="primary" size="sm" onClick={onAction}>
          {action}
        </Button>
      )}
    </div>
  )
}
