import { useState, useEffect } from 'react'
import { fetchAuditLog } from '../modules/audit/api'
import type { AuditEntry } from '../modules/audit/types'
import EmptyState from '../components/EmptyState'
import Button from '../components/Button'
import { Select, Input } from '../components/FormField'
import { SkeletonTable } from '../components/Skeleton'
import { useToast } from '../components/Toast'

const ENTITY_TYPES = ['', 'employee', 'department', 'position', 'leave_request', 'time_entry', 'job_posting', 'applicant', 'review', 'goal']

export default function AuditLog() {
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [entityType, setEntityType] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [loading, setLoading] = useState(true)
  const toast = useToast()

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
    }).catch(() => {
      toast.error('Failed to load audit log')
    }).finally(() => setLoading(false))
  }, [page, entityType, fromDate, toDate])

  const totalPages = Math.ceil(total / perPage)

  function formatDate(iso: string) {
    try {
      return new Date(iso).toLocaleString()
    } catch {
      return iso
    }
  }

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

  return (
    <div>
      <h1 className="text-xl font-bold text-white mb-4">Audit Log</h1>

      <div className="flex flex-wrap gap-3 mb-4">
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
          <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 text-xs uppercase">
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Entity</th>
                  <th className="px-4 py-3 hidden md:table-cell">Field</th>
                  <th className="px-4 py-3 hidden lg:table-cell">Old Value</th>
                  <th className="px-4 py-3 hidden lg:table-cell">New Value</th>
                </tr>
              </thead>
              <tbody>
                {entries.map(entry => (
                  <tr key={entry.id} className="border-t border-gray-800 hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(entry.created_at)}</td>
                    <td className="px-4 py-3 text-white">{entry.user_name || entry.user_email || '\u2014'}</td>
                    <td className="px-4 py-3">{actionBadge(entry.action)}</td>
                    <td className="px-4 py-3 text-gray-400">
                      <span className="capitalize">{entry.entity_type.replace(/_/g, ' ')}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 hidden md:table-cell">{entry.field_name || '\u2014'}</td>
                    <td className="px-4 py-3 text-gray-500 hidden lg:table-cell truncate max-w-32">{entry.old_value || '\u2014'}</td>
                    <td className="px-4 py-3 text-gray-400 hidden lg:table-cell truncate max-w-32">{entry.new_value || '\u2014'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

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
    </div>
  )
}
