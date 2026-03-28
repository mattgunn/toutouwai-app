import { useState, useEffect } from 'react'
import { fetchDocuments, createDocument, deleteDocument, fetchExpiringDocuments } from '../modules/documents/api'
import { fetchEmployees } from '../api'
import type { Document } from '../modules/documents/types'
import type { Employee } from '../types'
import EmptyState from '../components/EmptyState'
import Modal from '../components/Modal'
import Button from '../components/Button'
import { FormField, Input, Select } from '../components/FormField'
import { SkeletonTable } from '../components/Skeleton'
import ConfirmDialog from '../components/ConfirmDialog'
import { useToast } from '../components/Toast'

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
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const toast = useToast()

  useEffect(() => {
    setLoading(true)
    Promise.all([
      loadDocuments(),
      fetchEmployees().then(r => setEmployees(r.employees)),
      fetchExpiringDocuments(30).then(setExpiringDocs),
    ]).catch(() => {
      toast.error('Failed to load documents')
    }).finally(() => setLoading(false))
  }, [])

  const loadDocuments = () => {
    const params: Record<string, string> = {}
    if (filterCategory) params.category = filterCategory
    if (filterEmployee) params.employee_id = filterEmployee
    return fetchDocuments(params).then(setDocuments)
  }

  useEffect(() => {
    loadDocuments().catch(() => {
      toast.error('Failed to filter documents')
    })
  }, [filterCategory, filterEmployee])

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitting(true)
    try {
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
      toast.success('Document added')
    } catch {
      toast.error('Failed to add document')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      await deleteDocument(deleteId)
      setDocuments(prev => prev.filter(d => d.id !== deleteId))
      toast.success('Document deleted')
    } catch {
      toast.error('Failed to delete document')
    } finally {
      setDeleting(false)
      setDeleteId(null)
    }
  }

  if (loading) {
    return (
      <div>
        <h1 className="text-xl font-bold text-white mb-4">Documents</h1>
        <SkeletonTable rows={5} cols={5} />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-white">Documents</h1>
        <Button onClick={() => setShowForm(true)}>
          Add Document
        </Button>
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

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title="Add Document Record"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowForm(false)} disabled={submitting}>Cancel</Button>
            <Button type="submit" form="doc-form" loading={submitting}>Add</Button>
          </>
        }
      >
        <form id="doc-form" onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Name" required>
            <Input name="name" required placeholder="Document name" />
          </FormField>
          <FormField label="Employee">
            <Select
              name="employee_id"
              placeholder="Company-wide"
              options={employees.map(emp => ({ value: emp.id, label: `${emp.first_name} ${emp.last_name}` }))}
            />
          </FormField>
          <FormField label="Category">
            <Select
              name="category"
              options={CATEGORIES.filter(c => c.value).map(c => ({ value: c.value, label: c.label }))}
            />
          </FormField>
          <FormField label="Expiry Date">
            <Input name="expiry_date" type="date" />
          </FormField>
          <FormField label="Description" className="md:col-span-2">
            <Input name="description" placeholder="Optional description" />
          </FormField>
        </form>
      </Modal>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <Select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          options={CATEGORIES.map(c => ({ value: c.value, label: c.label }))}
        />
        <Select
          value={filterEmployee}
          onChange={e => setFilterEmployee(e.target.value)}
          placeholder="All Employees"
          options={employees.map(emp => ({ value: emp.id, label: `${emp.first_name} ${emp.last_name}` }))}
        />
      </div>

      {documents.length === 0 ? (
        <EmptyState
          icon="📄"
          message="No documents found"
          action="Add Document"
          onAction={() => setShowForm(true)}
        />
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
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteId(doc.id)}
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Document"
        message="Are you sure you want to delete this document? This action cannot be undone."
        confirmLabel="Delete"
        loading={deleting}
      />
    </div>
  )
}
