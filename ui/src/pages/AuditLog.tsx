import { useState, useEffect } from 'react'
import { formatDate } from '../utils/format'
import { fetchAuditLog } from '../modules/audit/api'
import type { AuditEntry } from '../modules/audit/types'
import EmptyState from '../components/EmptyState'
import Button from '../components/Button'
import Modal from '../components/Modal'
import { Select, Input } from '../components/FormField'
import { SkeletonTable } from '../components/Skeleton'
import PageHeader from '../components/PageHeader'
import DataTable from '../components/DataTable'
import EmployeeLink from '../components/EmployeeLink'
import { useToast } from '../components/Toast'
const ENTITY_TYPES = ['', 'employee', 'department', 'position', 'leave_request', 'time_entry', 'job_posting', 'applicant', 'review', 'goal']

export default function AuditLog() {
  const toast = useToast()
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [entityType, setEntityType] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedEntry, setSelectedEntry] = useState<AuditEntry | null>(null)

  const perPage = 50

  useEffect(() => {
    setLoading(true)
    const params: Record<string, string> = { page: String(page), per_page: String(perPage) }
    if (entityType) params.entity_type = entityType
    if (fromDate) params.from = fromDate
    if (toDate) params.to = toDate
    fetchAuditLog(params).then(r => {
      setEntries(r.entries)
      setTotal(r.total)
    }).catch(() => toast.error('Failed to load audit log')).finally(() => setLoading(false))
  }, [page, entityType, fromDate, toDate])

  const totalPages = Math.ceil(total / perPage)

  function actionBadge(action: string) {
    const colors: Record<string, string> = {
      create: 'bg-emerald-600/20 text-emerald-400',
      update: 'bg-blue-600/20 text-blue-400',
      delete: 'bg-red-600/20 text-red-400',
    }
    return (
      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${colors[action] || 'bg-gray-700 text-gray-300'}`}>
        {action}
      </span>
    )
  }

  const exportCSV = () => {
    if (entries.length === 0) return
    const headers = ['Timestamp', 'User', 'Email', 'Action', 'Entity Type', 'Entity ID', 'Field', 'Old Value', 'New Value']
    const rows = entries.map(e => [
      e.created_at,
      e.user_name || '',
      e.user_email || '',
      e.action,
      e.entity_type,
      e.entity_id,
      e.field_name || '',
      e.old_value || '',
      e.new_value || '',
    ])
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <PageHeader
        title="Audit Log"
        actions={
          entries.length > 0 ? (
            <Button variant="secondary" onClick={exportCSV}>
              Export CSV
            </Button>
          ) : undefined
        }
      />

      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-4 flex flex-wrap gap-3">
        <Select
          value={entityType}
          onChange={e => { setEntityType(e.target.value); setPage(1) }}
          options={ENTITY_TYPES.filter(Boolean).map(t => ({ value: t, label: t.replace(/_/g, ' ') }))}
          placeholder="All entity types"
        />
        <Input
          type="date"
          value={fromDate}
          onChange={e => { setFromDate(e.target.value); setPage(1) }}
          placeholder="From date"
          className="w-auto"
        />
        <Input
          type="date"
          value={toDate}
          onChange={e => { setToDate(e.target.value); setPage(1) }}
          placeholder="To date"
          className="w-auto"
        />
      </div>

      {loading ? (
        <SkeletonTable rows={8} cols={7} />
      ) : entries.length === 0 ? (
        <EmptyState icon="📜" message="No audit entries found" />
      ) : (
        <>
          <DataTable
            columns={[
              { key: 'created_at', header: 'Timestamp', render: (row: AuditEntry) => <span className="text-gray-400 text-xs">{formatDate(row.created_at)}</span> },
              { key: 'user_name', header: 'User', render: (row: AuditEntry) => row.user_id ? <EmployeeLink employeeId={row.user_id} name={row.user_name || row.user_email || 'Unknown'} /> : <span className="text-white">{row.user_name || row.user_email || '\u2014'}</span> },
              { key: 'action', header: 'Action', render: (row: AuditEntry) => actionBadge(row.action) },
              { key: 'entity_type', header: 'Entity', render: (row: AuditEntry) => <span className="text-gray-400 capitalize">{(row.entity_type || '').replace(/_/g, ' ')}</span> },
              { key: 'field_name', header: 'Field', render: (row: AuditEntry) => <span className="text-gray-400">{row.field_name || '\u2014'}</span>, className: 'hidden md:table-cell' },
              { key: 'old_value', header: 'Old Value', render: (row: AuditEntry) => <span className="text-gray-500 truncate max-w-32 block">{row.old_value || '\u2014'}</span>, className: 'hidden lg:table-cell' },
              { key: 'new_value', header: 'New Value', render: (row: AuditEntry) => <span className="text-gray-400 truncate max-w-32 block">{row.new_value || '\u2014'}</span>, className: 'hidden lg:table-cell' },
            ]}
            data={entries}
            keyField="id"
            onRowClick={(entry) => setSelectedEntry(entry)}
            striped={false}
          />

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-xs text-gray-500">{total} total entries</p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  Previous
                </Button>
                <span className="px-3 py-1 text-xs text-gray-400">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Detail modal */}
      <Modal
        open={!!selectedEntry}
        onClose={() => setSelectedEntry(null)}
        title="Audit Entry Details"
        size="md"
      >
        {selectedEntry && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Timestamp</p>
                <p className="text-sm text-white">{formatDate(selectedEntry.created_at)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">User</p>
                <p className="text-sm">{selectedEntry.user_id ? <EmployeeLink employeeId={selectedEntry.user_id} name={selectedEntry.user_name || selectedEntry.user_email || 'Unknown'} /> : <span className="text-white">{selectedEntry.user_name || selectedEntry.user_email || '\u2014'}</span>}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Action</p>
                {actionBadge(selectedEntry.action)}
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Entity Type</p>
                <p className="text-sm text-white capitalize">{(selectedEntry.entity_type || '').replace(/_/g, ' ')}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Entity ID</p>
                <p className="text-sm text-gray-300 font-mono text-xs break-all">{selectedEntry.entity_id}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Field</p>
                <p className="text-sm text-white">{selectedEntry.field_name || '\u2014'}</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Old Value</p>
              <div className="bg-gray-800 border border-gray-700 rounded p-3">
                <p className="text-sm text-red-400 font-mono whitespace-pre-wrap break-all">{selectedEntry.old_value || '\u2014'}</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">New Value</p>
              <div className="bg-gray-800 border border-gray-700 rounded p-3">
                <p className="text-sm text-emerald-400 font-mono whitespace-pre-wrap break-all">{selectedEntry.new_value || '\u2014'}</p>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
