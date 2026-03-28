import { useState, useEffect } from 'react'
import { fetchPositions } from '../api'
import type { Position } from '../types'
import { SkeletonTable } from '../components/Skeleton'
import PageHeader from '../components/PageHeader'
import DataTable from '../components/DataTable'

export default function Positions() {
  const [positions, setPositions] = useState<Position[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPositions()
      .then(setPositions)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const columns = [
    { key: 'title', header: 'Title', render: (pos: Position) => <span className="text-white font-medium">{pos.title}</span> },
    { key: 'department_name', header: 'Department', className: 'hidden md:table-cell', render: (pos: Position) => <span className="text-gray-400">{pos.department_name || '\u2014'}</span> },
    { key: 'level', header: 'Level', className: 'hidden lg:table-cell', render: (pos: Position) => <span className="text-gray-400">{pos.level || '\u2014'}</span> },
    { key: 'employee_count', header: 'Employees', render: (pos: Position) => <span className="text-gray-400">{pos.employee_count}</span> },
  ]

  if (loading) {
    return (
      <div>
        <PageHeader title="Positions" />
        <SkeletonTable rows={6} cols={4} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="Positions" />

      <DataTable
        columns={columns}
        data={positions}
        keyField="id"
        emptyIcon="💼"
        emptyMessage="No positions yet"
        striped
      />
    </div>
  )
}
