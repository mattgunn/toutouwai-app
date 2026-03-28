import { useState, useEffect } from 'react'
import { fetchGoals, createGoal, updateGoal, deleteGoal, fetchEmployees } from '../api'
import { formatDate } from '../utils/format'
import type { Goal, Employee } from '../types'
import StatusBadge from '../components/StatusBadge'
import PageHeader from '../components/PageHeader'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import Button from '../components/Button'
import { FormField, Input, Select, Textarea } from '../components/FormField'
import { SkeletonCards } from '../components/Skeleton'
import ConfirmDialog from '../components/ConfirmDialog'
import { useToast } from '../components/Toast'
import EmployeeLink from '../components/EmployeeLink'

const STATUS_OPTIONS = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
]

export default function Goals() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null)
  const [editing, setEditing] = useState(false)
  const [editProgress, setEditProgress] = useState('0')
  const [editStatus, setEditStatus] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // New goal
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createSubmitting, setCreateSubmitting] = useState(false)

  // Delete
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const toast = useToast()

  const loadData = () => {
    setLoading(true)
    Promise.all([
      fetchGoals().then(setGoals).catch(() => {}),
      fetchEmployees().then(r => setEmployees(r.employees)).catch(() => {}),
    ]).finally(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [])

  const handleEdit = async () => {
    if (!selectedGoal) return
    setSubmitting(true)
    try {
      await updateGoal(selectedGoal.id, {
        progress: parseInt(editProgress),
        status: editStatus,
      })
      toast.success('Goal updated')
      setEditing(false)
      setSelectedGoal(null)
      loadData()
    } catch {
      toast.error('Failed to update goal')
    } finally {
      setSubmitting(false)
    }
  }

  const openEdit = () => {
    if (!selectedGoal) return
    setEditProgress(String(selectedGoal.progress))
    setEditStatus(selectedGoal.status)
    setEditing(true)
  }

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setCreateSubmitting(true)
    try {
      const fd = new FormData(e.currentTarget)
      await createGoal({
        employee_id: fd.get('employee_id'),
        title: fd.get('title'),
        description: fd.get('description') || null,
        due_date: fd.get('due_date') || null,
        status: 'not_started',
        progress: 0,
      })
      setShowCreateForm(false)
      toast.success('Goal created')
      loadData()
    } catch {
      toast.error('Failed to create goal')
    } finally {
      setCreateSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      await deleteGoal(deleteId)
      if (selectedGoal?.id === deleteId) setSelectedGoal(null)
      toast.success('Goal deleted')
      loadData()
    } catch {
      toast.error('Failed to delete goal')
    } finally {
      setDeleting(false)
      setDeleteId(null)
    }
  }

  const goalColumns = [
    { key: 'title', header: 'Goal', render: (goal: Goal) => (
      <div>
        <span className="text-white font-medium">{goal.title}</span>
        <p className="text-xs mt-0.5">{goal.employee_id ? <EmployeeLink employeeId={goal.employee_id} name={goal.employee_name || 'Unknown'} /> : <span className="text-gray-500">{'\u2014'}</span>}</p>
      </div>
    )},
    { key: 'description', header: 'Description', className: 'hidden md:table-cell', render: (goal: Goal) => <span className="text-gray-400 text-sm">{goal.description || '\u2014'}</span> },
    { key: 'progress', header: 'Progress', render: (goal: Goal) => (
      <div className="flex items-center gap-2">
        <div className="flex-1 bg-gray-800 rounded-full h-2 min-w-[60px]">
          <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${goal.progress}%` }} />
        </div>
        <span className="text-xs text-gray-400 w-8">{goal.progress}%</span>
      </div>
    )},
    { key: 'due_date', header: 'Due', className: 'hidden lg:table-cell', render: (goal: Goal) => <span className="text-gray-400">{formatDate(goal.due_date)}</span> },
    { key: 'status', header: 'Status', render: (goal: Goal) => <StatusBadge status={goal.status} /> },
  ]

  if (loading) {
    return (
      <div>
        <PageHeader title="Goals" />
        <SkeletonCards count={4} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Goals"
        actions={
          <Button onClick={() => setShowCreateForm(true)}>
            New Goal
          </Button>
        }
      />

      <DataTable
        columns={goalColumns}
        data={goals}
        keyField="id"
        emptyMessage="No goals yet"
        emptyIcon="🎯"
        emptyAction="New Goal"
        onEmptyAction={() => setShowCreateForm(true)}
        onRowClick={(goal) => { setSelectedGoal(goal); setEditing(false) }}
      />

      {/* Create Goal modal */}
      <Modal
        open={showCreateForm}
        onClose={() => setShowCreateForm(false)}
        title="New Goal"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowCreateForm(false)} disabled={createSubmitting}>Cancel</Button>
            <Button type="submit" form="goal-form" loading={createSubmitting}>Create</Button>
          </>
        }
      >
        <form id="goal-form" onSubmit={handleCreate} className="space-y-4">
          <FormField label="Employee" required>
            <Select
              name="employee_id"
              required
              placeholder="Select employee..."
              options={employees.map(emp => ({ value: emp.id, label: `${emp.first_name} ${emp.last_name}` }))}
            />
          </FormField>
          <FormField label="Title" required>
            <Input name="title" required placeholder="Goal title" />
          </FormField>
          <FormField label="Description">
            <Textarea name="description" placeholder="Description (optional)" rows={3} />
          </FormField>
          <FormField label="Due Date">
            <Input name="due_date" type="date" />
          </FormField>
        </form>
      </Modal>

      {/* Detail modal */}
      <Modal
        open={!!selectedGoal && !editing}
        onClose={() => setSelectedGoal(null)}
        title="Goal Details"
        size="md"
        footer={
          <div className="flex gap-2">
            <Button variant="danger" size="sm" onClick={() => { setDeleteId(selectedGoal!.id); setSelectedGoal(null) }}>Delete</Button>
            <div className="flex-1" />
            <Button size="sm" onClick={openEdit}>Edit</Button>
          </div>
        }
      >
        {selectedGoal && (
          <div className="space-y-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Employee</p>
              <p className="text-sm">{selectedGoal.employee_id ? <EmployeeLink employeeId={selectedGoal.employee_id} name={selectedGoal.employee_name || 'Unknown'} /> : <span className="text-white">{'\u2014'}</span>}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Title</p>
              <p className="text-sm text-white font-medium">{selectedGoal.title}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Description</p>
              <p className="text-sm text-gray-300 whitespace-pre-wrap">{selectedGoal.description || '\u2014'}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Due Date</p>
                <p className="text-sm text-white">{formatDate(selectedGoal.due_date)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Status</p>
                <StatusBadge status={selectedGoal.status} />
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-2">Progress</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-gray-800 rounded-full h-3">
                  <div className="bg-blue-500 h-3 rounded-full transition-all" style={{ width: `${selectedGoal.progress}%` }} />
                </div>
                <span className="text-sm text-white font-medium">{selectedGoal.progress}%</span>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit modal */}
      <Modal
        open={editing && !!selectedGoal}
        onClose={() => { setEditing(false); setSelectedGoal(null) }}
        title="Edit Goal"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setEditing(false); setSelectedGoal(null) }} disabled={submitting}>Cancel</Button>
            <Button onClick={handleEdit} loading={submitting}>Save Changes</Button>
          </>
        }
      >
        {selectedGoal && (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-400 mb-3">{selectedGoal.title}</p>
            </div>
            <FormField label="Progress (%)">
              <Input
                type="number"
                min="0"
                max="100"
                value={editProgress}
                onChange={e => setEditProgress(e.target.value)}
              />
            </FormField>
            <FormField label="Status">
              <Select
                value={editStatus}
                onChange={e => setEditStatus(e.target.value)}
                options={STATUS_OPTIONS}
              />
            </FormField>
          </div>
        )}
      </Modal>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Goal"
        message="Are you sure you want to delete this goal? This action cannot be undone."
        confirmLabel="Delete"
        loading={deleting}
      />
    </div>
  )
}
