interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  color?: 'default' | 'green' | 'red' | 'blue'
  onClick?: () => void
}

const colorMap = {
  default: 'text-white',
  green: 'text-emerald-400',
  red: 'text-red-400',
  blue: 'text-blue-400',
}

export default function StatCard({ label, value, sub, color = 'default', onClick }: StatCardProps) {
  return (
    <div
      className={`bg-gray-900 border border-gray-800 rounded-lg p-4 ${onClick ? 'cursor-pointer hover:border-gray-600 hover:bg-gray-800/50 transition-colors' : ''}`}
      onClick={onClick}
    >
      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-xl md:text-2xl font-semibold ${colorMap[color]}`}>{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  )
}
