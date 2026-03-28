import { useState, useEffect } from 'react'
import { fetchReviewCycles, createReviewCycle, fetchReviews, createReview, updateReview, fetchEmployees } from '../api'
import type { ReviewCycle, Review, Employee } from '../types'
import StatusBadge from '../components/StatusBadge'
import PageHeader from '../components/PageHeader'
import DataTable from '../components/DataTable'
import Tabs from '../components/Tabs'
import Button from '../components/Button'
import Modal from '../components/Modal'
import { FormField, Input, Select, Textarea } from '../components/FormField'
import { SkeletonTable } from '../components/Skeleton'
import { formatDate } from '../utils/format'
import EmployeeLink from '../components/EmployeeLink'
import { useToast } from '../components/Toast'

export default function Reviews() {
  const [cycles, setCycles] = useState<ReviewCycle[]>([])
  const [selectedCycle, setSelectedCycle] = useState<string | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingReviews, setLoadingReviews] = useState(false)

  // Detail view state
  const [selectedReview, setSelectedReview] = useState<Review | null>(null)

  // New cycle modal
  const [showCycleForm, setShowCycleForm] = useState(false)
  const [cycleSubmitting, setCycleSubmitting] = useState(false)

  // New review modal
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [reviewSubmitting, setReviewSubmitting] = useState(false)

  // Edit review modal
  const [editingReview, setEditingReview] = useState(false)
  const [editRating, setEditRating] = useState('')
  const [editFeedback, setEditFeedback] = useState('')
  const [editStatus, setEditStatus] = useState('')
  const [editSubmitting, setEditSubmitting] = useState(false)

  const toast = useToast()

  const loadCycles = () => {
    fetchReviewCycles().then(data => {
      setCycles(data)
      if (data.length > 0 && !selectedCycle) setSelectedCycle(data[0].id)
    }).catch(() => {})
  }

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetchReviewCycles().then(data => {
        setCycles(data)
        if (data.length > 0) setSelectedCycle(data[0].id)
      }).catch(() => {}),
      fetchEmployees().then(r => setEmployees(r.employees)).catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [])

  const loadReviews = () => {
    if (selectedCycle) {
      setLoadingReviews(true)
      fetchReviews({ cycle_id: selectedCycle }).then(setReviews).catch(() => {}).finally(() => setLoadingReviews(false))
    }
  }

  useEffect(() => {
    loadReviews()
  }, [selectedCycle])

  const handleCreateCycle = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setCycleSubmitting(true)
    try {
      const fd = new FormData(e.currentTarget)
      const cycle = await createReviewCycle({
        name: fd.get('name'),
        start_date: fd.get('start_date') || null,
        end_date: fd.get('end_date') || null,
      })
      setCycles(prev => [cycle, ...prev])
      setSelectedCycle(cycle.id)
      setShowCycleForm(false)
      toast.success('Review cycle created')
    } catch {
      toast.error('Failed to create review cycle')
    } finally {
      setCycleSubmitting(false)
    }
  }

  const handleCreateReview = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setReviewSubmitting(true)
    try {
      const fd = new FormData(e.currentTarget)
      await createReview({
        cycle_id: selectedCycle,
        employee_id: fd.get('employee_id'),
        reviewer_id: fd.get('reviewer_id'),
      })
      setShowReviewForm(false)
      loadReviews()
      loadCycles()
      toast.success('Review created')
    } catch {
      toast.error('Failed to create review')
    } finally {
      setReviewSubmitting(false)
    }
  }

  const openEditReview = () => {
    if (!selectedReview) return
    setEditRating(selectedReview.rating != null ? String(selectedReview.rating) : '')
    setEditFeedback(selectedReview.feedback || '')
    setEditStatus(selectedReview.status)
    setEditingReview(true)
  }

  const handleEditReview = async () => {
    if (!selectedReview) return
    setEditSubmitting(true)
    try {
      await updateReview(selectedReview.id, {
        rating: editRating ? parseFloat(editRating) : null,
        feedback: editFeedback || null,
        status: editStatus,
      })
      setEditingReview(false)
      setSelectedReview(null)
      loadReviews()
      toast.success('Review updated')
    } catch {
      toast.error('Failed to update review')
    } finally {
      setEditSubmitting(false)
    }
  }

  const reviewColumns = [
    { key: 'employee_name', header: 'Employee', render: (r: Review) => r.employee_id ? <EmployeeLink employeeId={r.employee_id} name={r.employee_name || 'Unknown'} /> : <span className="text-white">{'\u2014'}</span> },
    { key: 'reviewer_name', header: 'Reviewer', render: (r: Review) => r.reviewer_id ? <EmployeeLink employeeId={r.reviewer_id} name={r.reviewer_name || 'Unknown'} /> : <span className="text-gray-400">{'\u2014'}</span> },
    { key: 'rating', header: 'Rating', render: (r: Review) => <span className="text-amber-400">{r.rating ?? '\u2014'}</span> },
    { key: 'status', header: 'Status', render: (r: Review) => <StatusBadge status={r.status} /> },
  ]

  const currentCycle = cycles.find(c => c.id === selectedCycle)

  // Cycle progress calculation
  const submittedCount = reviews.filter(r => r.status === 'submitted' || r.status === 'completed').length
  const totalCount = reviews.length

  if (loading) {
    return (
      <div>
        <PageHeader title="Performance Reviews" />
        <SkeletonTable rows={5} cols={4} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Performance Reviews"
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setShowCycleForm(true)}>
              New Cycle
            </Button>
            {selectedCycle && (
              <Button onClick={() => setShowReviewForm(true)}>
                New Review
              </Button>
            )}
          </div>
        }
      />

      {/* Cycle selector */}
      {cycles.length > 0 && (
        <div className="mb-4">
          <Tabs
            variant="pills"
            tabs={cycles.map(cycle => ({
              key: cycle.id,
              label: cycle.name,
            }))}
            active={selectedCycle || ''}
            onChange={setSelectedCycle}
          />
        </div>
      )}

      {/* Cycle progress bar */}
      {currentCycle && totalCount > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-400">
              Cycle Progress: {submittedCount}/{totalCount} reviews submitted
            </span>
            <span className="text-xs text-gray-500">
              {Math.round((submittedCount / totalCount) * 100)}%
            </span>
          </div>
          <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${submittedCount === totalCount ? 'bg-emerald-500' : 'bg-blue-500'}`}
              style={{ width: `${(submittedCount / totalCount) * 100}%` }}
            />
          </div>
        </div>
      )}

      <DataTable
        columns={reviewColumns}
        data={reviews}
        keyField="id"
        loading={loadingReviews}
        emptyMessage={cycles.length === 0 ? 'No review cycles yet' : 'No reviews in this cycle'}
        emptyIcon="📋"
        onRowClick={(r) => setSelectedReview(r)}
      />

      {/* New Cycle modal */}
      <Modal
        open={showCycleForm}
        onClose={() => setShowCycleForm(false)}
        title="New Review Cycle"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowCycleForm(false)} disabled={cycleSubmitting}>Cancel</Button>
            <Button type="submit" form="cycle-form" loading={cycleSubmitting}>Create</Button>
          </>
        }
      >
        <form id="cycle-form" onSubmit={handleCreateCycle} className="space-y-4">
          <FormField label="Cycle Name" required>
            <Input name="name" required placeholder="e.g. Q1 2026 Reviews" />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Start Date">
              <Input name="start_date" type="date" />
            </FormField>
            <FormField label="End Date">
              <Input name="end_date" type="date" />
            </FormField>
          </div>
        </form>
      </Modal>

      {/* New Review modal */}
      <Modal
        open={showReviewForm}
        onClose={() => setShowReviewForm(false)}
        title="New Review"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowReviewForm(false)} disabled={reviewSubmitting}>Cancel</Button>
            <Button type="submit" form="review-form" loading={reviewSubmitting}>Create</Button>
          </>
        }
      >
        <form id="review-form" onSubmit={handleCreateReview} className="space-y-4">
          <FormField label="Employee" required>
            <Select
              name="employee_id"
              required
              placeholder="Select employee..."
              options={employees.map(emp => ({ value: emp.id, label: `${emp.first_name} ${emp.last_name}` }))}
            />
          </FormField>
          <FormField label="Reviewer" required>
            <Select
              name="reviewer_id"
              required
              placeholder="Select reviewer..."
              options={employees.map(emp => ({ value: emp.id, label: `${emp.first_name} ${emp.last_name}` }))}
            />
          </FormField>
          {currentCycle && (
            <p className="text-xs text-gray-500">Cycle: {currentCycle.name}</p>
          )}
        </form>
      </Modal>

      {/* Review detail modal */}
      <Modal
        open={!!selectedReview && !editingReview}
        onClose={() => setSelectedReview(null)}
        title="Review Details"
        size="lg"
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setSelectedReview(null)}>Close</Button>
            <Button onClick={openEditReview}>Edit</Button>
          </div>
        }
      >
        {selectedReview && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Employee</p>
                <p className="font-medium">{selectedReview.employee_id ? <EmployeeLink employeeId={selectedReview.employee_id} name={selectedReview.employee_name || 'Unknown'} className="font-medium" /> : <span className="text-white">{'\u2014'}</span>}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Reviewer</p>
                <p className="font-medium">{selectedReview.reviewer_id ? <EmployeeLink employeeId={selectedReview.reviewer_id} name={selectedReview.reviewer_name || 'Unknown'} className="font-medium" /> : <span className="text-white">{'\u2014'}</span>}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Cycle</p>
                <p className="text-gray-300">{selectedReview.cycle_name || currentCycle?.name || '\u2014'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Status</p>
                <StatusBadge status={selectedReview.status} />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Rating</p>
                {selectedReview.rating != null ? (
                  <div className="flex items-center gap-2">
                    <span className="text-amber-400 text-lg font-semibold">{selectedReview.rating}</span>
                    <span className="text-gray-500 text-sm">/ 5</span>
                  </div>
                ) : (
                  <p className="text-gray-500">{'\u2014'}</p>
                )}
              </div>
              {selectedReview.submitted_at && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Submitted</p>
                  <p className="text-gray-300">{formatDate(selectedReview.submitted_at)}</p>
                </div>
              )}
            </div>

            {selectedReview.feedback && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Feedback</p>
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3">
                  <p className="text-gray-300 text-sm whitespace-pre-wrap">{selectedReview.feedback}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Edit Review modal */}
      <Modal
        open={editingReview && !!selectedReview}
        onClose={() => { setEditingReview(false); setSelectedReview(null) }}
        title="Edit Review"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setEditingReview(false); setSelectedReview(null) }} disabled={editSubmitting}>Cancel</Button>
            <Button onClick={handleEditReview} loading={editSubmitting}>Save Changes</Button>
          </>
        }
      >
        {selectedReview && (
          <div className="space-y-4">
            <p className="text-sm text-gray-400">
              {selectedReview.employee_name || 'Unknown'} - reviewed by {selectedReview.reviewer_name || 'Unknown'}
            </p>
            <FormField label="Rating (1-5)">
              <Input
                type="number"
                min="1"
                max="5"
                step="0.5"
                value={editRating}
                onChange={e => setEditRating(e.target.value)}
                placeholder="e.g. 4.5"
              />
            </FormField>
            <FormField label="Status">
              <Select
                value={editStatus}
                onChange={e => setEditStatus(e.target.value)}
                options={[
                  { value: 'draft', label: 'Draft' },
                  { value: 'in_progress', label: 'In Progress' },
                  { value: 'submitted', label: 'Submitted' },
                  { value: 'completed', label: 'Completed' },
                ]}
              />
            </FormField>
            <FormField label="Feedback">
              <Textarea
                value={editFeedback}
                onChange={e => setEditFeedback(e.target.value)}
                placeholder="Enter feedback..."
                rows={4}
              />
            </FormField>
          </div>
        )}
      </Modal>
    </div>
  )
}
