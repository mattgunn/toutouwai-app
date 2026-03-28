import { useState, useEffect } from 'react'
import { fetchPositions, fetchDepartments, createPosition, updatePosition, deletePosition } from '../api'
import type { Position, Department } from '../types'
import { SkeletonTable } from '../components/Skeleton'
import PageHeader from '../components/PageHeader'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import Button from '../components/Button'
import { FormField, Input, Select, Textarea } from '../components/FormField'
import ConfirmDialog from '../components/ConfirmDialog'
import { useToast } from '../components/Toast'

const EMPTY_FORM = { title: '', department_id: '', level: '', description: '' }

export default function Positions() {
  const [positions, setPositions] = useState<Position[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Position | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const toast = useToast()

  const loadData = () => {
    setLoading(true)
    Promise.all([
      fetchPositions().then(setPositions),
      fetchDepartments().then(setDepartments),
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

  const openEdit = (pos: Position) => {
    setEditing(pos)
    setForm({
      title: pos.title,
      department_id: pos.department_id || '',
      level: pos.level || '',
      description: pos.description || '',
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
        title: form.title,
        department_id: form.department_id || null,
        level: form.level || null,
        description: form.description || null,
      }
      if (editing) {
        await updatePosition(editing.id, body)
        toast.success('Position updated')
      } else {
        await createPosition(body)
        toast.success('Position created')
      }
      closeModal()
      loadData()
    } catch {
      toast.error(editing ? 'Failed to update position' : 'Failed to create position')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      await deletePosition(deleteId)
      toast.success('Position deleted')
      closeModal()
      loadData()
    } catch {
      toast.error('Failed to delete position')
    } finally {
      setDeleting(false)
      setDeleteId(null)
    }
  }

  const columns = [
    { key: 'title', header: 'Title', render: (pos: Position) => <span className="text-white font-medium">{pos.title}</span> },
    { key: 'department_name', header: 'Department', className: 'hidden md:table-cell', render: (pos: Position) => <span className="text-gray-400">{pos.department_name || '\u2014'}</span> },
    { key: 'level', header: 'Level', className: 'hidden lg:table-cell', render: (pos: Position) => <span className="text-gray-400">{pos.level || '\u2014'}</span> },
    { key: 'employee_count', header: 'Employees', render: (pos: Position) => <span className="text-gray-400">{pos.employee_count}</span> },
  ]

  if (loading) {
    return (
      <div>
        <PageHeader title="Positions" />
        <SkeletonTable rows={6} cols={4} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Positions"
        actions={<Button onClick={openCreate}>Add Position</Button>}
      />

      <DataTable
        columns={columns}
        data={positions}
        keyField="id"
        emptyIcon="💼"
        emptyMessage="No positions yet"
        onRowClick={openEdit}
        striped
      />

      <Modal
        open={showModal}
        onClose={closeModal}
        title={editing ? 'Edit Position' : 'Add Position'}
        size="md"
        footer={
          <div className="flex items-center justify-between w-full">
            <div>
              {editing && (
                <Button variant="danger" size="sm" onClick={() => setDeleteId(editing.id)} disabled={submitting}>
                  Delete
                </Button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Button variant="secondary" onClick={closeModal} disabled={submitting}>Cancel</Button>
              <Button type="submit" form="pos-form" loading={submitting}>
                {editing ? 'Save Changes' : 'Add Position'}
              </Button>
            </div>
          </div>
        }
      >
        <form id="pos-form" onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Title" required>
            <Input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              required
              placeholder="Position title"
            />
          </FormField>
          <FormField label="Department">
            <Select
              value={form.department_id}
              onChange={e => setForm(f => ({ ...f, department_id: e.target.value }))}
              placeholder="Select department"
              options={departments.map(d => ({ value: d.id, label: d.name }))}
            />
          </FormField>
          <FormField label="Level">
            <Input
              value={form.level}
              onChange={e => setForm(f => ({ ...f, level: e.target.value }))}
              placeholder="e.g. Senior, Junior, Lead"
            />
          </FormField>
          <FormField label="Description">
            <Textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Optional description"
            />
          </FormField>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Position"
        message="Are you sure you want to delete this position? This action cannot be undone."
        confirmLabel="Delete"
        loading={deleting}
      />
    </div>
  )
}
