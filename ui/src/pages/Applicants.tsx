import { useState, useEffect } from 'react'
import { fetchApplicants } from '../api'
import { formatDate } from '../utils/format'
import type { Applicant } from '../types'
import StatusBadge from '../components/StatusBadge'
import PageHeader from '../components/PageHeader'
import DataTable from '../components/DataTable'
import { SkeletonTable } from '../components/Skeleton'
export default function Applicants() {
  const [applicants, setApplicants] = useState<Applicant[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchApplicants()
      .then(setApplicants)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const applicantColumns = [
    { key: 'name', header: 'Name', render: (app: Applicant) => <span className="text-white font-medium">{app.first_name} {app.last_name}</span> },
    { key: 'email', header: 'Email', render: (app: Applicant) => <span className="text-gray-400">{app.email}</span> },
    { key: 'job_title', header: 'Job', className: 'hidden md:table-cell', render: (app: Applicant) => <span className="text-gray-400">{app.job_title || '\u2014'}</span> },
    { key: 'stage', header: 'Stage', render: (app: Applicant) => <StatusBadge status={app.stage} /> },
    { key: 'applied_at', header: 'Applied', className: 'hidden lg:table-cell', render: (app: Applicant) => <span className="text-gray-400">{formatDate(app.applied_at)}</span> },
  ]

  if (loading) {
    return (
      <div>
        <PageHeader title="Applicants" />
        <SkeletonTable rows={5} cols={5} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="Applicants" />

      <DataTable
        columns={applicantColumns}
        data={applicants}
        keyField="id"
        emptyMessage="No applicants yet"
        emptyIcon="👤"
      />
    </div>
  )
}
