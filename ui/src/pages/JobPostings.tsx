import { useState, useEffect } from 'react'
import { fetchJobPostings } from '../api'
import type { JobPosting } from '../types'
import StatusBadge from '../components/StatusBadge'
import EmptyState from '../components/EmptyState'
import PageHeader from '../components/PageHeader'
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
        <PageHeader title="Job Postings" />
        <SkeletonCards count={6} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="Job Postings" />

      {postings.length === 0 ? (
        <EmptyState icon="💼" message="No job postings yet" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {postings.map(posting => (
            <div key={posting.id} className={`bg-gray-900 border border-gray-800 rounded-lg p-4 border-l-4 ${posting.status === 'open' ? 'border-l-emerald-500' : posting.status === 'draft' ? 'border-l-amber-500' : 'border-l-gray-600'}`}>
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
