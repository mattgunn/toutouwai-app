import { useState, useEffect } from 'react'
import { formatDate } from '../utils/format'
import {
  fetchMyProfile, updateMyProfile, fetchMyLeave, submitMyLeave,
  fetchMyLeaveBalances, fetchMyTime, fetchMyDocuments, fetchMyOnboarding,
} from '../modules/self_service/api'
import { fetchLeaveTypes } from '../modules/leave/api'
import type { Employee } from '../types'
import type { LeaveType, LeaveRequest, LeaveBalance } from '../modules/leave/types'
import type { TimeEntry } from '../modules/time/types'
import type { Document } from '../modules/documents/types'
import type { OnboardingChecklist } from '../modules/onboarding/types'
import StatusBadge from '../components/StatusBadge'
import EmptyState from '../components/EmptyState'
import DataTable from '../components/DataTable'
import Tabs from '../components/Tabs'
import Button from '../components/Button'
import Modal from '../components/Modal'
import { FormField, Input, Select, Textarea } from '../components/FormField'
import { PageSkeleton } from '../components/Skeleton'
import { useToast } from '../components/Toast'
import PageHeader from '../components/PageHeader'
import Avatar from '../components/Avatar'

type Section = 'profile' | 'leave' | 'time' | 'documents' | 'onboarding'

export default function MyProfile() {
  const [section, setSection] = useState<Section>('profile')
  const [profile, setProfile] = useState<Employee | null>(null)
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([])
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [onboarding, setOnboarding] = useState<OnboardingChecklist[]>([])
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const toast = useToast()

  // Leave request modal state
  const [leaveModalOpen, setLeaveModalOpen] = useState(false)
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([])
  const [leaveSubmitting, setLeaveSubmitting] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetchMyProfile().then(setProfile).catch(e => setError(e.message)).finally(() => setLoading(false))
  }, [])

  const loadLeaveData = () => {
    fetchMyLeave().then(setLeaveRequests).catch(() => {})
    fetchMyLeaveBalances().then(setLeaveBalances).catch(() => {})
  }

  useEffect(() => {
    if (section === 'leave') {
      loadLeaveData()
    } else if (section === 'time') {
      fetchMyTime().then(setTimeEntries).catch(() => {})
    } else if (section === 'documents') {
      fetchMyDocuments().then(setDocuments).catch(() => {})
    } else if (section === 'onboarding') {
      fetchMyOnboarding().then(setOnboarding).catch(() => {})
    }
  }, [section])

  const handleUpdateProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const fd = new FormData(e.currentTarget)
      const updated = await updateMyProfile({
        phone: fd.get('phone') || null,
        address: fd.get('address') || null,
        emergency_contact: fd.get('emergency_contact') || null,
      })
      setProfile(updated)
      setEditing(false)
      toast.success('Profile updated')
    } catch {
      toast.error('Failed to update profile')
    } finally {
      setSubmitting(false)
    }
  }

  const openLeaveModal = () => {
    setLeaveModalOpen(true)
    fetchLeaveTypes().then(setLeaveTypes).catch(() => {})
  }

  const handleSubmitLeave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLeaveSubmitting(true)
    try {
      const fd = new FormData(e.currentTarget)
      await submitMyLeave({
        leave_type_id: fd.get('leave_type_id'),
        start_date: fd.get('start_date'),
        end_date: fd.get('end_date'),
        days: Number(fd.get('days')),
        notes: fd.get('notes') || null,
      })
      toast.success('Leave request submitted')
      setLeaveModalOpen(false)
      loadLeaveData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit leave request')
    } finally {
      setLeaveSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div>
        <PageHeader title="My Profile" />
        <PageSkeleton />
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <PageHeader title="My Profile" />
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 text-center">
          <p className="text-gray-400 text-sm">{error}</p>
          <p className="text-gray-500 text-xs mt-2">Your user account may not be linked to an employee record yet.</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="My Profile" />

      {/* Tabs */}
      <div className="mb-4">
        <Tabs
          tabs={[
            { key: 'profile', label: 'Profile' },
            { key: 'leave', label: 'Leave' },
            { key: 'time', label: 'Time' },
            { key: 'documents', label: 'Documents' },
            { key: 'onboarding', label: 'Onboarding' },
          ]}
          active={section}
          onChange={(k) => setSection(k as Section)}
        />
      </div>

      {/* -- Profile ------------------------------------------------- */}
      {section === 'profile' && profile && (
        <div className="space-y-4">
          {/* Profile header with avatar */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <div className="flex items-center gap-4 mb-4">
              <Avatar name={`${profile.first_name} ${profile.last_name}`} size="xl" />
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-white">{profile.first_name} {profile.last_name}</h2>
                <p className="text-sm text-gray-400">{profile.position_title || 'No position'} {profile.department_name ? `\u00B7 ${profile.department_name}` : ''}</p>
              </div>
              {!editing && (
                <Button variant="secondary" onClick={() => setEditing(true)}>
                  Edit
                </Button>
              )}
            </div>
          </div>

          {editing ? (
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
              <form onSubmit={handleUpdateProfile} className="space-y-3">
                <FormField label="Phone">
                  <Input name="phone" defaultValue={profile.phone || ''} className="max-w-sm" />
                </FormField>
                <FormField label="Address">
                  <Input name="address" defaultValue={profile.address || ''} className="max-w-sm" />
                </FormField>
                <FormField label="Emergency Contact">
                  <Input name="emergency_contact" defaultValue={profile.emergency_contact || ''} className="max-w-sm" />
                </FormField>
                <div className="flex gap-2">
                  <Button type="submit" loading={submitting}>Save</Button>
                  <Button variant="secondary" onClick={() => setEditing(false)}>Cancel</Button>
                </div>
              </form>
            </div>
          ) : (
            <>
              {/* Personal Information */}
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
                <h3 className="text-sm font-semibold text-white mb-4">Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="text-sm text-white">{profile.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Phone</p>
                    <p className="text-sm text-white">{profile.phone || '\u2014'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Address</p>
                    <p className="text-sm text-white">{profile.address || '\u2014'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Emergency Contact</p>
                    <p className="text-sm text-white">{profile.emergency_contact || '\u2014'}</p>
                  </div>
                </div>
              </div>

              {/* Employment Details */}
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
                <h3 className="text-sm font-semibold text-white mb-4">Employment Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Manager</p>
                    <p className="text-sm text-white">{profile.manager_name || '\u2014'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Start Date</p>
                    <p className="text-sm text-white">{formatDate(profile.start_date)}</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* -- Leave --------------------------------------------------- */}
      {section === 'leave' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div />
            <Button onClick={openLeaveModal}>Request Leave</Button>
          </div>

          {/* Balances */}
          {leaveBalances.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {leaveBalances.map(b => (
                <div key={b.leave_type_id} className="bg-gray-900 border border-gray-800 rounded-lg p-4">
                  <p className="text-xs text-gray-500 mb-1">{b.leave_type_name}</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-white">{b.remaining}</span>
                    <span className="text-xs text-gray-500">of {b.entitled} days remaining</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{b.used} used</p>
                </div>
              ))}
            </div>
          )}

          {/* Recent requests */}
          <h3 className="text-sm font-semibold text-white">Recent Leave Requests</h3>
          <DataTable
            columns={[
              { key: 'leave_type_name', header: 'Type', render: (lr: LeaveRequest) => <span className="text-white">{lr.leave_type_name || '\u2014'}</span> },
              { key: 'start_date', header: 'Start', render: (lr: LeaveRequest) => <span className="text-gray-400">{formatDate(lr.start_date)}</span> },
              { key: 'end_date', header: 'End', render: (lr: LeaveRequest) => <span className="text-gray-400">{formatDate(lr.end_date)}</span> },
              { key: 'days', header: 'Days', render: (lr: LeaveRequest) => <span className="text-white">{lr.days}</span> },
              { key: 'status', header: 'Status', render: (lr: LeaveRequest) => <StatusBadge status={lr.status} /> },
            ]}
            data={leaveRequests}
            keyField="id"
            emptyIcon="🏖️"
            emptyMessage="No leave requests"
          />

          {/* Leave Request Modal */}
          <Modal
            open={leaveModalOpen}
            onClose={() => setLeaveModalOpen(false)}
            title="Request Leave"
            size="lg"
            footer={
              <>
                <Button variant="secondary" onClick={() => setLeaveModalOpen(false)}>Cancel</Button>
                <Button type="submit" form="leave-request-form" loading={leaveSubmitting}>Submit Request</Button>
              </>
            }
          >
            <form id="leave-request-form" onSubmit={handleSubmitLeave} className="space-y-4">
              <FormField label="Leave Type" required>
                <Select
                  name="leave_type_id"
                  required
                  placeholder="Select leave type"
                  options={leaveTypes.filter(lt => lt.is_active).map(lt => ({ value: lt.id, label: lt.name }))}
                />
              </FormField>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="Start Date" required>
                  <Input name="start_date" type="date" required />
                </FormField>
                <FormField label="End Date" required>
                  <Input name="end_date" type="date" required />
                </FormField>
              </div>

              <FormField label="Days" required>
                <Input name="days" type="number" min={0.5} step={0.5} required placeholder="e.g. 3" />
              </FormField>

              <FormField label="Notes">
                <Textarea name="notes" placeholder="Optional notes..." />
              </FormField>
            </form>
          </Modal>
        </div>
      )}

      {/* -- Time ---------------------------------------------------- */}
      {section === 'time' && (
        <div>
          <DataTable
            columns={[
              { key: 'date', header: 'Date', render: (te: TimeEntry) => <span className="text-white">{formatDate(te.date)}</span> },
              { key: 'hours', header: 'Hours', render: (te: TimeEntry) => <span className="text-white">{te.hours}</span> },
              { key: 'project', header: 'Project', render: (te: TimeEntry) => <span className="text-gray-400">{te.project || '\u2014'}</span> },
              { key: 'description', header: 'Description', render: (te: TimeEntry) => <span className="text-gray-400">{te.description || '\u2014'}</span>, className: 'hidden md:table-cell' },
            ]}
            data={timeEntries}
            keyField="id"
            emptyIcon="⏱️"
            emptyMessage="No time entries"
          />
        </div>
      )}

      {/* -- Documents ----------------------------------------------- */}
      {section === 'documents' && (
        <div>
          <DataTable
            columns={[
              { key: 'name', header: 'Name', render: (doc: Document) => <span className="text-white">{doc.name}</span> },
              { key: 'category', header: 'Category', render: (doc: Document) => <span className="text-gray-400">{doc.category}</span> },
              { key: 'expiry_date', header: 'Expiry', render: (doc: Document) => <span className="text-gray-400">{formatDate(doc.expiry_date)}</span>, className: 'hidden md:table-cell' },
              { key: 'created_at', header: 'Uploaded', render: (doc: Document) => <span className="text-gray-400">{formatDate(doc.created_at)}</span>, className: 'hidden md:table-cell' },
            ]}
            data={documents}
            keyField="id"
            emptyIcon="📄"
            emptyMessage="No documents"
          />
        </div>
      )}

      {/* -- Onboarding ---------------------------------------------- */}
      {section === 'onboarding' && (
        <div>
          {onboarding.length === 0 ? (
            <EmptyState icon="📋" message="No onboarding checklists" />
          ) : (
            <div className="space-y-4">
              {onboarding.map(cl => (
                <div key={cl.id} className="bg-gray-900 border border-gray-800 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-white">{cl.template_name || 'Onboarding Checklist'}</h3>
                      <p className="text-xs text-gray-500">Started {formatDate(cl.started_at)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400">{cl.completed_tasks}/{cl.total_tasks}</span>
                      <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all"
                          style={{ width: cl.total_tasks > 0 ? `${(cl.completed_tasks / cl.total_tasks) * 100}%` : '0%' }}
                        />
                      </div>
                      <StatusBadge status={cl.status} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    {(cl.tasks ?? []).map(task => (
                      <div key={task.id} className="flex items-center gap-3 px-3 py-2 rounded">
                        <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${
                          task.status === 'completed' ? 'bg-emerald-600 border-emerald-600' : 'border-gray-600'
                        }`}>
                          {task.status === 'completed' && (
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <span className={`text-sm flex-1 ${task.status === 'completed' ? 'text-gray-500 line-through' : 'text-white'}`}>
                          {task.title}
                        </span>
                        {task.due_date && <span className="text-xs text-gray-500">Due {formatDate(task.due_date)}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
