import { useState, useEffect } from 'react'
import { formatDate } from '../utils/format'
import {
  fetchCompComponents,
  createCompComponent,
  updateCompComponent,
  deleteCompComponent,
} from '../modules/compensation-components/api'
import { fetchEmployees } from '../modules/employees/api'
import type { CompensationComponent } from '../modules/compensation-components/types'
import type { Employee } from '../modules/employees/types'
import StatusBadge from '../components/StatusBadge'
import EmployeeLink from '../components/EmployeeLink'
import Button from '../components/Button'
import { FormField, Input, Select, Textarea } from '../components/FormField'
import Modal from '../components/Modal'
import { SkeletonTable } from '../components/Skeleton'
import ConfirmDialog from '../components/ConfirmDialog'
import { useToast } from '../components/Toast'
import PageHeader from '../components/PageHeader'
import DataTable from '../components/DataTable'

function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount)
  } catch {
    return `${currency} ${amount.toFixed(2)}`
  }
}

export default function CompensationComponents() {
  const toast = useToast()
  const [components, setComponents] = useState<CompensationComponent[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)

  // Modals
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<CompensationComponent | null>(null)

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    loadAll()
  }, [])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [comp, emp] = await Promise.all([
        fetchCompComponents(),
        fetchEmployees(),
      ])
      setComponents(comp)
      setEmployees(emp.employees)
    } catch {
      toast.error('Failed to load compensation components')
    } finally {
      setLoading(false)
    }
  }

  const reloadComponents = () => fetchCompComponents().then(setComponents).catch(() => toast.error('Failed to reload components'))

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return
    setDeleteLoading(true)
    try {
      await deleteCompComponent(deleteConfirm.id)
      toast.success('Component deleted')
      reloadComponents()
    } catch {
      toast.error('Failed to delete component')
    } finally {
      setDeleteLoading(false)
      setDeleteConfirm(null)
    }
  }

  if (loading) {
    return (
      <div>
        <PageHeader title="Compensation Components" />
        <SkeletonTable rows={5} cols={6} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Compensation Components"
        actions={
          <Button onClick={() => { setEditing(null); setShowModal(true) }}>Add Component</Button>
        }
      />

      <DataTable
        columns={[
          { key: 'employee_name', header: 'Employee', render: (row) => <EmployeeLink employeeId={String(row.employee_id)} name={String(row.employee_name)} /> },
          { key: 'component_type', header: 'Type', render: (row) => <StatusBadge status={String(row.component_type)} /> },
          { key: 'amount', header: 'Amount', render: (row) => <span className="text-white font-medium">{formatCurrency(Number(row.amount), String(row.currency || 'NZD'))}</span> },
          { key: 'frequency', header: 'Frequency', render: (row) => <span className="text-gray-400 capitalize">{String(row.frequency).replace(/_/g, ' ')}</span>, className: 'hidden md:table-cell' },
          { key: 'effective_date', header: 'Effective', render: (row) => <span className="text-gray-400">{row.effective_date ? formatDate(String(row.effective_date)) : '-'}</span>, className: 'hidden md:table-cell' },
          { key: 'status', header: 'Status', render: (row) => <StatusBadge status={String(row.status)} /> },
        ]}
        data={components as unknown as Record<string, unknown>[]}
        keyField="id"
        onRowClick={(row) => {
          const comp = components.find(c => c.id === row.id)
          if (comp) { setEditing(comp); setShowModal(true) }
        }}
        emptyIcon="💰"
        emptyMessage="No compensation components yet"
        emptyAction="Add Component"
        onEmptyAction={() => { setEditing(null); setShowModal(true) }}
      />

      {/* Component Modal */}
      <ComponentModal
        open={showModal}
        component={editing}
        employees={employees}
        onClose={() => { setShowModal(false); setEditing(null) }}
        onSaved={() => { setShowModal(false); setEditing(null); reloadComponents() }}
        onDelete={(c) => { setShowModal(false); setEditing(null); setDeleteConfirm({ id: c.id, name: `${c.employee_name} - ${c.component_type}` }) }}
      />

      <ConfirmDialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Component"
        message={`Are you sure you want to delete "${deleteConfirm?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        loading={deleteLoading}
      />
    </div>
  )
}


// --- Component Modal ---

function ComponentModal({
  open,
  component,
  employees,
  onClose,
  onSaved,
  onDelete,
}: {
  open: boolean
  component: CompensationComponent | null
  employees: Employee[]
  onClose: () => void
  onSaved: () => void
  onDelete: (c: CompensationComponent) => void
}) {
  const toast = useToast()
  const [employeeId, setEmployeeId] = useState('')
  const [componentType, setComponentType] = useState('bonus')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('NZD')
  const [frequency, setFrequency] = useState('one_time')
  const [effectiveDate, setEffectiveDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState('active')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setEmployeeId(component?.employee_id ?? '')
      setComponentType(component?.component_type ?? 'bonus')
      setAmount(component ? String(component.amount) : '')
      setCurrency(component?.currency ?? 'NZD')
      setFrequency(component?.frequency ?? 'one_time')
      setEffectiveDate(component?.effective_date ?? '')
      setEndDate(component?.end_date ?? '')
      setDescription(component?.description ?? '')
      setStatus(component?.status ?? 'active')
    }
  }, [open, component])

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const body = {
        employee_id: employeeId,
        component_type: componentType,
        amount: parseFloat(amount) || 0,
        currency,
        frequency,
        effective_date: effectiveDate,
        end_date: endDate || null,
        description: description || null,
        status,
      }
      if (component) {
        await updateCompComponent(component.id, body)
        toast.success('Component updated')
      } else {
        await createCompComponent(body)
        toast.success('Component created')
      }
      onSaved()
    } catch {
      toast.error(`Failed to ${component ? 'update' : 'create'} component`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={component ? 'Edit Component' : 'Add Component'} size="lg" footer={
      <>
        {component && (
          <Button variant="danger" onClick={() => onDelete(component)} className="mr-auto">Delete</Button>
        )}
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={!employeeId || !amount || !effectiveDate} loading={submitting}>
          {component ? 'Save' : 'Create'}
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
            disabled={!!component}
          />
        </FormField>
        <FormField label="Component Type" required>
          <Select value={componentType} onChange={e => setComponentType(e.target.value)} options={[
            { value: 'bonus', label: 'Bonus' },
            { value: 'stock', label: 'Stock' },
            { value: 'allowance', label: 'Allowance' },
            { value: 'commission', label: 'Commission' },
            { value: 'overtime', label: 'Overtime' },
            { value: 'other', label: 'Other' },
          ]} />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Amount" required>
            <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" min="0" step="0.01" />
          </FormField>
          <FormField label="Currency">
            <Select value={currency} onChange={e => setCurrency(e.target.value)} options={[
              { value: 'NZD', label: 'NZD' },
              { value: 'AUD', label: 'AUD' },
              { value: 'USD', label: 'USD' },
              { value: 'GBP', label: 'GBP' },
              { value: 'EUR', label: 'EUR' },
              { value: 'CAD', label: 'CAD' },
            ]} />
          </FormField>
        </div>
        <FormField label="Frequency">
          <Select value={frequency} onChange={e => setFrequency(e.target.value)} options={[
            { value: 'one_time', label: 'One Time' },
            { value: 'monthly', label: 'Monthly' },
            { value: 'quarterly', label: 'Quarterly' },
            { value: 'semi_annual', label: 'Semi-Annual' },
            { value: 'annual', label: 'Annual' },
          ]} />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Effective Date" required>
            <Input type="date" value={effectiveDate} onChange={e => setEffectiveDate(e.target.value)} />
          </FormField>
          <FormField label="End Date">
            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </FormField>
        </div>
        <FormField label="Description">
          <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Component description" rows={3} />
        </FormField>
        <FormField label="Status">
          <Select value={status} onChange={e => setStatus(e.target.value)} options={[
            { value: 'active', label: 'Active' },
            { value: 'pending', label: 'Pending' },
            { value: 'completed', label: 'Completed' },
            { value: 'cancelled', label: 'Cancelled' },
          ]} />
        </FormField>
      </div>
    </Modal>
  )
}
