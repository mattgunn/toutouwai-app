import { useState, useEffect } from 'react'
import { fetchAuditLog } from '../modules/audit/api'
import type { AuditEntry } from '../modules/audit/types'
import EmptyState from '../components/EmptyState'

const ENTITY_TYPES = ['', 'employee', 'department', 'position', 'leave_request', 'time_entry', 'job_posting', 'applicant', 'review', 'goal']

export default function AuditLog() {
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [entityType, setEntityType] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const perPage = 50

  useEffect(() => {
    const params: Record<string, string> = { page: String(page), per_page: String(perPage) }
    if (entityType) params.entity_type = entityType
    if (fromDate) params.from = fromDate
    if (toDate) params.to = toDate
    fetchAuditLog(params).then(r => {
      setEntries(r.entries)
      setTotal(r.total)
    }).catch(() => {})
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
        <select
          value={entityType}
          onChange={e => { setEntityType(e.target.value); setPage(1) }}
          className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white"
        >
          <option value="">All entity types</option>
          {ENTITY_TYPES.filter(Boolean).map(t => (
            <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
          ))}
        </select>

        <input
          type="date"
          value={fromDate}
          onChange={e => { setFromDate(e.target.value); setPage(1) }}
          className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white"
          placeholder="From date"
        />
        <input
          type="date"
          value={toDate}
          onChange={e => { setToDate(e.target.value); setPage(1) }}
          className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white"
          placeholder="To date"
        />
      </div>

      {entries.length === 0 ? (
        <EmptyState message="No audit entries found" />
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
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1 text-xs bg-gray-800 border border-gray-700 rounded text-gray-400 hover:text-white disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="px-3 py-1 text-xs text-gray-400">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1 text-xs bg-gray-800 border border-gray-700 rounded text-gray-400 hover:text-white disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
