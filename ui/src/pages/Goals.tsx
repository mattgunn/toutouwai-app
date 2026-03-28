import { useState, useEffect } from 'react'
import { fetchGoals } from '../api'
import type { Goal } from '../types'
import StatusBadge from '../components/StatusBadge'
import EmptyState from '../components/EmptyState'
import { SkeletonCards } from '../components/Skeleton'
import { useToast } from '../components/Toast'

export default function Goals() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const toast = useToast()

  useEffect(() => {
    setLoading(true)
    fetchGoals().then(setGoals).catch(() => {
      toast.error('Failed to load goals')
    }).finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-white">Goals</h1>
        </div>
        <SkeletonCards count={4} />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-white">Goals</h1>
      </div>

      {goals.length === 0 ? (
        <EmptyState icon="🎯" message="No goals yet" />
      ) : (
        <div className="space-y-3">
          {goals.map(goal => (
            <div key={goal.id} className="bg-gray-900 border border-gray-800 rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-white font-medium">{goal.title}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{goal.employee_name}</p>
                </div>
                <StatusBadge status={goal.status} />
              </div>
              {goal.description && (
                <p className="text-gray-400 text-sm mb-3">{goal.description}</p>
              )}
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-gray-800 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${goal.progress}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 shrink-0">{goal.progress}%</span>
                {goal.due_date && (
                  <span className="text-xs text-gray-500 shrink-0">Due: {goal.due_date}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
