import { useState, useEffect } from 'react'
import { fetchEmployees } from '../api'
import type { Employee } from '../types'
import StatusBadge from '../components/StatusBadge'
import Avatar from '../components/Avatar'
import { Input } from '../components/FormField'
import { SkeletonTable } from '../components/Skeleton'
import PageHeader from '../components/PageHeader'
import DataTable from '../components/DataTable'

export default function Employees() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

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

  const columns = [
    {
      key: 'last_name',
      header: 'Name',
      sortable: true,
      render: (emp: Employee) => (
        <div className="flex items-center gap-3">
          <Avatar name={`${emp.first_name} ${emp.last_name}`} imageUrl={emp.avatar_url} size="md" />
          <span className="text-white font-medium">{emp.first_name} {emp.last_name}</span>
        </div>
      ),
    },
    { key: 'email', header: 'Email', sortable: true, render: (emp: Employee) => <span className="text-gray-400">{emp.email}</span> },
    { key: 'department_name', header: 'Department', sortable: true, className: 'hidden md:table-cell', render: (emp: Employee) => <span className="text-gray-400">{emp.department_name || '\u2014'}</span> },
    { key: 'position_title', header: 'Position', sortable: true, className: 'hidden lg:table-cell', render: (emp: Employee) => <span className="text-gray-400">{emp.position_title || '\u2014'}</span> },
    { key: 'status', header: 'Status', render: (emp: Employee) => <StatusBadge status={emp.status} /> },
  ]

  if (loading) {
    return (
      <div>
        <PageHeader title="Employee Directory" subtitle="Manage your workforce" />
        <SkeletonTable rows={8} cols={5} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Employee Directory"
        subtitle="Manage your workforce"
        actions={
          <Input
            type="text"
            placeholder="Search employees..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="max-w-sm"
          />
        }
      />

      <DataTable
        columns={columns}
        data={filtered}
        keyField="id"
        emptyIcon="👥"
        emptyMessage="No employees found"
        striped
      />
    </div>
  )
}
