import { useState, useEffect } from 'react'
import { fetchDepartments } from '../api'
import type { Department } from '../types'
import EmptyState from '../components/EmptyState'

export default function Departments() {
  const [departments, setDepartments] = useState<Department[]>([])

  useEffect(() => {
    fetchDepartments().then(setDepartments).catch(() => {})
  }, [])

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-white">Departments</h1>
      </div>

      {departments.length === 0 ? (
        <EmptyState message="No departments yet" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {departments.map(dept => (
            <div key={dept.id} className="bg-gray-900 border border-gray-800 rounded-lg p-4">
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
