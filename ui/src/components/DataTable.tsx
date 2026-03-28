import { useState, useMemo } from 'react'
import SortableHeader, { compareValues, nextSort } from './SortableHeader'
import { SkeletonTable } from './Skeleton'
import EmptyState from './EmptyState'

interface Column<T> {
  key: string
  header: string
  render?: (row: T) => React.ReactNode
  sortable?: boolean
  className?: string
  align?: 'left' | 'right' | 'center'
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyField?: string
  onRowClick?: (row: T) => void
  emptyIcon?: React.ReactNode
  emptyMessage?: string
  emptyAction?: string
  onEmptyAction?: () => void
  striped?: boolean
  loading?: boolean
}

const alignClass = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
}

export default function DataTable<T>({
  columns,
  data,
  keyField = 'id',
  onRowClick,
  emptyIcon,
  emptyMessage = 'No data found',
  emptyAction,
  onEmptyAction,
  striped = true,
  loading = false,
}: DataTableProps<T>) {
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null)

  const asRec = (row: T) => row as Record<string, unknown>

  const sortedData = useMemo(() => {
    if (!sort) return data
    return [...data].sort((a, b) =>
      compareValues(asRec(a)[sort.key], asRec(b)[sort.key], sort.dir),
    )
  }, [data, sort])

  if (loading) {
    return <SkeletonTable cols={columns.length} />
  }

  if (data.length === 0) {
    return (
      <EmptyState
        message={emptyMessage}
        icon={emptyIcon}
        action={emptyAction}
        onAction={onEmptyAction}
      />
    )
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500 text-xs uppercase tracking-wider">
            {columns.map((col) => {
              const align = alignClass[col.align ?? 'left']
              if (col.sortable && !col.render) {
                return (
                  <SortableHeader
                    key={col.key}
                    label={col.header}
                    sortKey={col.key}
                    currentSort={sort}
                    onSort={(key) => setSort(nextSort(sort, key))}
                    className={`px-4 py-3 text-xs uppercase tracking-wider ${align} ${col.className ?? ''}`}
                  />
                )
              }
              return (
                <th
                  key={col.key}
                  className={`px-4 py-3 ${align} ${col.className ?? ''}`}
                >
                  {col.header}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {sortedData.map((row, rowIdx) => (
            <tr
              key={String(asRec(row)[keyField] ?? rowIdx)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={`border-t border-gray-800 hover:bg-gray-800/50 transition-colors${
                onRowClick ? ' cursor-pointer' : ''
              }${striped && rowIdx % 2 === 1 ? ' bg-gray-900/60' : ''}`}
            >
              {columns.map((col) => {
                const align = alignClass[col.align ?? 'left']
                return (
                  <td
                    key={col.key}
                    className={`px-4 py-3 ${align} ${col.className ?? ''}`}
                  >
                    {col.render ? col.render(row) : String(asRec(row)[col.key] ?? '')}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
