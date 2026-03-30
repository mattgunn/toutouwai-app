import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { fetchApplicants, updateApplicantStage, createEmployee, fetchJobPosting, fetchInterviews, createInterview, updateInterview, deleteInterview, fetchOffers, createOffer, updateOffer, fetchEmployees, fetchPositions, fetchDepartments } from '../api'
import { formatDate } from '../utils/format'
import type { Applicant, Interview, Offer, Employee, Position, Department } from '../types'
import StatusBadge from '../components/StatusBadge'
import PageHeader from '../components/PageHeader'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import Button from '../components/Button'
import { FormField, Input, Select, Textarea } from '../components/FormField'
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

const INTERVIEW_TYPES = [
  { value: 'phone', label: 'Phone' },
  { value: 'video', label: 'Video' },
  { value: 'in_person', label: 'In Person' },
  { value: 'technical', label: 'Technical' },
  { value: 'panel', label: 'Panel' },
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

  // Interview state
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [showScheduleInterview, setShowScheduleInterview] = useState(false)
  const [interviewForm, setInterviewForm] = useState({ interviewer_id: '', interview_type: 'phone', scheduled_at: '', duration_minutes: '60', location: '', notes: '' })
  const [savingInterview, setSavingInterview] = useState(false)
  const [employees, setEmployees] = useState<Employee[]>([])

  // Offer state
  const [offers, setOffers] = useState<Offer[]>([])
  const [showCreateOffer, setShowCreateOffer] = useState(false)
  const [offerForm, setOfferForm] = useState({ salary: '', currency: 'NZD', start_date: '', position_id: '', department_id: '', notes: '' })
  const [savingOffer, setSavingOffer] = useState(false)
  const [positions, setPositions] = useState<Position[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [updatingOffer, setUpdatingOffer] = useState<string | null>(null)

  const loadData = () => {
    setLoading(true)
    fetchApplicants()
      .then(setApplicants)
      .catch(() => toast.error('Failed to load applicants'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [])

  // Load interviews and offers when an applicant is selected
  useEffect(() => {
    if (selectedApplicant) {
      fetchInterviews({ applicant_id: selectedApplicant.id }).then(setInterviews).catch(() => toast.error('Failed to load interviews'))
      fetchOffers({ applicant_id: selectedApplicant.id }).then(setOffers).catch(() => toast.error('Failed to load offers'))
    } else {
      setInterviews([])
      setOffers([])
    }
  }, [selectedApplicant?.id])

  // Load reference data for forms
  const loadFormData = () => {
    fetchEmployees({ per_page: '1000' }).then(r => setEmployees(r.employees)).catch(() => {})
    fetchPositions().then(setPositions).catch(() => {})
    fetchDepartments().then(setDepartments).catch(() => {})
  }

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

  // ── Interview handlers ──

  const handleScheduleInterview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedApplicant || !interviewForm.scheduled_at) return
    setSavingInterview(true)
    try {
      await createInterview({
        applicant_id: selectedApplicant.id,
        interviewer_id: interviewForm.interviewer_id || null,
        interview_type: interviewForm.interview_type,
        scheduled_at: interviewForm.scheduled_at,
        duration_minutes: parseInt(interviewForm.duration_minutes) || 60,
        location: interviewForm.location || null,
        notes: interviewForm.notes || null,
      })
      toast.success('Interview scheduled')
      setShowScheduleInterview(false)
      setInterviewForm({ interviewer_id: '', interview_type: 'phone', scheduled_at: '', duration_minutes: '60', location: '', notes: '' })
      fetchInterviews({ applicant_id: selectedApplicant.id }).then(setInterviews).catch(() => {})
    } catch {
      toast.error('Failed to schedule interview')
    } finally {
      setSavingInterview(false)
    }
  }

  const handleUpdateInterviewStatus = async (interviewId: string, status: string) => {
    try {
      await updateInterview(interviewId, { status })
      toast.success('Interview updated')
      if (selectedApplicant) {
        fetchInterviews({ applicant_id: selectedApplicant.id }).then(setInterviews).catch(() => {})
      }
    } catch {
      toast.error('Failed to update interview')
    }
  }

  const handleDeleteInterview = async (interviewId: string) => {
    try {
      await deleteInterview(interviewId)
      toast.success('Interview deleted')
      if (selectedApplicant) {
        fetchInterviews({ applicant_id: selectedApplicant.id }).then(setInterviews).catch(() => {})
      }
    } catch {
      toast.error('Failed to delete interview')
    }
  }

  // ── Offer handlers ──

  const handleCreateOffer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedApplicant) return
    setSavingOffer(true)
    try {
      await createOffer({
        applicant_id: selectedApplicant.id,
        job_posting_id: selectedApplicant.job_posting_id || null,
        salary: offerForm.salary ? parseFloat(offerForm.salary) : null,
        currency: offerForm.currency,
        start_date: offerForm.start_date || null,
        position_id: offerForm.position_id || null,
        department_id: offerForm.department_id || null,
        notes: offerForm.notes || null,
      })
      toast.success('Offer created')
      setShowCreateOffer(false)
      setOfferForm({ salary: '', currency: 'NZD', start_date: '', position_id: '', department_id: '', notes: '' })
      fetchOffers({ applicant_id: selectedApplicant.id }).then(setOffers).catch(() => {})
    } catch {
      toast.error('Failed to create offer')
    } finally {
      setSavingOffer(false)
    }
  }

  const handleUpdateOfferStatus = async (offerId: string, status: string) => {
    setUpdatingOffer(offerId)
    try {
      const updates: Record<string, unknown> = { status }
      if (status === 'sent') updates.sent_at = new Date().toISOString()
      if (status === 'accepted' || status === 'declined') updates.responded_at = new Date().toISOString()
      await updateOffer(offerId, updates)
      toast.success(`Offer ${status}`)
      if (selectedApplicant) {
        fetchOffers({ applicant_id: selectedApplicant.id }).then(setOffers).catch(() => {})
      }
    } catch {
      toast.error('Failed to update offer')
    } finally {
      setUpdatingOffer(null)
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
        emptyIcon="&#x1F464;"
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

            {/* ── Interviews Section ── */}
            <div className="border-t border-gray-800 pt-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-white">Interviews</h4>
                <Button size="sm" onClick={() => { setShowScheduleInterview(true); loadFormData() }}>
                  Schedule Interview
                </Button>
              </div>
              {interviews.length === 0 ? (
                <p className="text-sm text-gray-500">No interviews scheduled</p>
              ) : (
                <div className="space-y-2">
                  {interviews.map(iv => (
                    <div key={iv.id} className="bg-gray-800/50 rounded-lg p-3 flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm text-white font-medium capitalize">{iv.interview_type.replace('_', ' ')}</span>
                          <StatusBadge status={iv.status} />
                        </div>
                        <p className="text-xs text-gray-400">
                          {formatDate(iv.scheduled_at)} &middot; {iv.duration_minutes} min
                          {iv.interviewer_name && <> &middot; {iv.interviewer_name}</>}
                        </p>
                        {iv.location && <p className="text-xs text-gray-500 mt-0.5">{iv.location}</p>}
                        {iv.feedback && <p className="text-xs text-gray-300 mt-1">{iv.feedback}</p>}
                        {iv.rating != null && (
                          <div className="flex items-center gap-1 mt-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <span key={i} className={`text-xs ${i < (iv.rating ?? 0) ? 'text-amber-400' : 'text-gray-700'}`}>&#9733;</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {iv.status === 'scheduled' && (
                          <Button size="sm" variant="secondary" onClick={() => handleUpdateInterviewStatus(iv.id, 'completed')}>
                            Complete
                          </Button>
                        )}
                        {iv.status === 'scheduled' && (
                          <Button size="sm" variant="danger" onClick={() => handleUpdateInterviewStatus(iv.id, 'cancelled')}>
                            Cancel
                          </Button>
                        )}
                        <button
                          onClick={() => handleDeleteInterview(iv.id)}
                          className="p-1 text-gray-500 hover:text-red-400 transition-colors"
                          title="Delete interview"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Offer Section ── */}
            {(selectedApplicant.stage === 'offer' || selectedApplicant.stage === 'hired' || offers.length > 0) && (
              <div className="border-t border-gray-800 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-white">Offers</h4>
                  {offers.length === 0 && (
                    <Button size="sm" onClick={() => { setShowCreateOffer(true); loadFormData() }}>
                      Create Offer
                    </Button>
                  )}
                </div>
                {offers.length === 0 ? (
                  <p className="text-sm text-gray-500">No offers yet</p>
                ) : (
                  <div className="space-y-2">
                    {offers.map(offer => (
                      <div key={offer.id} className="bg-gray-800/50 rounded-lg p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <StatusBadge status={offer.status} />
                              {offer.salary != null && (
                                <span className="text-sm text-white font-medium">
                                  {offer.currency} {offer.salary.toLocaleString()}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-400 space-y-0.5">
                              {offer.position_title && <p>Position: {offer.position_title}</p>}
                              {offer.department_name && <p>Department: {offer.department_name}</p>}
                              {offer.start_date && <p>Start date: {formatDate(offer.start_date)}</p>}
                              {offer.sent_at && <p>Sent: {formatDate(offer.sent_at)}</p>}
                              {offer.responded_at && <p>Responded: {formatDate(offer.responded_at)}</p>}
                            </div>
                            {offer.notes && <p className="text-xs text-gray-300 mt-1">{offer.notes}</p>}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {offer.status === 'draft' && (
                              <Button size="sm" onClick={() => handleUpdateOfferStatus(offer.id, 'sent')} loading={updatingOffer === offer.id}>
                                Send
                              </Button>
                            )}
                            {offer.status === 'sent' && (
                              <>
                                <Button size="sm" variant="primary" onClick={() => handleUpdateOfferStatus(offer.id, 'accepted')} loading={updatingOffer === offer.id}>
                                  Accept
                                </Button>
                                <Button size="sm" variant="danger" onClick={() => handleUpdateOfferStatus(offer.id, 'declined')} loading={updatingOffer === offer.id}>
                                  Decline
                                </Button>
                              </>
                            )}
                            {(offer.status === 'draft' || offer.status === 'sent') && (
                              <Button size="sm" variant="secondary" onClick={() => handleUpdateOfferStatus(offer.id, 'withdrawn')} loading={updatingOffer === offer.id}>
                                Withdraw
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Schedule Interview Modal */}
      <Modal
        open={showScheduleInterview}
        onClose={() => setShowScheduleInterview(false)}
        title="Schedule Interview"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowScheduleInterview(false)} disabled={savingInterview}>Cancel</Button>
            <Button type="submit" form="schedule-interview-form" loading={savingInterview}>Schedule</Button>
          </>
        }
      >
        <form id="schedule-interview-form" onSubmit={handleScheduleInterview} className="space-y-4">
          <FormField label="Interview Type" required>
            <Select
              value={interviewForm.interview_type}
              onChange={e => setInterviewForm(f => ({ ...f, interview_type: e.target.value }))}
              options={INTERVIEW_TYPES}
            />
          </FormField>
          <FormField label="Date & Time" required>
            <Input
              type="datetime-local"
              value={interviewForm.scheduled_at}
              onChange={e => setInterviewForm(f => ({ ...f, scheduled_at: e.target.value }))}
              required
            />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Duration (minutes)">
              <Input
                type="number"
                value={interviewForm.duration_minutes}
                onChange={e => setInterviewForm(f => ({ ...f, duration_minutes: e.target.value }))}
                min="15"
                step="15"
              />
            </FormField>
            <FormField label="Interviewer">
              <Select
                value={interviewForm.interviewer_id}
                onChange={e => setInterviewForm(f => ({ ...f, interviewer_id: e.target.value }))}
                placeholder="Select interviewer"
                options={employees.map(emp => ({ value: emp.id, label: `${emp.first_name} ${emp.last_name}` }))}
              />
            </FormField>
          </div>
          <FormField label="Location">
            <Input
              value={interviewForm.location}
              onChange={e => setInterviewForm(f => ({ ...f, location: e.target.value }))}
              placeholder="e.g. Room 3B, Zoom link..."
            />
          </FormField>
          <FormField label="Notes">
            <Textarea
              value={interviewForm.notes}
              onChange={e => setInterviewForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Interview notes..."
            />
          </FormField>
        </form>
      </Modal>

      {/* Create Offer Modal */}
      <Modal
        open={showCreateOffer}
        onClose={() => setShowCreateOffer(false)}
        title="Create Offer"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowCreateOffer(false)} disabled={savingOffer}>Cancel</Button>
            <Button type="submit" form="create-offer-form" loading={savingOffer}>Create Offer</Button>
          </>
        }
      >
        <form id="create-offer-form" onSubmit={handleCreateOffer} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Salary">
              <Input
                type="number"
                value={offerForm.salary}
                onChange={e => setOfferForm(f => ({ ...f, salary: e.target.value }))}
                placeholder="e.g. 85000"
                step="1000"
              />
            </FormField>
            <FormField label="Currency">
              <Select
                value={offerForm.currency}
                onChange={e => setOfferForm(f => ({ ...f, currency: e.target.value }))}
                options={[
                  { value: 'NZD', label: 'NZD' },
                  { value: 'AUD', label: 'AUD' },
                  { value: 'USD', label: 'USD' },
                  { value: 'GBP', label: 'GBP' },
                  { value: 'EUR', label: 'EUR' },
                ]}
              />
            </FormField>
          </div>
          <FormField label="Start Date">
            <Input
              type="date"
              value={offerForm.start_date}
              onChange={e => setOfferForm(f => ({ ...f, start_date: e.target.value }))}
            />
          </FormField>
          <FormField label="Position">
            <Select
              value={offerForm.position_id}
              onChange={e => setOfferForm(f => ({ ...f, position_id: e.target.value }))}
              placeholder="Select position"
              options={positions.map(p => ({ value: p.id, label: p.title }))}
            />
          </FormField>
          <FormField label="Department">
            <Select
              value={offerForm.department_id}
              onChange={e => setOfferForm(f => ({ ...f, department_id: e.target.value }))}
              placeholder="Select department"
              options={departments.map(d => ({ value: d.id, label: d.name }))}
            />
          </FormField>
          <FormField label="Notes">
            <Textarea
              value={offerForm.notes}
              onChange={e => setOfferForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Offer details, benefits, conditions..."
            />
          </FormField>
        </form>
      </Modal>
    </div>
  )
}
