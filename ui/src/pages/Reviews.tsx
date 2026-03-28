import { useState, useEffect } from 'react'
import { fetchReviewCycles, fetchReviews } from '../api'
import type { ReviewCycle, Review } from '../types'
import StatusBadge from '../components/StatusBadge'
import PageHeader from '../components/PageHeader'
import DataTable from '../components/DataTable'
import Tabs from '../components/Tabs'
import Button from '../components/Button'
import Modal from '../components/Modal'
import { SkeletonTable } from '../components/Skeleton'
import { formatDate } from '../utils/format'
import EmployeeLink from '../components/EmployeeLink'

export default function Reviews() {
  const [cycles, setCycles] = useState<ReviewCycle[]>([])
  const [selectedCycle, setSelectedCycle] = useState<string | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingReviews, setLoadingReviews] = useState(false)

  // Detail view state
  const [selectedReview, setSelectedReview] = useState<Review | null>(null)

  useEffect(() => {
    setLoading(true)
    fetchReviewCycles().then(data => {
      setCycles(data)
      if (data.length > 0) setSelectedCycle(data[0].id)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (selectedCycle) {
      setLoadingReviews(true)
      fetchReviews({ cycle_id: selectedCycle }).then(setReviews).catch(() => {}).finally(() => setLoadingReviews(false))
    }
  }, [selectedCycle])

  const reviewColumns = [
    { key: 'employee_name', header: 'Employee', render: (r: Review) => r.employee_id ? <EmployeeLink employeeId={r.employee_id} name={r.employee_name || 'Unknown'} /> : <span className="text-white">{'\u2014'}</span> },
    { key: 'reviewer_name', header: 'Reviewer', render: (r: Review) => r.reviewer_id ? <EmployeeLink employeeId={r.reviewer_id} name={r.reviewer_name || 'Unknown'} /> : <span className="text-gray-400">{'\u2014'}</span> },
    { key: 'rating', header: 'Rating', render: (r: Review) => <span className="text-amber-400">{r.rating ?? '\u2014'}</span> },
    { key: 'status', header: 'Status', render: (r: Review) => <StatusBadge status={r.status} /> },
  ]

  const currentCycle = cycles.find(c => c.id === selectedCycle)

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
      <PageHeader title="Performance Reviews" />

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

      <DataTable
        columns={reviewColumns}
        data={reviews}
        keyField="id"
        loading={loadingReviews}
        emptyMessage={cycles.length === 0 ? 'No review cycles yet' : 'No reviews in this cycle'}
        emptyIcon="📋"
        onRowClick={(r) => setSelectedReview(r)}
      />

      {/* Review detail modal */}
      <Modal
        open={!!selectedReview}
        onClose={() => setSelectedReview(null)}
        title="Review Details"
        size="lg"
        footer={
          <Button variant="secondary" onClick={() => setSelectedReview(null)}>Close</Button>
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
    </div>
  )
}
