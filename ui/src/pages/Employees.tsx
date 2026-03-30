import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import EmployeeLink from '../components/EmployeeLink'
import { fetchEmployees, fetchDepartments, fetchPositions, createEmployee, updateEmployee, fetchDocuments, fetchLeaveRequests, fetchTimeEntries, createLeaveRequest, createTimeEntry, createDocument, createGoal, fetchLeaveTypes, fetchGoals } from '../api'
import { fetchCompensation, createCompensation } from '../modules/compensation/api'
import { fetchEmergencyContacts } from '../modules/emergency-contacts/api'
import { fetchAssets } from '../modules/assets/api'
import { fetchJobHistory } from '../modules/job-history/api'
import { fetchEmployeeSkills } from '../modules/skills/api'
import { fetchDisciplinaryActions } from '../modules/disciplinary/api'
import type { Employee, Department, Position, LeaveRequest, LeaveType, TimeEntry } from '../types'
import type { CompensationRecord } from '../modules/compensation/types'
import type { Document } from '../modules/documents/types'
import type { Goal } from '../types'
import type { EmergencyContact } from '../modules/emergency-contacts/types'
import type { Asset } from '../modules/assets/types'
import type { JobHistoryEntry } from '../modules/job-history/types'
import type { EmployeeSkill } from '../modules/skills/types'
import type { DisciplinaryAction } from '../modules/disciplinary/types'
import StatusBadge from '../components/StatusBadge'
import Avatar from '../components/Avatar'
import { Input, Select, Textarea, FormField } from '../components/FormField'
import { SkeletonTable } from '../components/Skeleton'
import PageHeader from '../components/PageHeader'
import DataTable from '../components/DataTable'
import Tabs from '../components/Tabs'
import Modal from '../components/Modal'
import Button from '../components/Button'
import { useToast } from '../components/Toast'
import { formatDate } from '../utils/format'

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'on_leave', label: 'On Leave' },
]

const EMPLOYMENT_TYPE_OPTIONS = [
  { value: 'full_time', label: 'Full Time' },
  { value: 'part_time', label: 'Part Time' },
  { value: 'contractor', label: 'Contractor' },
  { value: 'casual', label: 'Casual' },
  { value: 'intern', label: 'Intern' },
]

const EMPTY_FORM = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  department_id: '',
  position_id: '',
  start_date: '',
  status: 'active',
  employment_type: 'full_time',
  location: '',
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('en-NZ', { style: 'currency', currency }).format(amount)
}

const COMP_EMPTY = { effective_date: '', salary: '', currency: 'NZD', pay_frequency: 'annual', reason: '', notes: '' }
const LEAVE_EMPTY = { leave_type_id: '', start_date: '', end_date: '', days: '', notes: '' }
const TIME_EMPTY = { date: '', hours: '', project: '', description: '' }
const DOC_EMPTY = { name: '', category: 'general', description: '', expiry_date: '' }
const GOAL_EMPTY = { title: '', description: '', due_date: '', status: 'not_started', progress: '0' }

function EmployeeDetail({
  employee,
  onBack,
  onEdit,
}: {
  employee: Employee
  onBack: () => void
  onEdit: (emp: Employee) => void
}) {
  const navigate = useNavigate()
  const toast = useToast()
  const [activeTab, setActiveTab] = useState('compensation')
  const [compensation, setCompensation] = useState<CompensationRecord[]>([])
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([])
  const [assets, setAssets] = useState<Asset[]>([])
  const [jobHistory, setJobHistory] = useState<JobHistoryEntry[]>([])
  const [employeeSkills, setEmployeeSkills] = useState<EmployeeSkill[]>([])
  const [disciplinaryActions, setDisciplinaryActions] = useState<DisciplinaryAction[]>([])
  const [tabLoading, setTabLoading] = useState(false)

  // Modal visibility
  const [showCompForm, setShowCompForm] = useState(false)
  const [showLeaveForm, setShowLeaveForm] = useState(false)
  const [showTimeForm, setShowTimeForm] = useState(false)
  const [showDocForm, setShowDocForm] = useState(false)
  const [showGoalForm, setShowGoalForm] = useState(false)

  // Form state
  const [compForm, setCompForm] = useState(COMP_EMPTY)
  const [leaveForm, setLeaveForm] = useState(LEAVE_EMPTY)
  const [timeForm, setTimeForm] = useState(TIME_EMPTY)
  const [docForm, setDocForm] = useState(DOC_EMPTY)
  const [goalForm, setGoalForm] = useState(GOAL_EMPTY)

  // Leave types for the dropdown
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([])

  // Submitting flag
  const [formSubmitting, setFormSubmitting] = useState(false)

  // Fetch leave types when leave tab is opened or leave modal is shown
  useEffect(() => {
    if (activeTab === 'leave' || showLeaveForm) {
      fetchLeaveTypes().then(setLeaveTypes).catch(() => {})
    }
  }, [activeTab, showLeaveForm])

  const loadTab = (tab: string) => {
    setTabLoading(true)
    if (tab === 'compensation') {
      fetchCompensation({ employee_id: employee.id }).then(setCompensation).catch(() => {}).finally(() => setTabLoading(false))
    } else if (tab === 'leave') {
      fetchLeaveRequests().then(all => setLeaveRequests(all.filter(r => r.employee_id === employee.id))).catch(() => {}).finally(() => setTabLoading(false))
    } else if (tab === 'time') {
      fetchTimeEntries({ employee_id: employee.id } as Record<string, string>).then(setTimeEntries).catch(() => {}).finally(() => setTabLoading(false))
    } else if (tab === 'documents') {
      fetchDocuments({ employee_id: employee.id }).then(setDocuments).catch(() => {}).finally(() => setTabLoading(false))
    } else if (tab === 'goals') {
      fetchGoals().then(all => setGoals(all.filter(g => g.employee_id === employee.id))).catch(() => {}).finally(() => setTabLoading(false))
    } else if (tab === 'emergency-contacts') {
      fetchEmergencyContacts(employee.id).then(setEmergencyContacts).catch(() => {}).finally(() => setTabLoading(false))
    } else if (tab === 'assets') {
      fetchAssets({ assigned_to: employee.id }).then(setAssets).catch(() => {}).finally(() => setTabLoading(false))
    } else if (tab === 'job-history') {
      fetchJobHistory(employee.id).then(setJobHistory).catch(() => {}).finally(() => setTabLoading(false))
    } else if (tab === 'skills') {
      fetchEmployeeSkills({ employee_id: employee.id }).then(setEmployeeSkills).catch(() => {}).finally(() => setTabLoading(false))
    } else if (tab === 'disciplinary') {
      fetchDisciplinaryActions({ employee_id: employee.id }).then(setDisciplinaryActions).catch(() => {}).finally(() => setTabLoading(false))
    } else {
      setTabLoading(false)
    }
  }

  useEffect(() => { loadTab(activeTab) }, [activeTab, employee.id])

  // Form handlers
  const handleCompSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormSubmitting(true)
    try {
      await createCompensation({ ...compForm, employee_id: employee.id, salary: Number(compForm.salary), notes: compForm.notes || null, reason: compForm.reason || null })
      toast.success('Compensation record added')
      setShowCompForm(false)
      setCompForm(COMP_EMPTY)
      loadTab('compensation')
    } catch { toast.error('Failed to add compensation record') }
    finally { setFormSubmitting(false) }
  }

  const handleLeaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormSubmitting(true)
    try {
      await createLeaveRequest({ ...leaveForm, employee_id: employee.id, days: Number(leaveForm.days), notes: leaveForm.notes || null })
      toast.success('Leave request submitted')
      setShowLeaveForm(false)
      setLeaveForm(LEAVE_EMPTY)
      loadTab('leave')
    } catch { toast.error('Failed to submit leave request') }
    finally { setFormSubmitting(false) }
  }

  const handleTimeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormSubmitting(true)
    try {
      await createTimeEntry({ ...timeForm, employee_id: employee.id, hours: Number(timeForm.hours), description: timeForm.description || null, project: timeForm.project || null })
      toast.success('Time entry logged')
      setShowTimeForm(false)
      setTimeForm(TIME_EMPTY)
      loadTab('time')
    } catch { toast.error('Failed to log time entry') }
    finally { setFormSubmitting(false) }
  }

  const handleDocSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormSubmitting(true)
    try {
      await createDocument({ ...docForm, employee_id: employee.id, description: docForm.description || null, expiry_date: docForm.expiry_date || null })
      toast.success('Document added')
      setShowDocForm(false)
      setDocForm(DOC_EMPTY)
      loadTab('documents')
    } catch { toast.error('Failed to add document') }
    finally { setFormSubmitting(false) }
  }

  const handleGoalSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormSubmitting(true)
    try {
      await createGoal({ ...goalForm, employee_id: employee.id, progress: Number(goalForm.progress), description: goalForm.description || null, due_date: goalForm.due_date || null })
      toast.success('Goal created')
      setShowGoalForm(false)
      setGoalForm(GOAL_EMPTY)
      loadTab('goals')
    } catch { toast.error('Failed to create goal') }
    finally { setFormSubmitting(false) }
  }

  const fullName = `${employee.first_name} ${employee.last_name}`

  return (
    <div>
      <Button variant="ghost" size="sm" onClick={onBack} className="mb-4">
        &larr; Back to Directory
      </Button>

      {/* Header card */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-6">
        <div className="flex items-start gap-6">
          <Avatar name={fullName} imageUrl={employee.avatar_url} size="xl" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="text-xl font-semibold text-white">{fullName}</h2>
                <p className="text-sm text-gray-400">{employee.position_title || 'No position'} {employee.department_name ? `\u00B7 ${employee.department_name}` : ''}</p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={employee.status} />
                {employee.employment_type && <StatusBadge status={employee.employment_type} />}
                <Button size="sm" variant="secondary" onClick={() => navigate('/onboarding')}>Start Onboarding</Button>
                <Button size="sm" onClick={() => onEdit(employee)}>Edit</Button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Email</p>
                <p className="text-sm text-gray-300">{employee.email}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Phone</p>
                <p className="text-sm text-gray-300">{employee.phone || '\u2014'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Manager</p>
                <p className="text-sm text-gray-300">{employee.manager_name || '\u2014'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Start Date</p>
                <p className="text-sm text-gray-300">{formatDate(employee.start_date)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Address</p>
                <p className="text-sm text-gray-300">{employee.address || '\u2014'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Emergency Contact</p>
                <p className="text-sm text-gray-300">{employee.emergency_contact || '\u2014'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Location</p>
                <p className="text-sm text-gray-300">{employee.location || '\u2014'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4">
        <Tabs
          tabs={[
            { key: 'compensation', label: 'Compensation' },
            { key: 'leave', label: 'Leave Requests' },
            { key: 'time', label: 'Time Entries' },
            { key: 'documents', label: 'Documents' },
            { key: 'goals', label: 'Goals' },
            { key: 'job-history', label: 'Job History' },
            { key: 'skills', label: 'Skills' },
            { key: 'emergency-contacts', label: 'Emergency Contacts' },
            { key: 'assets', label: 'Assets' },
            { key: 'disciplinary', label: 'Disciplinary' },
          ]}
          active={activeTab}
          onChange={setActiveTab}
        />
      </div>

      {/* Tab content */}
      {tabLoading ? (
        <SkeletonTable rows={3} cols={4} />
      ) : (
        <>
          {activeTab === 'compensation' && (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-400">{compensation.length} records</h3>
                <Button size="sm" onClick={() => setShowCompForm(true)}>Add Compensation Record</Button>
              </div>
              {compensation.length === 0 ? (
                <p className="text-gray-500 text-sm py-8 text-center">No compensation records</p>
              ) : (
                <DataTable
                  columns={[
                    { key: 'effective_date', header: 'Effective Date', render: (r: CompensationRecord) => <span className="text-gray-400">{formatDate(r.effective_date)}</span> },
                    { key: 'salary', header: 'Salary', render: (r: CompensationRecord) => <span className="text-emerald-400 font-medium">{formatCurrency(r.salary, r.currency)}</span> },
                    { key: 'pay_frequency', header: 'Frequency', render: (r: CompensationRecord) => <span className="text-gray-400 capitalize">{r.pay_frequency}</span> },
                    { key: 'reason', header: 'Reason', render: (r: CompensationRecord) => <span className="text-gray-400 capitalize">{r.reason || '\u2014'}</span> },
                  ]}
                  data={compensation}
                  keyField="id"
                />
              )}
            </>
          )}
          {activeTab === 'leave' && (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-400">{leaveRequests.length} records</h3>
                <Button size="sm" onClick={() => setShowLeaveForm(true)}>Submit Leave Request</Button>
              </div>
              {leaveRequests.length === 0 ? (
                <p className="text-gray-500 text-sm py-8 text-center">No leave requests</p>
              ) : (
                <DataTable
                  columns={[
                    { key: 'leave_type_name', header: 'Type', render: (r: LeaveRequest) => <span className="text-gray-300">{r.leave_type_name || '\u2014'}</span> },
                    { key: 'start_date', header: 'Start', render: (r: LeaveRequest) => <span className="text-gray-400">{formatDate(r.start_date)}</span> },
                    { key: 'end_date', header: 'End', render: (r: LeaveRequest) => <span className="text-gray-400">{formatDate(r.end_date)}</span> },
                    { key: 'days', header: 'Days', render: (r: LeaveRequest) => <span className="text-white">{r.days}</span> },
                    { key: 'status', header: 'Status', render: (r: LeaveRequest) => <StatusBadge status={r.status} /> },
                  ]}
                  data={leaveRequests}
                  keyField="id"
                />
              )}
            </>
          )}
          {activeTab === 'time' && (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-400">{timeEntries.length} records</h3>
                <Button size="sm" onClick={() => setShowTimeForm(true)}>Log Time Entry</Button>
              </div>
              {timeEntries.length === 0 ? (
                <p className="text-gray-500 text-sm py-8 text-center">No time entries</p>
              ) : (
                <DataTable
                  columns={[
                    { key: 'date', header: 'Date', render: (r: TimeEntry) => <span className="text-gray-400">{formatDate(r.date)}</span> },
                    { key: 'hours', header: 'Hours', render: (r: TimeEntry) => <span className="text-white font-medium">{r.hours}h</span> },
                    { key: 'project', header: 'Project', render: (r: TimeEntry) => <span className="text-gray-400">{r.project || '\u2014'}</span> },
                    { key: 'description', header: 'Description', render: (r: TimeEntry) => <span className="text-gray-400">{r.description || '\u2014'}</span> },
                  ]}
                  data={timeEntries}
                  keyField="id"
                />
              )}
            </>
          )}
          {activeTab === 'documents' && (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-400">{documents.length} records</h3>
                <Button size="sm" onClick={() => setShowDocForm(true)}>Add Document</Button>
              </div>
              {documents.length === 0 ? (
                <p className="text-gray-500 text-sm py-8 text-center">No documents</p>
              ) : (
                <DataTable
                  columns={[
                    { key: 'name', header: 'Name', render: (r: Document) => <span className="text-white">{r.name}</span> },
                    { key: 'category', header: 'Category', render: (r: Document) => <span className="text-gray-400 capitalize">{r.category}</span> },
                    { key: 'expiry_date', header: 'Expiry', render: (r: Document) => <span className="text-gray-400">{r.expiry_date ? formatDate(r.expiry_date) : '\u2014'}</span> },
                    { key: 'created_at', header: 'Created', render: (r: Document) => <span className="text-gray-400">{formatDate(r.created_at)}</span> },
                  ]}
                  data={documents}
                  keyField="id"
                />
              )}
            </>
          )}
          {activeTab === 'goals' && (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-400">{goals.length} records</h3>
                <Button size="sm" onClick={() => setShowGoalForm(true)}>Add Goal</Button>
              </div>
              {goals.length === 0 ? (
                <p className="text-gray-500 text-sm py-8 text-center">No goals</p>
              ) : (
                <DataTable
                  columns={[
                    { key: 'title', header: 'Goal', render: (g: Goal) => <span className="text-white">{g.title}</span> },
                    { key: 'progress', header: 'Progress', render: (g: Goal) => (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-800 rounded-full h-2 min-w-[60px]">
                          <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${g.progress}%` }} />
                        </div>
                        <span className="text-xs text-gray-400 w-8">{g.progress}%</span>
                      </div>
                    )},
                    { key: 'due_date', header: 'Due', render: (g: Goal) => <span className="text-gray-400">{formatDate(g.due_date)}</span> },
                    { key: 'status', header: 'Status', render: (g: Goal) => <StatusBadge status={g.status} /> },
                  ]}
                  data={goals}
                  keyField="id"
                />
              )}
            </>
          )}
          {activeTab === 'job-history' && (
            <>
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-400">{jobHistory.length} records</h3>
              </div>
              {jobHistory.length === 0 ? (
                <p className="text-gray-500 text-sm py-8 text-center">No job history</p>
              ) : (
                <DataTable
                  columns={[
                    { key: 'effective_date', header: 'Effective Date', render: (r: JobHistoryEntry) => <span className="text-gray-400">{formatDate(r.effective_date)}</span> },
                    { key: 'position_title', header: 'Position', render: (r: JobHistoryEntry) => <span className="text-white">{r.position_title || '—'}</span> },
                    { key: 'department_name', header: 'Department', render: (r: JobHistoryEntry) => <span className="text-gray-400">{r.department_name || '—'}</span> },
                    { key: 'employment_type', header: 'Type', render: (r: JobHistoryEntry) => <span className="text-gray-400 capitalize">{r.employment_type || '—'}</span> },
                    { key: 'reason', header: 'Reason', render: (r: JobHistoryEntry) => <span className="text-gray-400">{r.reason || '—'}</span> },
                  ]}
                  data={jobHistory}
                  keyField="id"
                />
              )}
            </>
          )}
          {activeTab === 'skills' && (
            <>
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-400">{employeeSkills.length} skills</h3>
              </div>
              {employeeSkills.length === 0 ? (
                <p className="text-gray-500 text-sm py-8 text-center">No skills recorded</p>
              ) : (
                <DataTable
                  columns={[
                    { key: 'skill_name', header: 'Skill', render: (r: EmployeeSkill) => <span className="text-white font-medium">{r.skill_name}</span> },
                    { key: 'proficiency_level', header: 'Proficiency', render: (r: EmployeeSkill) => <span className="text-gray-400 capitalize">{r.proficiency_level || '—'}</span> },
                    { key: 'years_experience', header: 'Years', render: (r: EmployeeSkill) => <span className="text-gray-400">{r.years_experience != null ? `${r.years_experience} yr${r.years_experience !== 1 ? 's' : ''}` : '—'}</span> },
                    { key: 'notes', header: 'Notes', render: (r: EmployeeSkill) => <span className="text-gray-400">{r.notes || '—'}</span> },
                  ]}
                  data={employeeSkills}
                  keyField="id"
                />
              )}
            </>
          )}
          {activeTab === 'emergency-contacts' && (
            <>
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-400">{emergencyContacts.length} contacts</h3>
              </div>
              {emergencyContacts.length === 0 ? (
                <p className="text-gray-500 text-sm py-8 text-center">No emergency contacts</p>
              ) : (
                <DataTable
                  columns={[
                    { key: 'contact_name', header: 'Name', render: (r: EmergencyContact) => (
                      <span className="text-white font-medium">{r.contact_name}{r.is_primary ? <span className="ml-2 text-xs text-amber-400">Primary</span> : null}</span>
                    )},
                    { key: 'relationship', header: 'Relationship', render: (r: EmergencyContact) => <span className="text-gray-400 capitalize">{r.relationship || '—'}</span> },
                    { key: 'phone', header: 'Phone', render: (r: EmergencyContact) => <span className="text-gray-400">{r.phone || '—'}</span> },
                    { key: 'email', header: 'Email', render: (r: EmergencyContact) => <span className="text-gray-400">{r.email || '—'}</span> },
                  ]}
                  data={emergencyContacts}
                  keyField="id"
                />
              )}
            </>
          )}
          {activeTab === 'assets' && (
            <>
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-400">{assets.length} assets</h3>
              </div>
              {assets.length === 0 ? (
                <p className="text-gray-500 text-sm py-8 text-center">No assets assigned</p>
              ) : (
                <DataTable
                  columns={[
                    { key: 'name', header: 'Asset', render: (r: Asset) => <span className="text-white font-medium">{r.name}</span> },
                    { key: 'category', header: 'Category', render: (r: Asset) => <span className="text-gray-400 capitalize">{r.category || '—'}</span> },
                    { key: 'asset_tag', header: 'Tag', render: (r: Asset) => <span className="text-gray-400 font-mono text-xs">{r.asset_tag || '—'}</span> },
                    { key: 'status', header: 'Status', render: (r: Asset) => <StatusBadge status={r.status} /> },
                    { key: 'assigned_date', header: 'Assigned', render: (r: Asset) => <span className="text-gray-400">{r.assigned_date ? formatDate(r.assigned_date) : '—'}</span> },
                  ]}
                  data={assets}
                  keyField="id"
                />
              )}
            </>
          )}
          {activeTab === 'disciplinary' && (
            <>
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-400">{disciplinaryActions.length} records</h3>
              </div>
              {disciplinaryActions.length === 0 ? (
                <p className="text-gray-500 text-sm py-8 text-center">No disciplinary records</p>
              ) : (
                <DataTable
                  columns={[
                    { key: 'action_date', header: 'Date', render: (r: DisciplinaryAction) => <span className="text-gray-400">{formatDate(r.action_date)}</span> },
                    { key: 'action_type', header: 'Type', render: (r: DisciplinaryAction) => <span className="text-white capitalize">{r.action_type.replace(/_/g, ' ')}</span> },
                    { key: 'description', header: 'Description', render: (r: DisciplinaryAction) => <span className="text-gray-400">{r.description || '—'}</span> },
                    { key: 'status', header: 'Status', render: (r: DisciplinaryAction) => <StatusBadge status={r.status} /> },
                  ]}
                  data={disciplinaryActions}
                  keyField="id"
                />
              )}
            </>
          )}
        </>
      )}

      {/* Compensation Modal */}
      <Modal
        open={showCompForm}
        onClose={() => setShowCompForm(false)}
        title="Add Compensation Record"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowCompForm(false)} disabled={formSubmitting}>Cancel</Button>
            <Button type="submit" form="comp-form" loading={formSubmitting}>Add Record</Button>
          </>
        }
      >
        <form id="comp-form" onSubmit={handleCompSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Effective Date" required>
            <Input type="date" value={compForm.effective_date} onChange={e => setCompForm(f => ({ ...f, effective_date: e.target.value }))} required />
          </FormField>
          <FormField label="Salary" required>
            <Input type="number" min="0" step="0.01" value={compForm.salary} onChange={e => setCompForm(f => ({ ...f, salary: e.target.value }))} required placeholder="e.g. 85000" />
          </FormField>
          <FormField label="Currency" required>
            <Select value={compForm.currency} onChange={e => setCompForm(f => ({ ...f, currency: e.target.value }))} options={[{ value: 'NZD', label: 'NZD' }, { value: 'AUD', label: 'AUD' }, { value: 'USD', label: 'USD' }]} />
          </FormField>
          <FormField label="Pay Frequency" required>
            <Select value={compForm.pay_frequency} onChange={e => setCompForm(f => ({ ...f, pay_frequency: e.target.value }))} options={[{ value: 'annual', label: 'Annual' }, { value: 'monthly', label: 'Monthly' }, { value: 'hourly', label: 'Hourly' }]} />
          </FormField>
          <FormField label="Reason">
            <Input value={compForm.reason} onChange={e => setCompForm(f => ({ ...f, reason: e.target.value }))} placeholder="e.g. Annual review" />
          </FormField>
          <FormField label="Notes">
            <Input value={compForm.notes} onChange={e => setCompForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes" />
          </FormField>
        </form>
      </Modal>

      {/* Leave Modal */}
      <Modal
        open={showLeaveForm}
        onClose={() => setShowLeaveForm(false)}
        title="Submit Leave Request"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowLeaveForm(false)} disabled={formSubmitting}>Cancel</Button>
            <Button type="submit" form="leave-form" loading={formSubmitting}>Submit Request</Button>
          </>
        }
      >
        <form id="leave-form" onSubmit={handleLeaveSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Leave Type" required>
            <Select value={leaveForm.leave_type_id} onChange={e => setLeaveForm(f => ({ ...f, leave_type_id: e.target.value }))} placeholder="Select leave type" options={leaveTypes.map(lt => ({ value: lt.id, label: lt.name }))} required />
          </FormField>
          <FormField label="Days" required>
            <Input type="number" min="0.5" step="0.5" value={leaveForm.days} onChange={e => setLeaveForm(f => ({ ...f, days: e.target.value }))} required placeholder="e.g. 5" />
          </FormField>
          <FormField label="Start Date" required>
            <Input type="date" value={leaveForm.start_date} onChange={e => setLeaveForm(f => ({ ...f, start_date: e.target.value }))} required />
          </FormField>
          <FormField label="End Date" required>
            <Input type="date" value={leaveForm.end_date} onChange={e => setLeaveForm(f => ({ ...f, end_date: e.target.value }))} required />
          </FormField>
          <div className="md:col-span-2">
            <FormField label="Notes">
              <Textarea value={leaveForm.notes} onChange={e => setLeaveForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes" rows={3} />
            </FormField>
          </div>
        </form>
      </Modal>

      {/* Time Entry Modal */}
      <Modal
        open={showTimeForm}
        onClose={() => setShowTimeForm(false)}
        title="Log Time Entry"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowTimeForm(false)} disabled={formSubmitting}>Cancel</Button>
            <Button type="submit" form="time-form" loading={formSubmitting}>Log Entry</Button>
          </>
        }
      >
        <form id="time-form" onSubmit={handleTimeSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Date" required>
            <Input type="date" value={timeForm.date} onChange={e => setTimeForm(f => ({ ...f, date: e.target.value }))} required />
          </FormField>
          <FormField label="Hours" required>
            <Input type="number" min="0.25" step="0.25" value={timeForm.hours} onChange={e => setTimeForm(f => ({ ...f, hours: e.target.value }))} required placeholder="e.g. 8" />
          </FormField>
          <FormField label="Project">
            <Input value={timeForm.project} onChange={e => setTimeForm(f => ({ ...f, project: e.target.value }))} placeholder="Project name" />
          </FormField>
          <FormField label="Description">
            <Input value={timeForm.description} onChange={e => setTimeForm(f => ({ ...f, description: e.target.value }))} placeholder="What did you work on?" />
          </FormField>
        </form>
      </Modal>

      {/* Document Modal */}
      <Modal
        open={showDocForm}
        onClose={() => setShowDocForm(false)}
        title="Add Document"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowDocForm(false)} disabled={formSubmitting}>Cancel</Button>
            <Button type="submit" form="doc-form" loading={formSubmitting}>Add Document</Button>
          </>
        }
      >
        <form id="doc-form" onSubmit={handleDocSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Name" required>
            <Input value={docForm.name} onChange={e => setDocForm(f => ({ ...f, name: e.target.value }))} required placeholder="Document name" />
          </FormField>
          <FormField label="Category" required>
            <Select value={docForm.category} onChange={e => setDocForm(f => ({ ...f, category: e.target.value }))} options={[
              { value: 'contract', label: 'Contract' },
              { value: 'policy', label: 'Policy' },
              { value: 'certification', label: 'Certification' },
              { value: 'id', label: 'ID' },
              { value: 'tax', label: 'Tax' },
              { value: 'performance', label: 'Performance' },
              { value: 'general', label: 'General' },
            ]} />
          </FormField>
          <FormField label="Description">
            <Input value={docForm.description} onChange={e => setDocForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief description" />
          </FormField>
          <FormField label="Expiry Date">
            <Input type="date" value={docForm.expiry_date} onChange={e => setDocForm(f => ({ ...f, expiry_date: e.target.value }))} />
          </FormField>
        </form>
      </Modal>

      {/* Goal Modal */}
      <Modal
        open={showGoalForm}
        onClose={() => setShowGoalForm(false)}
        title="Add Goal"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowGoalForm(false)} disabled={formSubmitting}>Cancel</Button>
            <Button type="submit" form="goal-form" loading={formSubmitting}>Add Goal</Button>
          </>
        }
      >
        <form id="goal-form" onSubmit={handleGoalSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Title" required>
            <Input value={goalForm.title} onChange={e => setGoalForm(f => ({ ...f, title: e.target.value }))} required placeholder="Goal title" />
          </FormField>
          <FormField label="Due Date">
            <Input type="date" value={goalForm.due_date} onChange={e => setGoalForm(f => ({ ...f, due_date: e.target.value }))} />
          </FormField>
          <FormField label="Status">
            <Select value={goalForm.status} onChange={e => setGoalForm(f => ({ ...f, status: e.target.value }))} options={[
              { value: 'not_started', label: 'Not Started' },
              { value: 'in_progress', label: 'In Progress' },
              { value: 'completed', label: 'Completed' },
            ]} />
          </FormField>
          <FormField label="Progress (0-100)">
            <Input type="number" min="0" max="100" value={goalForm.progress} onChange={e => setGoalForm(f => ({ ...f, progress: e.target.value }))} placeholder="0" />
          </FormField>
          <div className="md:col-span-2">
            <FormField label="Description">
              <Textarea value={goalForm.description} onChange={e => setGoalForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe the goal" rows={3} />
            </FormField>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default function Employees() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Employee | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const toast = useToast()

  // Auto-select employee from URL query param (e.g. /employees?id=xxx)
  useEffect(() => {
    const id = searchParams.get('id')
    if (id && employees.length > 0) {
      const emp = employees.find(e => e.id === id)
      if (emp) {
        setSelectedEmployee(emp)
        setSearchParams({}, { replace: true })
      }
    }
  }, [employees, searchParams])

  const loadData = () => {
    setLoading(true)
    Promise.all([
      fetchEmployees().then(r => setEmployees(r.employees)),
      fetchDepartments().then(setDepartments),
      fetchPositions().then(setPositions),
    ])
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [])

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setShowModal(true)
  }

  const openEdit = (emp: Employee) => {
    setEditing(emp)
    setForm({
      first_name: emp.first_name,
      last_name: emp.last_name,
      email: emp.email,
      phone: emp.phone || '',
      department_id: emp.department_id || '',
      position_id: emp.position_id || '',
      start_date: emp.start_date || '',
      status: emp.status,
      employment_type: emp.employment_type || 'full_time',
      location: emp.location || '',
    })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditing(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const body = {
        ...form,
        department_id: form.department_id || null,
        position_id: form.position_id || null,
        phone: form.phone || null,
        start_date: form.start_date || null,
        employment_type: form.employment_type || 'full_time',
        location: form.location || null,
      }
      if (editing) {
        await updateEmployee(editing.id, body)
        toast.success('Employee updated')
      } else {
        await createEmployee(body)
        toast.success('Employee created')
      }
      closeModal()
      loadData()
    } catch {
      toast.error(editing ? 'Failed to update employee' : 'Failed to create employee')
    } finally {
      setSubmitting(false)
    }
  }

  const filtered = employees.filter(e => {
    const term = search.toLowerCase()
    return (
      `${e.first_name} ${e.last_name}`.toLowerCase().includes(term) ||
      e.email.toLowerCase().includes(term) ||
      (e.department_name || '').toLowerCase().includes(term)
    )
  })

  const columns = [
    {
      key: 'last_name',
      header: 'Name',
      sortable: true,
      render: (emp: Employee) => (
        <div className="flex items-center gap-3">
          <Avatar name={`${emp.first_name} ${emp.last_name}`} imageUrl={emp.avatar_url} size="md" />
          <EmployeeLink employeeId={emp.id} name={`${emp.first_name} ${emp.last_name}`} />
        </div>
      ),
    },
    { key: 'email', header: 'Email', sortable: true, render: (emp: Employee) => <span className="text-gray-400">{emp.email}</span> },
    { key: 'department_name', header: 'Department', sortable: true, className: 'hidden md:table-cell', render: (emp: Employee) => <span className="text-gray-400">{emp.department_name || '\u2014'}</span> },
    { key: 'position_title', header: 'Position', sortable: true, className: 'hidden lg:table-cell', render: (emp: Employee) => <span className="text-gray-400">{emp.position_title || '\u2014'}</span> },
    { key: 'start_date', header: 'Start Date', className: 'hidden lg:table-cell', render: (emp: Employee) => <span className="text-gray-400">{formatDate(emp.start_date)}</span> },
    { key: 'status', header: 'Status', render: (emp: Employee) => <StatusBadge status={emp.status} /> },
  ]

  if (loading) {
    return (
      <div>
        <PageHeader title="Employee Directory" subtitle="Manage your workforce" />
        <SkeletonTable rows={8} cols={5} />
      </div>
    )
  }

  const employeeModal = (
    <Modal
      open={showModal}
      onClose={closeModal}
      title={editing ? 'Edit Employee' : 'Add Employee'}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={closeModal} disabled={submitting}>Cancel</Button>
          <Button type="submit" form="employee-form" loading={submitting}>
            {editing ? 'Save Changes' : 'Add Employee'}
          </Button>
        </>
      }
    >
      <form id="employee-form" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField label="First Name" required>
          <Input value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} required placeholder="First name" />
        </FormField>
        <FormField label="Last Name" required>
          <Input value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} required placeholder="Last name" />
        </FormField>
        <FormField label="Email" required>
          <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required placeholder="email@company.com" />
        </FormField>
        <FormField label="Phone">
          <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="Phone number" />
        </FormField>
        <FormField label="Department">
          <Select value={form.department_id} onChange={e => setForm(f => ({ ...f, department_id: e.target.value }))} placeholder="Select department" options={departments.map(d => ({ value: d.id, label: d.name }))} />
        </FormField>
        <FormField label="Position">
          <Select value={form.position_id} onChange={e => setForm(f => ({ ...f, position_id: e.target.value }))} placeholder="Select position" options={positions.map(p => ({ value: p.id, label: p.title }))} />
        </FormField>
        <FormField label="Start Date">
          <Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
        </FormField>
        <FormField label="Status">
          <Select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} options={STATUS_OPTIONS} />
        </FormField>
        <FormField label="Employment Type">
          <Select value={form.employment_type} onChange={e => setForm(f => ({ ...f, employment_type: e.target.value }))} options={EMPLOYMENT_TYPE_OPTIONS} />
        </FormField>
        <FormField label="Location">
          <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="e.g. Auckland, Remote" />
        </FormField>
      </form>
    </Modal>
  )

  // Detail view
  if (selectedEmployee) {
    return (
      <>
        {employeeModal}
        <EmployeeDetail
          employee={selectedEmployee}
          onBack={() => setSelectedEmployee(null)}
          onEdit={(emp) => {
            openEdit(emp)
          }}
        />
      </>
    )
  }

  return (
    <div>
      <PageHeader
        title="Employee Directory"
        subtitle="Manage your workforce"
        actions={<Button onClick={openCreate}>Add Employee</Button>}
      />

      <div className="mb-4">
        <Input
          type="text"
          placeholder="Search by name, email, department..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        keyField="id"
        emptyIcon="👥"
        emptyMessage="No employees found"
        onRowClick={(emp) => setSelectedEmployee(emp)}
        striped
      />

      {employeeModal}
    </div>
  )
}
