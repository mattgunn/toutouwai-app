import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { fetchApplicants, updateApplicantStage, createEmployee, fetchJobPosting } from '../api'
import { formatDate } from '../utils/format'
import type { Applicant } from '../types'
import StatusBadge from '../components/StatusBadge'
import PageHeader from '../components/PageHeader'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import Button from '../components/Button'
import { Select } from '../components/FormField'
import { SkeletonTable } from '../components/Skeleton'
import { useToast } from '../components/Toast'

const STAGES = [
  { value: 'applied', label: 'Applied' },
  { value: 'screening', label: 'Screening' },
  { value: 'interview', label: 'Interview' },
  { value: 'offer', label: 'Offer' },
  { value: 'hired', label: 'Hired' },
  { value: 'rejected', label: 'Rejected' },
]

export default function Applicants() {
  const [applicants, setApplicants] = useState<Applicant[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null)
  const [stageUpdate, setStageUpdate] = useState('')
  const [updatingStage, setUpdatingStage] = useState(false)
  const [converting, setConverting] = useState(false)
  const toast = useToast()
  const navigate = useNavigate()

  const loadData = () => {
    setLoading(true)
    fetchApplicants()
      .then(setApplicants)
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [])

  const handleStageUpdate = async () => {
    if (!selectedApplicant || !stageUpdate) return
    setUpdatingStage(true)
    try {
      await updateApplicantStage(selectedApplicant.id, stageUpdate)
      toast.success('Stage updated')
      setSelectedApplicant(null)
      setStageUpdate('')
      loadData()
    } catch {
      toast.error('Failed to update stage')
    } finally {
      setUpdatingStage(false)
    }
  }

  const handleConvertToEmployee = async () => {
    if (!selectedApplicant) return
    setConverting(true)
    try {
      let department_id: string | null = null
      if (selectedApplicant.job_posting_id) {
        try {
          const posting = await fetchJobPosting(selectedApplicant.job_posting_id)
          department_id = posting.department_id ?? null
        } catch { /* ignore */ }
      }
      const body: Record<string, unknown> = {
        first_name: selectedApplicant.first_name,
        last_name: selectedApplicant.last_name,
        email: selectedApplicant.email,
        phone: selectedApplicant.phone,
        status: 'active',
        start_date: new Date().toISOString().slice(0, 10),
      }
      if (department_id) body.department_id = department_id
      const emp = await createEmployee(body)
      toast.success('Employee created from applicant')
      setSelectedApplicant(null)
      navigate(`/employees?id=${emp.id}`)
    } catch {
      toast.error('Failed to convert applicant to employee')
    } finally {
      setConverting(false)
    }
  }

  const applicantColumns = [
    { key: 'name', header: 'Name', render: (app: Applicant) => <span className="text-white font-medium">{app.first_name} {app.last_name}</span> },
    { key: 'email', header: 'Email', render: (app: Applicant) => <span className="text-gray-400">{app.email}</span> },
    { key: 'job_title', header: 'Job', className: 'hidden md:table-cell', render: (app: Applicant) => app.job_posting_id && app.job_title ? <Link to={`/job-postings?id=${app.job_posting_id}`} className="text-blue-400 hover:text-blue-300 hover:underline" onClick={e => e.stopPropagation()}>{app.job_title}</Link> : <span className="text-gray-400">{app.job_title || '\u2014'}</span> },
    { key: 'stage', header: 'Stage', render: (app: Applicant) => <StatusBadge status={app.stage} /> },
    { key: 'rating', header: 'Rating', className: 'hidden md:table-cell', render: (app: Applicant) => (
      app.rating ? (
        <div className="flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <span key={i} className={`text-xs ${i < app.rating! ? 'text-amber-400' : 'text-gray-700'}`}>&#9733;</span>
          ))}
        </div>
      ) : <span className="text-gray-600">{'\u2014'}</span>
    )},
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
        onRowClick={(app) => { setSelectedApplicant(app); setStageUpdate(app.stage) }}
      />

      {/* Detail modal */}
      <Modal
        open={!!selectedApplicant}
        onClose={() => { setSelectedApplicant(null); setStageUpdate('') }}
        title="Applicant Details"
        size="lg"
        footer={
          selectedApplicant ? (
            <div className="flex items-center gap-3 w-full">
              <div className="flex-1 flex items-center gap-2">
                <span className="text-xs text-gray-500">Update stage:</span>
                <Select
                  value={stageUpdate}
                  onChange={e => setStageUpdate(e.target.value)}
                  options={STAGES}
                />
              </div>
              <Button
                size="sm"
                onClick={handleStageUpdate}
                loading={updatingStage}
                disabled={stageUpdate === selectedApplicant.stage}
              >
                Update Stage
              </Button>
              {selectedApplicant.stage === 'hired' && (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={handleConvertToEmployee}
                  loading={converting}
                >
                  Convert to Employee
                </Button>
              )}
            </div>
          ) : undefined
        }
      >
        {selectedApplicant && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Name</p>
                <p className="text-sm text-white font-medium">{selectedApplicant.first_name} {selectedApplicant.last_name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Email</p>
                <p className="text-sm text-white">{selectedApplicant.email}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Phone</p>
                <p className="text-sm text-white">{selectedApplicant.phone || '\u2014'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Job Position</p>
                <p className="text-sm text-white">{selectedApplicant.job_title || '\u2014'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Stage</p>
                <StatusBadge status={selectedApplicant.stage} />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Rating</p>
                {selectedApplicant.rating ? (
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span key={i} className={`text-sm ${i < selectedApplicant.rating! ? 'text-amber-400' : 'text-gray-700'}`}>&#9733;</span>
                    ))}
                    <span className="text-xs text-gray-400 ml-1">{selectedApplicant.rating}/5</span>
                  </div>
                ) : <span className="text-sm text-gray-500">{'\u2014'}</span>}
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Applied Date</p>
                <p className="text-sm text-white">{formatDate(selectedApplicant.applied_at)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Resume</p>
                {selectedApplicant.resume_url ? (
                  <a href={selectedApplicant.resume_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-400 hover:underline">View Resume</a>
                ) : <span className="text-sm text-gray-500">{'\u2014'}</span>}
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Notes</p>
              <p className="text-sm text-gray-300 whitespace-pre-wrap">{selectedApplicant.notes || '\u2014'}</p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
