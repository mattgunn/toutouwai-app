interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  color?: 'default' | 'green' | 'red' | 'blue'
  onClick?: () => void
  trend?: { direction: 'up' | 'down'; value: string }
}

const borderColorMap = {
  default: 'border-l-gray-600',
  green: 'border-l-emerald-500',
  red: 'border-l-red-500',
  blue: 'border-l-blue-500',
}

const trendColorMap = {
  up: 'text-emerald-400',
  down: 'text-red-400',
}

function TrendArrow({ direction }: { direction: 'up' | 'down' }) {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      {direction === 'up' ? (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
      ) : (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
      )}
    </svg>
  )
}

export default function StatCard({ label, value, sub, color = 'default', onClick, trend }: StatCardProps) {
  return (
    <div
      className={`bg-gray-900 border border-gray-800 border-l-4 ${borderColorMap[color]} rounded-lg p-4 ${
        onClick ? 'cursor-pointer hover:border-gray-600 hover:bg-gray-800/50 transition-colors' : ''
      }`}
      onClick={onClick}
    >
      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <div className="flex items-end gap-2">
        <p className="text-2xl md:text-3xl font-semibold text-white">{value}</p>
        {trend && (
          <span className={`flex items-center gap-0.5 text-xs font-medium pb-1 ${trendColorMap[trend.direction]}`}>
            <TrendArrow direction={trend.direction} />
            {trend.value}
          </span>
        )}
      </div>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  )
}
