import { useState, useEffect } from 'react'
import { fetchGoals, updateGoal } from '../api'
import { formatDate } from '../utils/format'
import type { Goal } from '../types'
import StatusBadge from '../components/StatusBadge'
import PageHeader from '../components/PageHeader'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import Button from '../components/Button'
import { FormField, Input, Select } from '../components/FormField'
import { SkeletonCards } from '../components/Skeleton'
import { useToast } from '../components/Toast'
import EmployeeLink from '../components/EmployeeLink'

const STATUS_OPTIONS = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
]

export default function Goals() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null)
  const [editing, setEditing] = useState(false)
  const [editProgress, setEditProgress] = useState('0')
  const [editStatus, setEditStatus] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const toast = useToast()

  const loadData = () => {
    setLoading(true)
    fetchGoals().then(setGoals).catch(() => {}).finally(() => setLoading(false))
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
      <PageHeader title="Goals" />

      <DataTable
        columns={goalColumns}
        data={goals}
        keyField="id"
        emptyMessage="No goals yet"
        emptyIcon="🎯"
        onRowClick={(goal) => { setSelectedGoal(goal); setEditing(false) }}
      />

      {/* Detail modal */}
      <Modal
        open={!!selectedGoal && !editing}
        onClose={() => setSelectedGoal(null)}
        title="Goal Details"
        size="md"
        footer={
          <Button size="sm" onClick={openEdit}>Edit</Button>
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
    </div>
  )
}
