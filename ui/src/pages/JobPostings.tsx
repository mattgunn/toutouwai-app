import { useState, useEffect } from 'react'
import { fetchJobPostings, fetchApplicants } from '../api'
import type { JobPosting, Applicant } from '../types'
import StatusBadge from '../components/StatusBadge'
import EmptyState from '../components/EmptyState'
import PageHeader from '../components/PageHeader'
import DataTable from '../components/DataTable'
import Button from '../components/Button'
import { SkeletonCards, SkeletonTable } from '../components/Skeleton'
import { formatDate, formatCurrency } from '../utils/format'

export default function JobPostings() {
  const [postings, setPostings] = useState<JobPosting[]>([])
  const [loading, setLoading] = useState(true)

  // Detail view state
  const [selectedPosting, setSelectedPosting] = useState<JobPosting | null>(null)
  const [applicants, setApplicants] = useState<Applicant[]>([])
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    fetchJobPostings()
      .then(setPostings)
      .catch(() => {})
      .finally(() => setLoading(false))
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
      <PageHeader title="Job Postings" />

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
    </div>
  )
}
