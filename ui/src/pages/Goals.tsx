import { useState, useEffect } from 'react'
import { fetchGoals } from '../api'
import type { Goal } from '../types'
import StatusBadge from '../components/StatusBadge'
import PageHeader from '../components/PageHeader'
import DataTable from '../components/DataTable'
import { SkeletonCards } from '../components/Skeleton'
export default function Goals() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetchGoals().then(setGoals).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const goalColumns = [
    { key: 'title', header: 'Goal', render: (goal: Goal) => (
      <div>
        <span className="text-white font-medium">{goal.title}</span>
        <p className="text-xs text-gray-500 mt-0.5">{goal.employee_name || '\u2014'}</p>
      </div>
    )},
    { key: 'description', header: 'Description', className: 'hidden md:table-cell', render: (goal: Goal) => <span className="text-gray-400 text-sm">{goal.description || '\u2014'}</span> },
    { key: 'progress', header: 'Progress', render: (goal: Goal) => (
      <div className="flex items-center gap-2">
        <div className="flex-1 bg-gray-800 rounded-full h-2 min-w-[60px]">
          <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${goal.progress}%` }} />
        </div>
        <span className="text-xs text-gray-400 w-8">{goal.progress}%</span>
      </div>
    )},
    { key: 'due_date', header: 'Due', className: 'hidden lg:table-cell', render: (goal: Goal) => <span className="text-gray-500">{goal.due_date || '\u2014'}</span> },
    { key: 'status', header: 'Status', render: (goal: Goal) => <StatusBadge status={goal.status} /> },
  ]

  if (loading) {
    return (
      <div>
        <PageHeader title="Goals" />
        <SkeletonCards count={4} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="Goals" />

      <DataTable
        columns={goalColumns}
        data={goals}
        keyField="id"
        emptyMessage="No goals yet"
        emptyIcon="🎯"
      />
    </div>
  )
}
