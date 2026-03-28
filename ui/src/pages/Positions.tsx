import { useState, useEffect } from 'react'
import { fetchPositions } from '../api'
import type { Position } from '../types'
import EmptyState from '../components/EmptyState'
import { SkeletonTable } from '../components/Skeleton'
import { useToast } from '../components/Toast'

export default function Positions() {
  const [positions, setPositions] = useState<Position[]>([])
  const [loading, setLoading] = useState(true)
  const toast = useToast()

  useEffect(() => {
    fetchPositions()
      .then(setPositions)
      .catch(() => toast.error('Failed to load positions'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-white">Positions</h1>
        </div>
        <SkeletonTable rows={6} cols={4} />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-white">Positions</h1>
      </div>

      {positions.length === 0 ? (
        <EmptyState message="No positions yet" icon="💼" />
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 text-xs uppercase">
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3 hidden md:table-cell">Department</th>
                <th className="px-4 py-3 hidden lg:table-cell">Level</th>
                <th className="px-4 py-3">Employees</th>
              </tr>
            </thead>
            <tbody>
              {positions.map(pos => (
                <tr key={pos.id} className="border-t border-gray-800 hover:bg-gray-800/50 transition-colors">
                  <td className="px-4 py-3 text-white font-medium">{pos.title}</td>
                  <td className="px-4 py-3 text-gray-400 hidden md:table-cell">{pos.department_name || '\u2014'}</td>
                  <td className="px-4 py-3 text-gray-400 hidden lg:table-cell">{pos.level || '\u2014'}</td>
                  <td className="px-4 py-3 text-gray-400">{pos.employee_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
