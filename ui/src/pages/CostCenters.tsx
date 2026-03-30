import { useState, useEffect } from 'react'
import { formatDate } from '../utils/format'
import {
  fetchCostCenters,
  createCostCenter,
  updateCostCenter,
  deleteCostCenter,
} from '../modules/cost-centers/api'
import { fetchDepartments } from '../modules/departments/api'
import { fetchEmployees } from '../modules/employees/api'
import type { CostCenter } from '../modules/cost-centers/types'
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

interface Department {
  id: string
  name: string
}

export default function CostCenters() {
  const toast = useToast()
  const [costCenters, setCostCenters] = useState<CostCenter[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)

  // Modals
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<CostCenter | null>(null)

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    loadAll()
  }, [])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [cc, d, emp] = await Promise.all([
        fetchCostCenters(),
        fetchDepartments(),
        fetchEmployees(),
      ])
      setCostCenters(cc)
      setDepartments(d)
      setEmployees(emp.employees)
    } catch {
      toast.error('Failed to load cost centers')
    } finally {
      setLoading(false)
    }
  }

  const reloadCostCenters = () => fetchCostCenters().then(setCostCenters).catch(() => toast.error('Failed to reload cost centers'))

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return
    setDeleteLoading(true)
    try {
      await deleteCostCenter(deleteConfirm.id)
      toast.success('Cost center deleted')
      reloadCostCenters()
    } catch {
      toast.error('Failed to delete cost center')
    } finally {
      setDeleteLoading(false)
      setDeleteConfirm(null)
    }
  }

  const formatBudget = (budget: unknown) => {
    if (budget == null) return '-'
    return `$${Number(budget).toLocaleString()}`
  }

  if (loading) {
    return (
      <div>
        <PageHeader title="Cost Centers" />
        <SkeletonTable rows={5} cols={6} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Cost Centers"
        actions={
          <Button onClick={() => { setEditing(null); setShowModal(true) }}>Add Cost Center</Button>
        }
      />

      <DataTable
        columns={[
          { key: 'code', header: 'Code', render: (row) => <span className="text-white font-medium font-mono">{String(row.code)}</span> },
          { key: 'name', header: 'Name', render: (row) => <span className="text-white">{String(row.name)}</span> },
          { key: 'department_name', header: 'Department', render: (row) => <span className="text-gray-400">{String(row.department_name || '-')}</span>, className: 'hidden md:table-cell' },
          { key: 'manager_name', header: 'Manager', render: (row) => row.manager_id ? <EmployeeLink employeeId={String(row.manager_id)} name={String(row.manager_name)} /> : <span className="text-gray-500">-</span>, className: 'hidden md:table-cell' },
          { key: 'budget', header: 'Budget', render: (row) => <span className="text-gray-400">{formatBudget(row.budget)}</span>, className: 'hidden lg:table-cell' },
          { key: 'is_active', header: 'Status', render: (row) => row.is_active ? <StatusBadge status="active" /> : <StatusBadge status="inactive" /> },
        ]}
        data={costCenters as unknown as Record<string, unknown>[]}
        keyField="id"
        onRowClick={(row) => {
          const cc = costCenters.find(c => c.id === row.id)
          if (cc) { setEditing(cc); setShowModal(true) }
        }}
        emptyIcon="💰"
        emptyMessage="No cost centers yet"
        emptyAction="Add Cost Center"
        onEmptyAction={() => { setEditing(null); setShowModal(true) }}
      />

      <CostCenterModal
        open={showModal}
        costCenter={editing}
        departments={departments}
        employees={employees}
        onClose={() => { setShowModal(false); setEditing(null) }}
        onSaved={() => { setShowModal(false); setEditing(null); reloadCostCenters() }}
        onDelete={(cc) => { setShowModal(false); setEditing(null); setDeleteConfirm({ id: cc.id, name: cc.name }) }}
      />

      <ConfirmDialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Cost Center"
        message={`Are you sure you want to delete "${deleteConfirm?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        loading={deleteLoading}
      />
    </div>
  )
}


// --- Cost Center Modal ---

function CostCenterModal({
  open,
  costCenter,
  departments,
  employees,
  onClose,
  onSaved,
  onDelete,
}: {
  open: boolean
  costCenter: CostCenter | null
  departments: Department[]
  employees: Employee[]
  onClose: () => void
  onSaved: () => void
  onDelete: (cc: CostCenter) => void
}) {
  const toast = useToast()
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [managerId, setManagerId] = useState('')
  const [budget, setBudget] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setCode(costCenter?.code ?? '')
      setName(costCenter?.name ?? '')
      setDescription(costCenter?.description ?? '')
      setDepartmentId(costCenter?.department_id ?? '')
      setManagerId(costCenter?.manager_id ?? '')
      setBudget(costCenter?.budget != null ? String(costCenter.budget) : '')
      setIsActive(costCenter ? !!costCenter.is_active : true)
    }
  }, [open, costCenter])

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const body = {
        code,
        name,
        description: description || null,
        department_id: departmentId || null,
        manager_id: managerId || null,
        budget: budget ? parseFloat(budget) : null,
        is_active: isActive ? 1 : 0,
      }
      if (costCenter) {
        await updateCostCenter(costCenter.id, body)
        toast.success('Cost center updated')
      } else {
        await createCostCenter(body)
        toast.success('Cost center created')
      }
      onSaved()
    } catch {
      toast.error(`Failed to ${costCenter ? 'update' : 'create'} cost center`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={costCenter ? 'Edit Cost Center' : 'Add Cost Center'} size="lg" footer={
      <>
        {costCenter && (
          <Button variant="danger" onClick={() => onDelete(costCenter)} className="mr-auto">Delete</Button>
        )}
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={!code || !name} loading={submitting}>
          {costCenter ? 'Save' : 'Create'}
        </Button>
      </>
    }>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Code" required>
            <Input value={code} onChange={e => setCode(e.target.value)} placeholder="e.g. CC-001" />
          </FormField>
          <FormField label="Name" required>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Cost center name" />
          </FormField>
        </div>
        <FormField label="Description">
          <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Cost center description" rows={3} />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Department">
            <Select
              value={departmentId}
              onChange={e => setDepartmentId(e.target.value)}
              options={[
                { value: '', label: 'Select department...' },
                ...departments.map(d => ({ value: d.id, label: d.name })),
              ]}
            />
          </FormField>
          <FormField label="Manager">
            <Select
              value={managerId}
              onChange={e => setManagerId(e.target.value)}
              options={[
                { value: '', label: 'Select manager...' },
                ...employees.map(e => ({ value: e.id, label: `${e.first_name} ${e.last_name}` })),
              ]}
            />
          </FormField>
        </div>
        <FormField label="Budget">
          <Input type="number" value={budget} onChange={e => setBudget(e.target.value)} placeholder="0.00" min="0" step="1000" />
        </FormField>
        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm text-gray-400">
            <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="rounded" />
            Active
          </label>
        </div>
      </div>
    </Modal>
  )
}
