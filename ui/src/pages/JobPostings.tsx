import { useState, useEffect } from 'react'
import { fetchJobPostings, fetchApplicants, createJobPosting, updateJobPosting, fetchDepartments } from '../api'
import type { JobPosting, Applicant } from '../types'
import StatusBadge from '../components/StatusBadge'
import EmptyState from '../components/EmptyState'
import PageHeader from '../components/PageHeader'
import DataTable from '../components/DataTable'
import Button from '../components/Button'
import Modal from '../components/Modal'
import { FormField, Input, Select, Textarea } from '../components/FormField'
import { SkeletonCards, SkeletonTable } from '../components/Skeleton'
import { formatDate, formatCurrency } from '../utils/format'
import { useToast } from '../components/Toast'

interface Department {
  id: string
  name: string
}

const EMPLOYMENT_TYPES = [
  { value: 'full_time', label: 'Full Time' },
  { value: 'part_time', label: 'Part Time' },
  { value: 'contract', label: 'Contract' },
]

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'open', label: 'Open' },
  { value: 'closed', label: 'Closed' },
]

export default function JobPostings() {
  const [postings, setPostings] = useState<JobPosting[]>([])
  const [loading, setLoading] = useState(true)
  const toast = useToast()

  // Detail view state
  const [selectedPosting, setSelectedPosting] = useState<JobPosting | null>(null)
  const [applicants, setApplicants] = useState<Applicant[]>([])
  const [detailLoading, setDetailLoading] = useState(false)

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [editingPosting, setEditingPosting] = useState<JobPosting | null>(null)
  const [departments, setDepartments] = useState<Department[]>([])
  const [submitting, setSubmitting] = useState(false)

  const loadPostings = () => {
    fetchJobPostings()
      .then(setPostings)
      .catch(() => toast.error('Failed to load job postings'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadPostings()
  }, [])

  // Fetch applicants when a posting is selected
  useEffect(() => {
    if (!selectedPosting) return
    setDetailLoading(true)
    fetchApplicants({ job_posting_id: selectedPosting.id })
      .then(setApplicants)
      .catch(() => setApplicants([]))
      .finally(() => setDetailLoading(false))
  }, [selectedPosting])

  const openCreateModal = () => {
    setEditingPosting(null)
    setModalOpen(true)
    fetchDepartments().then(setDepartments).catch(() => {})
  }

  const openEditModal = (posting: JobPosting) => {
    setEditingPosting(posting)
    setModalOpen(true)
    fetchDepartments().then(setDepartments).catch(() => {})
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const fd = new FormData(e.currentTarget)
      const body: Record<string, unknown> = {
        title: fd.get('title'),
        department_id: fd.get('department_id') || null,
        description: fd.get('description') || null,
        requirements: fd.get('requirements') || null,
        location: fd.get('location') || null,
        employment_type: fd.get('employment_type') || 'full_time',
        salary_min: fd.get('salary_min') ? Number(fd.get('salary_min')) : null,
        salary_max: fd.get('salary_max') ? Number(fd.get('salary_max')) : null,
        status: fd.get('status') || 'draft',
      }
      if (editingPosting) {
        const updated = await updateJobPosting(editingPosting.id, body)
        setPostings(prev => prev.map(p => (p.id === updated.id ? updated : p)))
        if (selectedPosting?.id === updated.id) setSelectedPosting(updated)
        toast.success('Job posting updated')
      } else {
        await createJobPosting(body)
        toast.success('Job posting created')
        setLoading(true)
        loadPostings()
      }
      setModalOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save job posting')
    } finally {
      setSubmitting(false)
    }
  }

  const applicantColumns = [
    { key: 'name', header: 'Name', render: (a: Applicant) => <span className="text-white font-medium">{a.first_name} {a.last_name}</span> },
    { key: 'email', header: 'Email', render: (a: Applicant) => <span className="text-gray-400">{a.email}</span>, className: 'hidden md:table-cell' },
    { key: 'stage', header: 'Stage', render: (a: Applicant) => <StatusBadge status={a.stage} /> },
    { key: 'applied_at', header: 'Applied', render: (a: Applicant) => <span className="text-gray-400">{formatDate(a.applied_at)}</span>, className: 'hidden lg:table-cell' },
    { key: 'rating', header: 'Rating', render: (a: Applicant) => <span className="text-amber-400">{a.rating ?? '\u2014'}</span> },
  ]

  if (loading) {
    return (
      <div>
        <PageHeader title="Job Postings" />
        <SkeletonCards count={6} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Job Postings"
        actions={<Button onClick={openCreateModal}>Add Posting</Button>}
      />

      {postings.length === 0 ? (
        <EmptyState icon="💼" message="No job postings yet" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {postings.map(posting => (
            <div
              key={posting.id}
              onClick={() => setSelectedPosting(posting)}
              className={`bg-gray-900 border rounded-lg p-4 border-l-4 cursor-pointer hover:shadow-md transition-all duration-200 ${
                selectedPosting?.id === posting.id ? 'ring-1 ring-blue-500/30 border-blue-500' : ''
              } ${posting.status === 'open' ? 'border-l-emerald-500' : posting.status === 'draft' ? 'border-l-amber-500' : 'border-l-gray-600'} ${
                selectedPosting?.id !== posting.id ? 'border-t-gray-800 border-r-gray-800 border-b-gray-800' : ''
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-white font-semibold">{posting.title}</h3>
                <StatusBadge status={posting.status} />
              </div>
              <p className="text-gray-400 text-sm mb-3">{posting.department_name || 'No department'}</p>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                {posting.location && <span>{posting.location}</span>}
                <span>{(posting.employment_type || '').replace(/_/g, ' ')}</span>
                <span>{posting.applicant_count} applicant{posting.applicant_count !== 1 ? 's' : ''}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail panel */}
      {selectedPosting && (
        <div className="mt-6 bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => setSelectedPosting(null)}>
                &larr; Back
              </Button>
              <h2 className="text-lg font-bold text-white">{selectedPosting.title}</h2>
              <StatusBadge status={selectedPosting.status} />
            </div>
            <Button variant="secondary" size="sm" onClick={() => openEditModal(selectedPosting)}>
              Edit
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-sm mb-4">
            <div className="text-gray-400">
              Department: <span className="text-white">{selectedPosting.department_name || '\u2014'}</span>
            </div>
            <div className="text-gray-400">
              Location: <span className="text-white">{selectedPosting.location || '\u2014'}</span>
            </div>
            <div className="text-gray-400">
              Employment type: <span className="text-white">{(selectedPosting.employment_type || '\u2014').replace(/_/g, ' ')}</span>
            </div>
            <div className="text-gray-400">
              Salary range: <span className="text-white">
                {selectedPosting.salary_min != null && selectedPosting.salary_max != null
                  ? `${formatCurrency(selectedPosting.salary_min)} - ${formatCurrency(selectedPosting.salary_max)}`
                  : selectedPosting.salary_min != null
                    ? `From ${formatCurrency(selectedPosting.salary_min)}`
                    : selectedPosting.salary_max != null
                      ? `Up to ${formatCurrency(selectedPosting.salary_max)}`
                      : '\u2014'}
              </span>
            </div>
            {selectedPosting.published_at && (
              <div className="text-gray-400">
                Published: <span className="text-white">{formatDate(selectedPosting.published_at)}</span>
              </div>
            )}
            {selectedPosting.closes_at && (
              <div className="text-gray-400">
                Closes: <span className="text-white">{formatDate(selectedPosting.closes_at)}</span>
              </div>
            )}
          </div>

          {selectedPosting.description && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-300 mb-1">Description</h3>
              <p className="text-gray-400 text-sm whitespace-pre-wrap">{selectedPosting.description}</p>
            </div>
          )}

          {selectedPosting.requirements && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-300 mb-1">Requirements</h3>
              <p className="text-gray-400 text-sm whitespace-pre-wrap">{selectedPosting.requirements}</p>
            </div>
          )}

          <h3 className="text-sm font-semibold text-gray-300 mb-3">
            Applicants ({selectedPosting.applicant_count})
          </h3>
          {detailLoading ? (
            <SkeletonTable rows={3} cols={5} />
          ) : (
            <DataTable
              columns={applicantColumns}
              data={applicants}
              keyField="id"
              emptyMessage="No applicants yet"
              emptyIcon="📝"
            />
          )}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingPosting ? 'Edit Job Posting' : 'Add Job Posting'}
        size="xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" form="posting-form" loading={submitting}>
              {editingPosting ? 'Save Changes' : 'Create Posting'}
            </Button>
          </>
        }
      >
        <form id="posting-form" onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Title" required>
            <Input name="title" required defaultValue={editingPosting?.title || ''} placeholder="e.g. Senior Software Engineer" />
          </FormField>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Department">
              <Select
                name="department_id"
                placeholder="Select department"
                options={departments.map(d => ({ value: d.id, label: d.name }))}
                defaultValue={editingPosting?.department_id || ''}
              />
            </FormField>

            <FormField label="Status">
              <Select
                name="status"
                options={STATUS_OPTIONS}
                defaultValue={editingPosting?.status || 'draft'}
              />
            </FormField>
          </div>

          <FormField label="Description">
            <Textarea name="description" defaultValue={editingPosting?.description || ''} rows={4} placeholder="Job description..." />
          </FormField>

          <FormField label="Requirements">
            <Textarea name="requirements" defaultValue={editingPosting?.requirements || ''} rows={4} placeholder="Job requirements..." />
          </FormField>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Location">
              <Input name="location" defaultValue={editingPosting?.location || ''} placeholder="e.g. Auckland, NZ" />
            </FormField>

            <FormField label="Employment Type">
              <Select
                name="employment_type"
                options={EMPLOYMENT_TYPES}
                defaultValue={editingPosting?.employment_type || 'full_time'}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Salary Min">
              <Input name="salary_min" type="number" min={0} defaultValue={editingPosting?.salary_min ?? ''} placeholder="e.g. 80000" />
            </FormField>
            <FormField label="Salary Max">
              <Input name="salary_max" type="number" min={0} defaultValue={editingPosting?.salary_max ?? ''} placeholder="e.g. 120000" />
            </FormField>
          </div>
        </form>
      </Modal>
    </div>
  )
}
