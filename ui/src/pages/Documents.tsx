import { useState, useEffect } from 'react'
import { fetchDocuments, createDocument, deleteDocument, fetchExpiringDocuments } from '../modules/documents/api'
import { fetchEmployees } from '../api'
import type { Document } from '../modules/documents/types'
import type { Employee } from '../types'
import EmptyState from '../components/EmptyState'

const CATEGORIES = [
  { value: '', label: 'All Categories' },
  { value: 'general', label: 'General' },
  { value: 'contract', label: 'Contract' },
  { value: 'id', label: 'ID' },
  { value: 'certification', label: 'Certification' },
  { value: 'policy', label: 'Policy' },
  { value: 'performance', label: 'Performance' },
  { value: 'other', label: 'Other' },
]

const categoryColors: Record<string, string> = {
  general: 'bg-gray-600/20 text-gray-400',
  contract: 'bg-blue-600/20 text-blue-400',
  id: 'bg-purple-600/20 text-purple-400',
  certification: 'bg-emerald-600/20 text-emerald-400',
  policy: 'bg-amber-600/20 text-amber-400',
  performance: 'bg-cyan-600/20 text-cyan-400',
  other: 'bg-gray-600/20 text-gray-400',
}

function CategoryBadge({ category }: { category: string }) {
  const classes = categoryColors[category] || 'bg-gray-700 text-gray-300'
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${classes}`}>
      {category}
    </span>
  )
}

function isExpiringSoon(date: string | null, days = 30): boolean {
  if (!date) return false
  const expiry = new Date(date)
  const threshold = new Date()
  threshold.setDate(threshold.getDate() + days)
  return expiry <= threshold
}

function isExpired(date: string | null): boolean {
  if (!date) return false
  return new Date(date) < new Date()
}

export default function Documents() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [filterCategory, setFilterCategory] = useState('')
  const [filterEmployee, setFilterEmployee] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [expiringDocs, setExpiringDocs] = useState<Document[]>([])

  useEffect(() => {
    loadDocuments()
    fetchEmployees().then(r => setEmployees(r.employees)).catch(() => {})
    fetchExpiringDocuments(30).then(setExpiringDocs).catch(() => {})
  }, [])

  const loadDocuments = () => {
    const params: Record<string, string> = {}
    if (filterCategory) params.category = filterCategory
    if (filterEmployee) params.employee_id = filterEmployee
    fetchDocuments(params).then(setDocuments).catch(() => {})
  }

  useEffect(() => {
    loadDocuments()
  }, [filterCategory, filterEmployee])

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const doc = await createDocument({
      name: fd.get('name'),
      employee_id: fd.get('employee_id') || null,
      category: fd.get('category') || 'general',
      description: fd.get('description') || null,
      expiry_date: fd.get('expiry_date') || null,
    })
    setDocuments(prev => [doc, ...prev])
    setShowForm(false)
  }

  const handleDelete = async (id: string) => {
    await deleteDocument(id)
    setDocuments(prev => prev.filter(d => d.id !== id))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-white">Documents</h1>
        <button
          onClick={() => setShowForm(true)}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
        >
          Add Document
        </button>
      </div>

      {/* Expiring documents warning */}
      {expiringDocs.length > 0 && (
        <div className="bg-amber-600/10 border border-amber-600/30 rounded-lg p-3 mb-4">
          <p className="text-sm text-amber-400 font-medium mb-1">
            {expiringDocs.length} document{expiringDocs.length !== 1 ? 's' : ''} expiring within 30 days
          </p>
          <div className="text-xs text-amber-400/70">
            {expiringDocs.slice(0, 3).map(d => (
              <span key={d.id} className="mr-3">{d.name} ({d.expiry_date})</span>
            ))}
            {expiringDocs.length > 3 && <span>and {expiringDocs.length - 3} more...</span>}
          </div>
        </div>
      )}

      {showForm && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-4">
          <h3 className="text-sm font-semibold text-white mb-3">Add Document Record</h3>
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Name</label>
              <input name="name" required className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-500" placeholder="Document name" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Employee</label>
              <select name="employee_id" className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white">
                <option value="">Company-wide</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Category</label>
              <select name="category" className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white">
                {CATEGORIES.filter(c => c.value).map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Expiry Date</label>
              <input name="expiry_date" type="date" className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-gray-500 mb-1">Description</label>
              <input name="description" className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-500" placeholder="Optional description" />
            </div>
            <div className="md:col-span-2 flex gap-2">
              <button type="submit" className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors">Add</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition-colors">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white"
        >
          {CATEGORIES.map(c => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
        <select
          value={filterEmployee}
          onChange={e => setFilterEmployee(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white"
        >
          <option value="">All Employees</option>
          {employees.map(emp => (
            <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</option>
          ))}
        </select>
      </div>

      {documents.length === 0 ? (
        <EmptyState message="No documents found" />
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 text-xs uppercase">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3 hidden md:table-cell">Category</th>
                <th className="px-4 py-3 hidden lg:table-cell">Uploaded By</th>
                <th className="px-4 py-3">Expiry</th>
                <th className="px-4 py-3 w-16"></th>
              </tr>
            </thead>
            <tbody>
              {documents.map(doc => (
                <tr key={doc.id} className="border-t border-gray-800 hover:bg-gray-800/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="text-white font-medium">{doc.name}</div>
                    {doc.description && <div className="text-xs text-gray-500">{doc.description}</div>}
                  </td>
                  <td className="px-4 py-3 text-gray-400">{doc.employee_name || 'Company'}</td>
                  <td className="px-4 py-3 hidden md:table-cell"><CategoryBadge category={doc.category} /></td>
                  <td className="px-4 py-3 text-gray-400 hidden lg:table-cell">{doc.uploaded_by_name || '\u2014'}</td>
                  <td className="px-4 py-3">
                    {doc.expiry_date ? (
                      <span className={`text-sm ${isExpired(doc.expiry_date) ? 'text-red-400' : isExpiringSoon(doc.expiry_date) ? 'text-amber-400' : 'text-gray-400'}`}>
                        {doc.expiry_date}
                      </span>
                    ) : (
                      <span className="text-gray-600">{'\u2014'}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="text-xs text-gray-500 hover:text-red-400 transition-colors"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
