import { useState, useEffect } from 'react'
import { fetchDepartments } from '../api'
import type { Department } from '../types'
import EmptyState from '../components/EmptyState'
import { SkeletonCards } from '../components/Skeleton'
import PageHeader from '../components/PageHeader'

export default function Departments() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDepartments()
      .then(setDepartments)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div>
        <PageHeader title="Departments" />
        <SkeletonCards count={6} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="Departments" />

      {departments.length === 0 ? (
        <EmptyState message="No departments yet" icon="🏢" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {departments.map(dept => (
            <div key={dept.id} className="bg-gray-900 border border-gray-800 rounded-lg p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
              <h3 className="text-white font-semibold mb-1">{dept.name}</h3>
              {dept.description && (
                <p className="text-gray-400 text-sm mb-2">{dept.description}</p>
              )}
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span>{dept.employee_count} employee{dept.employee_count !== 1 ? 's' : ''}</span>
                {dept.head_name && <span>Head: {dept.head_name}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
