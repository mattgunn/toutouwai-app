import { useState, useEffect } from 'react'
import { fetchReviewCycles, fetchReviews } from '../api'
import type { ReviewCycle, Review } from '../types'
import StatusBadge from '../components/StatusBadge'
import PageHeader from '../components/PageHeader'
import DataTable from '../components/DataTable'
import Tabs from '../components/Tabs'
import { SkeletonTable } from '../components/Skeleton'
export default function Reviews() {
  const [cycles, setCycles] = useState<ReviewCycle[]>([])
  const [selectedCycle, setSelectedCycle] = useState<string | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingReviews, setLoadingReviews] = useState(false)

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
    { key: 'employee_name', header: 'Employee', render: (r: Review) => <span className="text-white">{r.employee_name || '\u2014'}</span> },
    { key: 'reviewer_name', header: 'Reviewer', render: (r: Review) => <span className="text-gray-400">{r.reviewer_name || '\u2014'}</span> },
    { key: 'rating', header: 'Rating', render: (r: Review) => <span className="text-amber-400">{r.rating ?? '\u2014'}</span> },
    { key: 'status', header: 'Status', render: (r: Review) => <StatusBadge status={r.status} /> },
  ]

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
      />
    </div>
  )
}
