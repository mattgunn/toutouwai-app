import { useState, useEffect } from 'react'
import { fetchJobPostings } from '../api'
import type { JobPosting } from '../types'
import StatusBadge from '../components/StatusBadge'
import EmptyState from '../components/EmptyState'
import { SkeletonCards } from '../components/Skeleton'
export default function JobPostings() {
  const [postings, setPostings] = useState<JobPosting[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchJobPostings()
      .then(setPostings)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-white">Job Postings</h1>
        </div>
        <SkeletonCards count={6} />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-white">Job Postings</h1>
      </div>

      {postings.length === 0 ? (
        <EmptyState icon="💼" message="No job postings yet" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {postings.map(posting => (
            <div key={posting.id} className="bg-gray-900 border border-gray-800 rounded-lg p-4">
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
    </div>
  )
}
