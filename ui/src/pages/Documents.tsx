import { useState, useEffect } from 'react'
import { formatDate } from '../utils/format'
import { fetchDocuments, createDocument, updateDocument, deleteDocument, fetchExpiringDocuments } from '../modules/documents/api'
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
import PageHeader from '../components/PageHeader'
import DataTable from '../components/DataTable'
import EmployeeLink from '../components/EmployeeLink'

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

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '\u2014'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
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
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null)
  const [editingDoc, setEditingDoc] = useState(false)
  const [editSubmitting, setEditSubmitting] = useState(false)
  const toast = useToast()

  useEffect(() => {
    setLoading(true)
    Promise.all([
      loadDocuments(),
      fetchEmployees().then(r => setEmployees(r.employees)).catch(() => {}),
      fetchExpiringDocuments(30).then(setExpiringDocs).catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [])

  const loadDocuments = () => {
    const params: Record<string, string> = {}
    if (filterCategory) params.category = filterCategory
    if (filterEmployee) params.employee_id = filterEmployee
    return fetchDocuments(params).then(setDocuments)
  }

  useEffect(() => {
    loadDocuments().catch(() => {})
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
      if (selectedDoc?.id === deleteId) setSelectedDoc(null)
      toast.success('Document deleted')
    } catch {
      toast.error('Failed to delete document')
    } finally {
      setDeleting(false)
      setDeleteId(null)
    }
  }

  const handleEditDoc = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selectedDoc) return
    setEditSubmitting(true)
    try {
      const fd = new FormData(e.currentTarget)
      const updated = await updateDocument(selectedDoc.id, {
        name: fd.get('name'),
        category: fd.get('category') || 'general',
        expiry_date: fd.get('expiry_date') || null,
        description: fd.get('description') || null,
      })
      setDocuments(prev => prev.map(d => d.id === updated.id ? { ...d, ...updated } : d))
      setSelectedDoc(null)
      setEditingDoc(false)
      toast.success('Document updated')
      fetchExpiringDocuments(30).then(setExpiringDocs).catch(() => {})
    } catch {
      toast.error('Failed to update document')
    } finally {
      setEditSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div>
        <PageHeader title="Documents" />
        <SkeletonTable rows={5} cols={5} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Documents"
        actions={
          <Button onClick={() => setShowForm(true)}>
            Add Document
          </Button>
        }
      />

      {/* Expiring documents warning */}
      {expiringDocs.length > 0 && (
        <div className="bg-amber-600/10 border border-amber-600/30 rounded-lg p-3 mb-4">
          <p className="text-sm text-amber-400 font-medium mb-1">
            {expiringDocs.length} document{expiringDocs.length !== 1 ? 's' : ''} expiring within 30 days
          </p>
          <div className="text-xs text-amber-400/70">
            {expiringDocs.slice(0, 3).map(d => (
              <span key={d.id} className="mr-3">{d.name} ({formatDate(d.expiry_date)})</span>
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

      {/* Detail modal */}
      <Modal
        open={!!selectedDoc && !editingDoc}
        onClose={() => setSelectedDoc(null)}
        title="Document Details"
        size="md"
        footer={
          selectedDoc ? (
            <div className="flex gap-2">
              <Button variant="danger" size="sm" onClick={() => { setDeleteId(selectedDoc.id); setSelectedDoc(null) }}>Delete</Button>
              <div className="flex-1" />
              <Button size="sm" onClick={() => setEditingDoc(true)}>Edit</Button>
            </div>
          ) : undefined
        }
      >
        {selectedDoc && (
          <div className="space-y-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Document Name</p>
              <p className="text-sm text-white font-medium">{selectedDoc.name}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Employee</p>
                <p className="text-sm">{selectedDoc.employee_id ? <EmployeeLink employeeId={selectedDoc.employee_id} name={selectedDoc.employee_name || 'Unknown'} /> : <span className="text-white">Company-wide</span>}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Category</p>
                <CategoryBadge category={selectedDoc.category} />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">File Size</p>
                <p className="text-sm text-white">{formatFileSize(selectedDoc.file_size)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">File Type</p>
                <p className="text-sm text-white">{selectedDoc.mime_type || '\u2014'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Expiry Date</p>
                {selectedDoc.expiry_date ? (
                  <p className={`text-sm ${isExpired(selectedDoc.expiry_date) ? 'text-red-400' : isExpiringSoon(selectedDoc.expiry_date) ? 'text-amber-400' : 'text-white'}`}>
                    {formatDate(selectedDoc.expiry_date)}
                    {isExpired(selectedDoc.expiry_date) && ' (Expired)'}
                  </p>
                ) : <span className="text-sm text-gray-500">{'\u2014'}</span>}
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Uploaded By</p>
                <p className="text-sm text-white">{selectedDoc.uploaded_by_name || '\u2014'}</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Description</p>
              <p className="text-sm text-gray-300">{selectedDoc.description || '\u2014'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Created</p>
              <p className="text-sm text-gray-400">{formatDate(selectedDoc.created_at)}</p>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit document metadata modal */}
      <Modal
        open={editingDoc && !!selectedDoc}
        onClose={() => { setEditingDoc(false); setSelectedDoc(null) }}
        title="Edit Document"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setEditingDoc(false); setSelectedDoc(null) }} disabled={editSubmitting}>Cancel</Button>
            <Button type="submit" form="edit-doc-form" loading={editSubmitting}>Save Changes</Button>
          </>
        }
      >
        {selectedDoc && (
          <form id="edit-doc-form" onSubmit={handleEditDoc} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Name" required>
              <Input name="name" required defaultValue={selectedDoc.name} />
            </FormField>
            <FormField label="Category">
              <Select
                name="category"
                defaultValue={selectedDoc.category}
                options={CATEGORIES.filter(c => c.value).map(c => ({ value: c.value, label: c.label }))}
              />
            </FormField>
            <FormField label="Expiry Date">
              <Input name="expiry_date" type="date" defaultValue={selectedDoc.expiry_date || ''} />
            </FormField>
            <FormField label="Description">
              <Input name="description" defaultValue={selectedDoc.description || ''} placeholder="Optional description" />
            </FormField>
          </form>
        )}
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
        <DataTable
          columns={[
            { key: 'name', header: 'Name', render: (row) => {
              const doc = row as unknown as Document
              return (
                <div>
                  <div className="text-white font-medium">{doc.name}</div>
                  {doc.description && <div className="text-xs text-gray-500">{doc.description}</div>}
                </div>
              )
            }},
            { key: 'employee_name', header: 'Employee', render: (row) => {
              const doc = row as unknown as Document
              return doc.employee_id ? <EmployeeLink employeeId={doc.employee_id} name={String(doc.employee_name || 'Unknown')} /> : <span className="text-gray-400">Company</span>
            }},
            { key: 'category', header: 'Category', render: (row) => <CategoryBadge category={String(row.category)} />, className: 'hidden md:table-cell' },
            { key: 'uploaded_by_name', header: 'Uploaded By', render: (row) => <span className="text-gray-400">{String(row.uploaded_by_name || '\u2014')}</span>, className: 'hidden lg:table-cell' },
            { key: 'expiry_date', header: 'Expiry', render: (row) => {
              const doc = row as unknown as Document
              return doc.expiry_date ? (
                <span className={`text-sm ${isExpired(doc.expiry_date) ? 'text-red-400' : isExpiringSoon(doc.expiry_date) ? 'text-amber-400' : 'text-gray-400'}`}>
                  {formatDate(doc.expiry_date)}
                </span>
              ) : (
                <span className="text-gray-600">{'\u2014'}</span>
              )
            }},
          ]}
          data={documents as unknown as Record<string, unknown>[]}
          keyField="id"
          onRowClick={(row) => setSelectedDoc(row as unknown as Document)}
          striped={false}
        />
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
