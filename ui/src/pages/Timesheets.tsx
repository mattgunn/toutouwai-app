import { useState, useEffect } from 'react'
import { fetchTimeEntries } from '../api'
import type { TimeEntry } from '../types'
import { SkeletonTable } from '../components/Skeleton'
import PageHeader from '../components/PageHeader'
import DataTable from '../components/DataTable'

export default function Timesheets() {
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTimeEntries()
      .then(setEntries)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const columns = [
    { key: 'employee_name', header: 'Employee', render: (entry: TimeEntry) => <span className="text-white">{entry.employee_name || '\u2014'}</span> },
    { key: 'date', header: 'Date', render: (entry: TimeEntry) => <span className="text-gray-400">{entry.date}</span> },
    { key: 'hours', header: 'Hours', render: (entry: TimeEntry) => <span className="text-white font-medium">{entry.hours}h</span> },
    { key: 'project', header: 'Project', className: 'hidden md:table-cell', render: (entry: TimeEntry) => <span className="text-gray-400">{entry.project || '\u2014'}</span> },
    { key: 'description', header: 'Description', className: 'hidden lg:table-cell', render: (entry: TimeEntry) => <span className="text-gray-400 truncate max-w-xs block">{entry.description || '\u2014'}</span> },
  ]

  if (loading) {
    return (
      <div>
        <PageHeader title="Timesheets" />
        <SkeletonTable rows={5} cols={5} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="Timesheets" />

      <DataTable
        columns={columns}
        data={entries}
        keyField="id"
        emptyIcon="⏱"
        emptyMessage="No time entries yet"
        striped
      />
    </div>
  )
}
