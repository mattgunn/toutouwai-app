import { useState, useEffect } from 'react'
import { fetchEmployees } from '../api'
import type { Employee } from '../types'
import StatusBadge from '../components/StatusBadge'
import SortableHeader, { compareValues, nextSort } from '../components/SortableHeader'
import EmptyState from '../components/EmptyState'
import Avatar from '../components/Avatar'
import { Input } from '../components/FormField'
import { SkeletonTable } from '../components/Skeleton'
export default function Employees() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null)

  useEffect(() => {
    fetchEmployees()
      .then(r => setEmployees(r.employees))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = employees.filter(e => {
    const term = search.toLowerCase()
    return (
      `${e.first_name} ${e.last_name}`.toLowerCase().includes(term) ||
      e.email.toLowerCase().includes(term) ||
      (e.department_name || '').toLowerCase().includes(term)
    )
  })

  const sorted = sort
    ? [...filtered].sort((a, b) => compareValues((a as unknown as Record<string, unknown>)[sort.key], (b as unknown as Record<string, unknown>)[sort.key], sort.dir))
    : filtered

  const handleSort = (key: string) => setSort(nextSort(sort, key))

  if (loading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-white">Employee Directory</h1>
        </div>
        <SkeletonTable rows={8} cols={5} />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-white">Employee Directory</h1>
      </div>

      <div className="mb-4">
        <Input
          type="text"
          placeholder="Search employees..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {sorted.length === 0 ? (
        <EmptyState message="No employees found" icon="👥" />
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 text-xs uppercase">
                <SortableHeader label="Name" sortKey="last_name" currentSort={sort} onSort={handleSort} className="px-4 py-3" />
                <SortableHeader label="Email" sortKey="email" currentSort={sort} onSort={handleSort} className="px-4 py-3" />
                <SortableHeader label="Department" sortKey="department_name" currentSort={sort} onSort={handleSort} className="px-4 py-3 hidden md:table-cell" />
                <SortableHeader label="Position" sortKey="position_title" currentSort={sort} onSort={handleSort} className="px-4 py-3 hidden lg:table-cell" />
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(emp => (
                <tr key={emp.id} className="border-t border-gray-800 hover:bg-gray-800/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={`${emp.first_name} ${emp.last_name}`} imageUrl={emp.avatar_url} size="md" />
                      <span className="text-white font-medium">{emp.first_name} {emp.last_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{emp.email}</td>
                  <td className="px-4 py-3 text-gray-400 hidden md:table-cell">{emp.department_name || '\u2014'}</td>
                  <td className="px-4 py-3 text-gray-400 hidden lg:table-cell">{emp.position_title || '\u2014'}</td>
                  <td className="px-4 py-3"><StatusBadge status={emp.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
