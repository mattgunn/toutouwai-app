import { useState, useEffect } from 'react'
import { fetchReviewCycles, fetchReviews } from '../api'
import type { ReviewCycle, Review } from '../types'
import StatusBadge from '../components/StatusBadge'
import EmptyState from '../components/EmptyState'
import Tabs from '../components/Tabs'
import { SkeletonTable } from '../components/Skeleton'
import { useToast } from '../components/Toast'

export default function Reviews() {
  const [cycles, setCycles] = useState<ReviewCycle[]>([])
  const [selectedCycle, setSelectedCycle] = useState<string | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingReviews, setLoadingReviews] = useState(false)
  const toast = useToast()

  useEffect(() => {
    setLoading(true)
    fetchReviewCycles().then(data => {
      setCycles(data)
      if (data.length > 0) setSelectedCycle(data[0].id)
    }).catch(() => {
      toast.error('Failed to load review cycles')
    }).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (selectedCycle) {
      setLoadingReviews(true)
      fetchReviews({ cycle_id: selectedCycle }).then(setReviews).catch(() => {
        toast.error('Failed to load reviews')
      }).finally(() => setLoadingReviews(false))
    }
  }, [selectedCycle])

  if (loading) {
    return (
      <div>
        <h1 className="text-xl font-bold text-white mb-4">Performance Reviews</h1>
        <SkeletonTable rows={5} cols={4} />
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-white mb-4">Performance Reviews</h1>

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

      {loadingReviews ? (
        <SkeletonTable rows={5} cols={4} />
      ) : reviews.length === 0 ? (
        <EmptyState
          icon="📋"
          message={cycles.length === 0 ? 'No review cycles yet' : 'No reviews in this cycle'}
        />
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 text-xs uppercase">
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Reviewer</th>
                <th className="px-4 py-3">Rating</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map(review => (
                <tr key={review.id} className="border-t border-gray-800 hover:bg-gray-800/50 transition-colors">
                  <td className="px-4 py-3 text-white">{review.employee_name || '\u2014'}</td>
                  <td className="px-4 py-3 text-gray-400">{review.reviewer_name || '\u2014'}</td>
                  <td className="px-4 py-3 text-amber-400">{review.rating ?? '\u2014'}</td>
                  <td className="px-4 py-3"><StatusBadge status={review.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
