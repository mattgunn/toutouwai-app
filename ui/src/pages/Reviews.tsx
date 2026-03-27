import { useState, useEffect } from 'react'
import { fetchReviewCycles, fetchReviews } from '../api'
import type { ReviewCycle, Review } from '../types'
import StatusBadge from '../components/StatusBadge'
import EmptyState from '../components/EmptyState'

export default function Reviews() {
  const [cycles, setCycles] = useState<ReviewCycle[]>([])
  const [selectedCycle, setSelectedCycle] = useState<string | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])

  useEffect(() => {
    fetchReviewCycles().then(data => {
      setCycles(data)
      if (data.length > 0) setSelectedCycle(data[0].id)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (selectedCycle) {
      fetchReviews({ cycle_id: selectedCycle }).then(setReviews).catch(() => {})
    }
  }, [selectedCycle])

  return (
    <div>
      <h1 className="text-xl font-bold text-white mb-4">Performance Reviews</h1>

      {/* Cycle selector */}
      {cycles.length > 0 && (
        <div className="flex gap-2 mb-4 overflow-x-auto">
          {cycles.map(cycle => (
            <button
              key={cycle.id}
              onClick={() => setSelectedCycle(cycle.id)}
              className={`px-3 py-1.5 text-sm rounded whitespace-nowrap transition-colors ${
                selectedCycle === cycle.id
                  ? 'bg-blue-600/20 text-blue-400'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
              }`}
            >
              {cycle.name}
              <span className="ml-2"><StatusBadge status={cycle.status} /></span>
            </button>
          ))}
        </div>
      )}

      {reviews.length === 0 ? (
        <EmptyState message={cycles.length === 0 ? 'No review cycles yet' : 'No reviews in this cycle'} />
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
