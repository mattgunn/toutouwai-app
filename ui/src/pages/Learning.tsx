import { useState, useEffect } from 'react'
import { formatDate } from '../utils/format'
import {
  fetchCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  fetchEnrollments,
  createEnrollment,
  fetchCertifications,
  createCertification,
  updateCertification,
  deleteCertification,
} from '../modules/learning/api'
import { fetchEmployees } from '../modules/employees/api'
import type { Course, CourseEnrollment, Certification } from '../modules/learning/types'
import type { Employee } from '../modules/employees/types'
import StatusBadge from '../components/StatusBadge'
import EmployeeLink from '../components/EmployeeLink'
import Button from '../components/Button'
import { FormField, Input, Select, Textarea } from '../components/FormField'
import Tabs from '../components/Tabs'
import Modal from '../components/Modal'
import { SkeletonTable } from '../components/Skeleton'
import ConfirmDialog from '../components/ConfirmDialog'
import { useToast } from '../components/Toast'
import PageHeader from '../components/PageHeader'
import DataTable from '../components/DataTable'

type TabKey = 'courses' | 'enrollments' | 'certifications'

export default function Learning() {
  const toast = useToast()
  const [activeTab, setActiveTab] = useState<TabKey>('courses')
  const [courses, setCourses] = useState<Course[]>([])
  const [enrollments, setEnrollments] = useState<CourseEnrollment[]>([])
  const [certifications, setCertifications] = useState<Certification[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)

  // Modals
  const [showCourseModal, setShowCourseModal] = useState(false)
  const [editingCourse, setEditingCourse] = useState<Course | null>(null)
  const [showEnrollmentModal, setShowEnrollmentModal] = useState(false)
  const [showCertModal, setShowCertModal] = useState(false)
  const [editingCert, setEditingCert] = useState<Certification | null>(null)
  const [courseDetail, setCourseDetail] = useState<Course | null>(null)
  const [courseEnrollments, setCourseEnrollments] = useState<CourseEnrollment[]>([])

  // Enrollment filter
  const [enrollmentFilter, setEnrollmentFilter] = useState('all')

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: string; id: string; name: string } | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    loadAll()
  }, [])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [c, e, cert, emp] = await Promise.all([
        fetchCourses(),
        fetchEnrollments(),
        fetchCertifications(),
        fetchEmployees(),
      ])
      setCourses(c)
      setEnrollments(e)
      setCertifications(cert)
      setEmployees(emp.employees)
    } catch {
      toast.error('Failed to load learning data')
    } finally {
      setLoading(false)
    }
  }

  const reloadCourses = () => fetchCourses().then(setCourses).catch(() => toast.error('Failed to reload courses'))
  const reloadEnrollments = () => fetchEnrollments().then(setEnrollments).catch(() => toast.error('Failed to reload enrollments'))
  const reloadCertifications = () => fetchCertifications().then(setCertifications).catch(() => toast.error('Failed to reload certifications'))

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return
    setDeleteLoading(true)
    try {
      if (deleteConfirm.type === 'course') {
        await deleteCourse(deleteConfirm.id)
        toast.success('Course deleted')
        reloadCourses()
        reloadEnrollments()
      } else {
        await deleteCertification(deleteConfirm.id)
        toast.success('Certification deleted')
        reloadCertifications()
      }
    } catch {
      toast.error(`Failed to delete ${deleteConfirm.type}`)
    } finally {
      setDeleteLoading(false)
      setDeleteConfirm(null)
    }
  }

  const handleCourseRowClick = (row: Record<string, unknown>) => {
    const course = courses.find(c => c.id === row.id)
    if (course) {
      setCourseDetail(course)
      fetchEnrollments({ course_id: course.id }).then(setCourseEnrollments).catch(() => toast.error('Failed to load enrollments'))
    }
  }

  const filteredEnrollments = enrollmentFilter === 'all'
    ? enrollments
    : enrollments.filter(e => e.status === enrollmentFilter)

  function getCertStatus(cert: Certification): string {
    if (!cert.expiry_date) return 'active'
    const expiry = new Date(cert.expiry_date)
    const now = new Date()
    const thirtyDays = 30 * 24 * 60 * 60 * 1000
    if (expiry < now) return 'expired'
    if (expiry.getTime() - now.getTime() < thirtyDays) return 'expiring'
    return 'active'
  }

  if (loading) {
    return (
      <div>
        <PageHeader title="Learning" />
        <SkeletonTable rows={5} cols={5} />
      </div>
    )
  }

  // Course detail view
  if (courseDetail) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="sm" onClick={() => { setCourseDetail(null); reloadCourses() }}>
            &larr; Back
          </Button>
          <h1 className="text-xl font-bold text-white">{courseDetail.title}</h1>
          {courseDetail.is_mandatory ? <StatusBadge status="mandatory" /> : null}
          {courseDetail.is_active ? <StatusBadge status="active" /> : <StatusBadge status="inactive" />}
        </div>

        {courseDetail.description && (
          <p className="text-gray-400 text-sm mb-2">{courseDetail.description}</p>
        )}
        <div className="flex gap-4 text-sm text-gray-500 mb-6">
          <span>Category: {courseDetail.category}</span>
          <span>Format: {courseDetail.format}</span>
          <span>Duration: {courseDetail.duration_hours}h</span>
          {courseDetail.provider && <span>Provider: {courseDetail.provider}</span>}
        </div>

        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-semibold text-white">Enrollments</h2>
          <div className="flex-1" />
          <Button size="sm" onClick={() => { setEditingCourse(courseDetail); setShowCourseModal(true) }}>
            Edit Course
          </Button>
          <Button variant="danger" size="sm" onClick={() => setDeleteConfirm({ type: 'course', id: courseDetail.id, name: courseDetail.title })}>
            Delete
          </Button>
        </div>

        <DataTable
          columns={[
            { key: 'employee_name', header: 'Employee', render: (row) => <EmployeeLink employeeId={String(row.employee_id)} name={String(row.employee_name)} /> },
            { key: 'status', header: 'Status', render: (row) => <StatusBadge status={String(row.status)} /> },
            { key: 'due_date', header: 'Due Date', render: (row) => <span className="text-gray-400">{row.due_date ? formatDate(String(row.due_date)) : '-'}</span> },
            { key: 'score', header: 'Score', render: (row) => <span className="text-gray-400">{row.score != null ? String(row.score) : '-'}</span> },
            { key: 'completed_at', header: 'Completed', render: (row) => <span className="text-gray-400">{row.completed_at ? formatDate(String(row.completed_at)) : '-'}</span>, className: 'hidden lg:table-cell' },
          ]}
          data={courseEnrollments as unknown as Record<string, unknown>[]}
          keyField="id"
          emptyIcon="📚"
          emptyMessage="No enrollments for this course"
        />

        <ConfirmDialog
          open={!!deleteConfirm}
          onClose={() => setDeleteConfirm(null)}
          onConfirm={handleDeleteConfirm}
          title={`Delete ${deleteConfirm?.type === 'course' ? 'Course' : 'Certification'}`}
          message={`Are you sure you want to delete "${deleteConfirm?.name}"? This action cannot be undone.`}
          confirmLabel="Delete"
          loading={deleteLoading}
        />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Learning"
        actions={
          activeTab === 'courses' ? (
            <Button onClick={() => { setEditingCourse(null); setShowCourseModal(true) }}>Add Course</Button>
          ) : activeTab === 'enrollments' ? (
            <Button onClick={() => setShowEnrollmentModal(true)}>Assign Course</Button>
          ) : (
            <Button onClick={() => { setEditingCert(null); setShowCertModal(true) }}>Add Certification</Button>
          )
        }
      />

      <Tabs
        tabs={[
          { key: 'courses', label: 'Courses', count: courses.length },
          { key: 'enrollments', label: 'Enrollments', count: enrollments.length },
          { key: 'certifications', label: 'Certifications', count: certifications.length },
        ]}
        active={activeTab}
        onChange={(k) => setActiveTab(k as TabKey)}
      />

      <div className="mt-4">
        {activeTab === 'courses' && (
          <DataTable
            columns={[
              { key: 'title', header: 'Title', render: (row) => <span className="text-white font-medium">{String(row.title)}</span> },
              { key: 'category', header: 'Category', render: (row) => <span className="text-gray-400 capitalize">{String(row.category)}</span>, className: 'hidden md:table-cell' },
              { key: 'format', header: 'Format', render: (row) => <span className="text-gray-400 capitalize">{String(row.format)}</span>, className: 'hidden md:table-cell' },
              { key: 'duration_hours', header: 'Duration', render: (row) => <span className="text-gray-400">{String(row.duration_hours)}h</span>, className: 'hidden lg:table-cell' },
              { key: 'is_mandatory', header: 'Mandatory', render: (row) => row.is_mandatory ? <StatusBadge status="mandatory" /> : <span className="text-gray-500">-</span> },
              { key: 'is_active', header: 'Status', render: (row) => row.is_active ? <StatusBadge status="active" /> : <StatusBadge status="inactive" /> },
              { key: 'enrollment_count', header: 'Enrolled', render: (row) => <span className="text-gray-400">{String(row.enrollment_count)}</span>, className: 'hidden lg:table-cell' },
            ]}
            data={courses as unknown as Record<string, unknown>[]}
            keyField="id"
            onRowClick={handleCourseRowClick}
            emptyIcon="📚"
            emptyMessage="No courses yet"
            emptyAction="Add Course"
            onEmptyAction={() => { setEditingCourse(null); setShowCourseModal(true) }}
          />
        )}

        {activeTab === 'enrollments' && (
          <>
            <div className="flex gap-2 mb-4 flex-wrap">
              {['all', 'assigned', 'in_progress', 'completed', 'overdue'].map(s => (
                <button
                  key={s}
                  onClick={() => setEnrollmentFilter(s)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    enrollmentFilter === s
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {s === 'all' ? 'All' : s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </button>
              ))}
            </div>
            <DataTable
              columns={[
                { key: 'employee_name', header: 'Employee', render: (row) => <EmployeeLink employeeId={String(row.employee_id)} name={String(row.employee_name)} /> },
                { key: 'course_title', header: 'Course', render: (row) => <span className="text-white">{String(row.course_title)}</span> },
                { key: 'status', header: 'Status', render: (row) => <StatusBadge status={String(row.status)} /> },
                { key: 'due_date', header: 'Due Date', render: (row) => <span className="text-gray-400">{row.due_date ? formatDate(String(row.due_date)) : '-'}</span>, className: 'hidden md:table-cell' },
                { key: 'score', header: 'Score', render: (row) => <span className="text-gray-400">{row.score != null ? String(row.score) : '-'}</span>, className: 'hidden lg:table-cell' },
              ]}
              data={filteredEnrollments as unknown as Record<string, unknown>[]}
              keyField="id"
              emptyIcon="📖"
              emptyMessage="No enrollments found"
              emptyAction="Assign Course"
              onEmptyAction={() => setShowEnrollmentModal(true)}
            />
          </>
        )}

        {activeTab === 'certifications' && (
          <DataTable
            columns={[
              { key: 'employee_name', header: 'Employee', render: (row) => <EmployeeLink employeeId={String(row.employee_id)} name={String(row.employee_name)} /> },
              { key: 'name', header: 'Certification', render: (row) => <span className="text-white font-medium">{String(row.name)}</span> },
              { key: 'issuer', header: 'Issuer', render: (row) => <span className="text-gray-400">{row.issuer ? String(row.issuer) : '-'}</span>, className: 'hidden md:table-cell' },
              { key: 'issue_date', header: 'Issued', render: (row) => <span className="text-gray-400">{row.issue_date ? formatDate(String(row.issue_date)) : '-'}</span>, className: 'hidden md:table-cell' },
              { key: 'expiry_date', header: 'Expires', render: (row) => <span className="text-gray-400">{row.expiry_date ? formatDate(String(row.expiry_date)) : '-'}</span>, className: 'hidden lg:table-cell' },
              { key: 'status', header: 'Status', render: (row) => {
                const cert = certifications.find(c => c.id === row.id)
                const status = cert ? getCertStatus(cert) : 'active'
                return <StatusBadge status={status} />
              }},
            ]}
            data={certifications as unknown as Record<string, unknown>[]}
            keyField="id"
            onRowClick={(row) => {
              const cert = certifications.find(c => c.id === row.id)
              if (cert) { setEditingCert(cert); setShowCertModal(true) }
            }}
            emptyIcon="🏅"
            emptyMessage="No certifications yet"
            emptyAction="Add Certification"
            onEmptyAction={() => { setEditingCert(null); setShowCertModal(true) }}
          />
        )}
      </div>

      {/* Course Modal */}
      <CourseModal
        open={showCourseModal}
        course={editingCourse}
        onClose={() => { setShowCourseModal(false); setEditingCourse(null) }}
        onSaved={() => { setShowCourseModal(false); setEditingCourse(null); reloadCourses() }}
      />

      {/* Enrollment Modal */}
      <EnrollmentModal
        open={showEnrollmentModal}
        employees={employees}
        courses={courses}
        onClose={() => setShowEnrollmentModal(false)}
        onSaved={() => { setShowEnrollmentModal(false); reloadEnrollments(); reloadCourses() }}
      />

      {/* Certification Modal */}
      <CertificationModal
        open={showCertModal}
        certification={editingCert}
        employees={employees}
        onClose={() => { setShowCertModal(false); setEditingCert(null) }}
        onSaved={() => { setShowCertModal(false); setEditingCert(null); reloadCertifications() }}
      />

      <ConfirmDialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDeleteConfirm}
        title={`Delete ${deleteConfirm?.type === 'course' ? 'Course' : 'Certification'}`}
        message={`Are you sure you want to delete "${deleteConfirm?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        loading={deleteLoading}
      />
    </div>
  )
}


// --- Course Modal ---

function CourseModal({
  open,
  course,
  onClose,
  onSaved,
}: {
  open: boolean
  course: Course | null
  onClose: () => void
  onSaved: () => void
}) {
  const toast = useToast()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('general')
  const [format, setFormat] = useState('online')
  const [durationHours, setDurationHours] = useState('1')
  const [provider, setProvider] = useState('')
  const [isMandatory, setIsMandatory] = useState(false)
  const [isActive, setIsActive] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setTitle(course?.title ?? '')
      setDescription(course?.description ?? '')
      setCategory(course?.category ?? 'general')
      setFormat(course?.format ?? 'online')
      setDurationHours(String(course?.duration_hours ?? 1))
      setProvider(course?.provider ?? '')
      setIsMandatory(!!course?.is_mandatory)
      setIsActive(course ? !!course.is_active : true)
    }
  }, [open, course])

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const body = {
        title,
        description: description || null,
        category,
        format,
        duration_hours: parseFloat(durationHours) || 1,
        provider: provider || null,
        is_mandatory: isMandatory ? 1 : 0,
        is_active: isActive ? 1 : 0,
      }
      if (course) {
        await updateCourse(course.id, body)
        toast.success('Course updated')
      } else {
        await createCourse(body)
        toast.success('Course created')
      }
      onSaved()
    } catch {
      toast.error(`Failed to ${course ? 'update' : 'create'} course`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={course ? 'Edit Course' : 'Add Course'} size="lg" footer={
      <>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={!title} loading={submitting}>
          {course ? 'Save' : 'Create'}
        </Button>
      </>
    }>
      <div className="space-y-3">
        <FormField label="Title" required>
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Course title" />
        </FormField>
        <FormField label="Description">
          <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Course description" rows={3} />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Category">
            <Select value={category} onChange={e => setCategory(e.target.value)} options={[
              { value: 'general', label: 'General' },
              { value: 'compliance', label: 'Compliance' },
              { value: 'technical', label: 'Technical' },
              { value: 'leadership', label: 'Leadership' },
              { value: 'safety', label: 'Safety' },
              { value: 'onboarding', label: 'Onboarding' },
            ]} />
          </FormField>
          <FormField label="Format">
            <Select value={format} onChange={e => setFormat(e.target.value)} options={[
              { value: 'online', label: 'Online' },
              { value: 'in_person', label: 'In Person' },
              { value: 'hybrid', label: 'Hybrid' },
              { value: 'self_paced', label: 'Self-Paced' },
            ]} />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Duration (hours)">
            <Input type="number" value={durationHours} onChange={e => setDurationHours(e.target.value)} min="0.5" step="0.5" />
          </FormField>
          <FormField label="Provider">
            <Input value={provider} onChange={e => setProvider(e.target.value)} placeholder="Provider name" />
          </FormField>
        </div>
        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm text-gray-400">
            <input type="checkbox" checked={isMandatory} onChange={e => setIsMandatory(e.target.checked)} className="rounded" />
            Mandatory
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-400">
            <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="rounded" />
            Active
          </label>
        </div>
      </div>
    </Modal>
  )
}


// --- Enrollment Modal ---

function EnrollmentModal({
  open,
  employees,
  courses,
  onClose,
  onSaved,
}: {
  open: boolean
  employees: Employee[]
  courses: Course[]
  onClose: () => void
  onSaved: () => void
}) {
  const toast = useToast()
  const [employeeId, setEmployeeId] = useState('')
  const [courseId, setCourseId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setEmployeeId('')
      setCourseId('')
      setDueDate('')
    }
  }, [open])

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      await createEnrollment({
        employee_id: employeeId,
        course_id: courseId,
        due_date: dueDate || null,
      })
      toast.success('Course assigned')
      onSaved()
    } catch {
      toast.error('Failed to assign course')
    } finally {
      setSubmitting(false)
    }
  }

  const activeCourses = courses.filter(c => c.is_active)

  return (
    <Modal open={open} onClose={onClose} title="Assign Course" size="md" footer={
      <>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={!employeeId || !courseId} loading={submitting}>
          Assign
        </Button>
      </>
    }>
      <div className="space-y-3">
        <FormField label="Employee" required>
          <Select
            value={employeeId}
            onChange={e => setEmployeeId(e.target.value)}
            options={[
              { value: '', label: 'Select employee...' },
              ...employees.map(e => ({ value: e.id, label: `${e.first_name} ${e.last_name}` })),
            ]}
          />
        </FormField>
        <FormField label="Course" required>
          <Select
            value={courseId}
            onChange={e => setCourseId(e.target.value)}
            options={[
              { value: '', label: 'Select course...' },
              ...activeCourses.map(c => ({ value: c.id, label: c.title })),
            ]}
          />
        </FormField>
        <FormField label="Due Date">
          <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
        </FormField>
      </div>
    </Modal>
  )
}


// --- Certification Modal ---

function CertificationModal({
  open,
  certification,
  employees,
  onClose,
  onSaved,
}: {
  open: boolean
  certification: Certification | null
  employees: Employee[]
  onClose: () => void
  onSaved: () => void
}) {
  const toast = useToast()
  const [employeeId, setEmployeeId] = useState('')
  const [name, setName] = useState('')
  const [issuer, setIssuer] = useState('')
  const [issueDate, setIssueDate] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [credentialId, setCredentialId] = useState('')
  const [credentialUrl, setCredentialUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setEmployeeId(certification?.employee_id ?? '')
      setName(certification?.name ?? '')
      setIssuer(certification?.issuer ?? '')
      setIssueDate(certification?.issue_date ?? '')
      setExpiryDate(certification?.expiry_date ?? '')
      setCredentialId(certification?.credential_id ?? '')
      setCredentialUrl(certification?.credential_url ?? '')
    }
  }, [open, certification])

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const body = {
        employee_id: employeeId,
        name,
        issuer: issuer || null,
        issue_date: issueDate || null,
        expiry_date: expiryDate || null,
        credential_id: credentialId || null,
        credential_url: credentialUrl || null,
      }
      if (certification) {
        await updateCertification(certification.id, body)
        toast.success('Certification updated')
      } else {
        await createCertification(body)
        toast.success('Certification added')
      }
      onSaved()
    } catch {
      toast.error(`Failed to ${certification ? 'update' : 'add'} certification`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={certification ? 'Edit Certification' : 'Add Certification'} size="lg" footer={
      <>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={!employeeId || !name} loading={submitting}>
          {certification ? 'Save' : 'Add'}
        </Button>
      </>
    }>
      <div className="space-y-3">
        <FormField label="Employee" required>
          <Select
            value={employeeId}
            onChange={e => setEmployeeId(e.target.value)}
            options={[
              { value: '', label: 'Select employee...' },
              ...employees.map(e => ({ value: e.id, label: `${e.first_name} ${e.last_name}` })),
            ]}
            disabled={!!certification}
          />
        </FormField>
        <FormField label="Certification Name" required>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. AWS Solutions Architect" />
        </FormField>
        <FormField label="Issuer">
          <Input value={issuer} onChange={e => setIssuer(e.target.value)} placeholder="e.g. Amazon Web Services" />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Issue Date">
            <Input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} />
          </FormField>
          <FormField label="Expiry Date">
            <Input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} />
          </FormField>
        </div>
        <FormField label="Credential ID">
          <Input value={credentialId} onChange={e => setCredentialId(e.target.value)} placeholder="Credential ID" />
        </FormField>
        <FormField label="Credential URL">
          <Input value={credentialUrl} onChange={e => setCredentialUrl(e.target.value)} placeholder="https://..." />
        </FormField>
      </div>
    </Modal>
  )
}
