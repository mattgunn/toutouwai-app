import React, { useState, useEffect } from 'react'
import {
  fetchPrerequisites,
  createPrerequisite,
  deletePrerequisite,
} from '../modules/training-prerequisites/api'
import { fetchCourses } from '../modules/learning/api'
import type { TrainingPrerequisite } from '../modules/training-prerequisites/types'
import type { Course } from '../modules/learning/types'
import Button from '../components/Button'
import { FormField, Select } from '../components/FormField'
import Modal from '../components/Modal'
import { SkeletonTable } from '../components/Skeleton'
import ConfirmDialog from '../components/ConfirmDialog'
import { useToast } from '../components/Toast'
import PageHeader from '../components/PageHeader'
import DataTable from '../components/DataTable'

export default function TrainingPrerequisites() {
  const toast = useToast()
  const [prerequisites, setPrerequisites] = useState<TrainingPrerequisite[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)

  // Modals
  const [showModal, setShowModal] = useState(false)

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    loadAll()
  }, [])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [p, c] = await Promise.all([
        fetchPrerequisites(),
        fetchCourses(),
      ])
      setPrerequisites(p)
      setCourses(c)
    } catch {
      toast.error('Failed to load prerequisites')
    } finally {
      setLoading(false)
    }
  }

  const reloadPrerequisites = () => fetchPrerequisites().then(setPrerequisites).catch(() => toast.error('Failed to reload prerequisites'))

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return
    setDeleteLoading(true)
    try {
      await deletePrerequisite(deleteConfirm.id)
      toast.success('Prerequisite deleted')
      reloadPrerequisites()
    } catch {
      toast.error('Failed to delete prerequisite')
    } finally {
      setDeleteLoading(false)
      setDeleteConfirm(null)
    }
  }

  if (loading) {
    return (
      <div>
        <PageHeader title="Training Prerequisites" />
        <SkeletonTable rows={5} cols={3} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Training Prerequisites"
        actions={
          <Button onClick={() => setShowModal(true)}>Add Prerequisite</Button>
        }
      />

      <DataTable
        columns={[
          { key: 'course_title', header: 'Course', render: (row) => <span className="text-white font-medium">{String(row.course_title)}</span> },
          { key: 'prerequisite_title', header: 'Prerequisite Course', render: (row) => <span className="text-gray-400">{String(row.prerequisite_title)}</span> },
          { key: 'is_mandatory', header: 'Mandatory', render: (row) => <span className={`text-xs font-medium ${Number(row.is_mandatory) ? 'text-amber-400' : 'text-gray-400'}`}>{Number(row.is_mandatory) ? 'Yes' : 'No'}</span> },
          { key: 'actions', header: '', render: (row) => (
            <Button
              variant="danger"
              onClick={(e) => {
                (e as React.MouseEvent).stopPropagation()
                const prereq = prerequisites.find(p => p.id === row.id)
                if (prereq) {
                  setDeleteConfirm({ id: prereq.id, name: `${prereq.course_title} requires ${prereq.prerequisite_title}` })
                }
              }}
            >
              Remove
            </Button>
          )},
        ]}
        data={prerequisites as unknown as Record<string, unknown>[]}
        keyField="id"
        emptyMessage="No prerequisites found"
        emptyAction="Add Prerequisite"
        onEmptyAction={() => setShowModal(true)}
      />

      <PrerequisiteModal
        open={showModal}
        courses={courses}
        onClose={() => setShowModal(false)}
        onSaved={() => { setShowModal(false); reloadPrerequisites() }}
      />

      <ConfirmDialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Prerequisite"
        message={`Are you sure you want to delete "${deleteConfirm?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        loading={deleteLoading}
      />
    </div>
  )
}


// --- Prerequisite Modal (create only) ---

function PrerequisiteModal({
  open,
  courses,
  onClose,
  onSaved,
}: {
  open: boolean
  courses: Course[]
  onClose: () => void
  onSaved: () => void
}) {
  const toast = useToast()
  const [courseId, setCourseId] = useState('')
  const [prerequisiteCourseId, setPrerequisiteCourseId] = useState('')
  const [isMandatory, setIsMandatory] = useState('1')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setCourseId('')
      setPrerequisiteCourseId('')
      setIsMandatory('1')
    }
  }, [open])

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      await createPrerequisite({
        course_id: courseId,
        prerequisite_course_id: prerequisiteCourseId,
        is_mandatory: parseInt(isMandatory),
      })
      toast.success('Prerequisite created')
      onSaved()
    } catch {
      toast.error('Failed to create prerequisite')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Prerequisite" size="lg" footer={
      <>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={!courseId || !prerequisiteCourseId || courseId === prerequisiteCourseId} loading={submitting}>
          Create
        </Button>
      </>
    }>
      <div className="space-y-3">
        <FormField label="Course" required>
          <Select value={courseId} onChange={e => setCourseId(e.target.value)} options={[
            { value: '', label: 'Select course' },
            ...courses.map(c => ({ value: c.id, label: c.title })),
          ]} />
        </FormField>
        <FormField label="Prerequisite Course" required>
          <Select value={prerequisiteCourseId} onChange={e => setPrerequisiteCourseId(e.target.value)} options={[
            { value: '', label: 'Select prerequisite course' },
            ...courses.filter(c => c.id !== courseId).map(c => ({ value: c.id, label: c.title })),
          ]} />
        </FormField>
        <FormField label="Mandatory">
          <Select value={isMandatory} onChange={e => setIsMandatory(e.target.value)} options={[
            { value: '1', label: 'Yes' },
            { value: '0', label: 'No' },
          ]} />
        </FormField>
      </div>
    </Modal>
  )
}
