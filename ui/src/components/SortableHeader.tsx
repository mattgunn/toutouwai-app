interface SortableHeaderProps {
  label: string
  sortKey: string
  currentSort: { key: string; dir: 'asc' | 'desc' } | null
  onSort: (key: string) => void
  className?: string
}

export default function SortableHeader({ label, sortKey, currentSort, onSort, className = '' }: SortableHeaderProps) {
  const isActive = currentSort?.key === sortKey
  const dir = isActive ? currentSort.dir : null

  return (
    <th
      className={`${className} cursor-pointer select-none hover:text-gray-300 transition-colors group/sort`}
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <svg
          className={`w-3 h-3 flex-shrink-0 transition-colors ${
            isActive ? 'text-blue-400' : 'text-gray-700 group-hover/sort:text-gray-500'
          }`}
          fill="currentColor" viewBox="0 0 16 16"
        >
          {dir === 'desc' ? (
            <path d="M8 11L3 5h10L8 11z" />
          ) : (
            <path d="M8 5l5 6H3l5-6z" />
          )}
        </svg>
      </span>
    </th>
  )
}

export function compareValues(a: unknown, b: unknown, dir: 'asc' | 'desc'): number {
  const mult = dir === 'asc' ? 1 : -1

  const aEmpty = a === null || a === undefined || a === ''
  const bEmpty = b === null || b === undefined || b === ''
  if (aEmpty && bEmpty) return 0
  if (aEmpty) return 1
  if (bEmpty) return -1

  if (typeof a === 'number' && typeof b === 'number') {
    return (a - b) * mult
  }

  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' }) * mult
}

export function nextSort(
  current: { key: string; dir: 'asc' | 'desc' } | null,
  key: string,
): { key: string; dir: 'asc' | 'desc' } | null {
  if (!current || current.key !== key) return { key, dir: 'asc' }
  if (current.dir === 'asc') return { key, dir: 'desc' }
  return null
}
