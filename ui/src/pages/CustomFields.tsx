import { useState, useEffect } from 'react'
import { formatDate } from '../utils/format'
import {
  fetchFieldDefinitions,
  createFieldDefinition,
  updateFieldDefinition,
  deleteFieldDefinition,
  fetchFieldValues,
  createFieldValue,
  updateFieldValue,
} from '../modules/custom-fields/api'
import type { CustomFieldDefinition, CustomFieldValue } from '../modules/custom-fields/types'
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

type TabKey = 'definitions' | 'values'

export default function CustomFields() {
  const toast = useToast()
  const [activeTab, setActiveTab] = useState<TabKey>('definitions')
  const [definitions, setDefinitions] = useState<CustomFieldDefinition[]>([])
  const [values, setValues] = useState<CustomFieldValue[]>([])
  const [loading, setLoading] = useState(true)

  // Modals
  const [showDefModal, setShowDefModal] = useState(false)
  const [editingDef, setEditingDef] = useState<CustomFieldDefinition | null>(null)
  const [showValueModal, setShowValueModal] = useState(false)
  const [editingValue, setEditingValue] = useState<CustomFieldValue | null>(null)

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    loadAll()
  }, [])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [defs, vals] = await Promise.all([
        fetchFieldDefinitions(),
        fetchFieldValues(),
      ])
      setDefinitions(defs)
      setValues(vals)
    } catch {
      toast.error('Failed to load custom fields')
    } finally {
      setLoading(false)
    }
  }

  const reloadDefinitions = () => fetchFieldDefinitions().then(setDefinitions).catch(() => toast.error('Failed to reload definitions'))
  const reloadValues = () => fetchFieldValues().then(setValues).catch(() => toast.error('Failed to reload values'))

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return
    setDeleteLoading(true)
    try {
      await deleteFieldDefinition(deleteConfirm.id)
      toast.success('Field definition deleted')
      reloadDefinitions()
      reloadValues()
    } catch {
      toast.error('Failed to delete field definition')
    } finally {
      setDeleteLoading(false)
      setDeleteConfirm(null)
    }
  }

  if (loading) {
    return (
      <div>
        <PageHeader title="Custom Fields" />
        <SkeletonTable rows={5} cols={5} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Custom Fields"
        actions={
          activeTab === 'definitions' ? (
            <Button onClick={() => { setEditingDef(null); setShowDefModal(true) }}>Add Definition</Button>
          ) : (
            <Button onClick={() => { setEditingValue(null); setShowValueModal(true) }}>Set Value</Button>
          )
        }
      />

      <Tabs
        tabs={[
          { key: 'definitions', label: 'Definitions', count: definitions.length },
          { key: 'values', label: 'Values', count: values.length },
        ]}
        active={activeTab}
        onChange={(k) => setActiveTab(k as TabKey)}
      />

      <div className="mt-4">
        {activeTab === 'definitions' && (
          <DataTable
            columns={[
              { key: 'entity_type', header: 'Entity Type', render: (row) => <span className="text-gray-400 capitalize">{String(row.entity_type).replace(/_/g, ' ')}</span> },
              { key: 'field_name', header: 'Field Name', render: (row) => <span className="text-white font-medium">{String(row.field_name)}</span> },
              { key: 'field_type', header: 'Field Type', render: (row) => <span className="text-gray-400 capitalize">{String(row.field_type)}</span> },
              { key: 'is_required', header: 'Required', render: (row) => row.is_required ? <StatusBadge status="required" /> : <span className="text-gray-500">-</span> },
              { key: 'is_active', header: 'Status', render: (row) => row.is_active ? <StatusBadge status="active" /> : <StatusBadge status="inactive" /> },
            ]}
            data={definitions as unknown as Record<string, unknown>[]}
            keyField="id"
            onRowClick={(row) => {
              const def = definitions.find(d => d.id === row.id)
              if (def) { setEditingDef(def); setShowDefModal(true) }
            }}
            emptyIcon="🏷️"
            emptyMessage="No field definitions yet"
            emptyAction="Add Definition"
            onEmptyAction={() => { setEditingDef(null); setShowDefModal(true) }}
          />
        )}

        {activeTab === 'values' && (
          <DataTable
            columns={[
              { key: 'entity_type', header: 'Entity Type', render: (row) => <span className="text-gray-400 capitalize">{String(row.entity_type).replace(/_/g, ' ')}</span> },
              { key: 'field_name', header: 'Field Name', render: (row) => <span className="text-white font-medium">{String(row.field_name)}</span> },
              { key: 'entity_id', header: 'Entity ID', render: (row) => <span className="text-gray-400">{String(row.entity_id)}</span> },
              { key: 'value', header: 'Value', render: (row) => <span className="text-gray-400">{row.value ? String(row.value) : '-'}</span> },
              { key: 'updated_at', header: 'Updated', render: (row) => <span className="text-gray-400">{row.updated_at ? formatDate(String(row.updated_at)) : '-'}</span>, className: 'hidden lg:table-cell' },
            ]}
            data={values as unknown as Record<string, unknown>[]}
            keyField="id"
            onRowClick={(row) => {
              const val = values.find(v => v.id === row.id)
              if (val) { setEditingValue(val); setShowValueModal(true) }
            }}
            emptyIcon="📝"
            emptyMessage="No field values set"
            emptyAction="Set Value"
            onEmptyAction={() => { setEditingValue(null); setShowValueModal(true) }}
          />
        )}
      </div>

      {/* Definition Modal */}
      <DefinitionModal
        open={showDefModal}
        definition={editingDef}
        onClose={() => { setShowDefModal(false); setEditingDef(null) }}
        onSaved={() => { setShowDefModal(false); setEditingDef(null); reloadDefinitions() }}
        onDelete={(d) => { setShowDefModal(false); setEditingDef(null); setDeleteConfirm({ id: d.id, name: d.field_name }) }}
      />

      {/* Value Modal */}
      <ValueModal
        open={showValueModal}
        fieldValue={editingValue}
        definitions={definitions}
        onClose={() => { setShowValueModal(false); setEditingValue(null) }}
        onSaved={() => { setShowValueModal(false); setEditingValue(null); reloadValues() }}
      />

      <ConfirmDialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Field Definition"
        message={`Are you sure you want to delete "${deleteConfirm?.name}"? This will also remove all associated values. This action cannot be undone.`}
        confirmLabel="Delete"
        loading={deleteLoading}
      />
    </div>
  )
}


// --- Definition Modal ---

function DefinitionModal({
  open,
  definition,
  onClose,
  onSaved,
  onDelete,
}: {
  open: boolean
  definition: CustomFieldDefinition | null
  onClose: () => void
  onSaved: () => void
  onDelete: (d: CustomFieldDefinition) => void
}) {
  const toast = useToast()
  const [entityType, setEntityType] = useState('employee')
  const [fieldName, setFieldName] = useState('')
  const [fieldType, setFieldType] = useState('text')
  const [isRequired, setIsRequired] = useState(false)
  const [isActive, setIsActive] = useState(true)
  const [options, setOptions] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setEntityType(definition?.entity_type ?? 'employee')
      setFieldName(definition?.field_name ?? '')
      setFieldType(definition?.field_type ?? 'text')
      setIsRequired(!!definition?.is_required)
      setIsActive(definition ? !!definition.is_active : true)
      setOptions(definition?.options ?? '')
    }
  }, [open, definition])

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const body = {
        entity_type: entityType,
        field_name: fieldName,
        field_type: fieldType,
        is_required: isRequired ? 1 : 0,
        is_active: isActive ? 1 : 0,
        options: options || null,
      }
      if (definition) {
        await updateFieldDefinition(definition.id, body)
        toast.success('Field definition updated')
      } else {
        await createFieldDefinition(body)
        toast.success('Field definition created')
      }
      onSaved()
    } catch {
      toast.error(`Failed to ${definition ? 'update' : 'create'} field definition`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={definition ? 'Edit Field Definition' : 'Add Field Definition'} size="lg" footer={
      <>
        {definition && (
          <Button variant="danger" onClick={() => onDelete(definition)} className="mr-auto">Delete</Button>
        )}
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={!fieldName} loading={submitting}>
          {definition ? 'Save' : 'Create'}
        </Button>
      </>
    }>
      <div className="space-y-3">
        <FormField label="Entity Type" required>
          <Select value={entityType} onChange={e => setEntityType(e.target.value)} options={[
            { value: 'employee', label: 'Employee' },
            { value: 'department', label: 'Department' },
            { value: 'position', label: 'Position' },
            { value: 'leave_request', label: 'Leave Request' },
            { value: 'benefit', label: 'Benefit' },
            { value: 'other', label: 'Other' },
          ]} />
        </FormField>
        <FormField label="Field Name" required>
          <Input value={fieldName} onChange={e => setFieldName(e.target.value)} placeholder="e.g. shirt_size" />
        </FormField>
        <FormField label="Field Type" required>
          <Select value={fieldType} onChange={e => setFieldType(e.target.value)} options={[
            { value: 'text', label: 'Text' },
            { value: 'number', label: 'Number' },
            { value: 'date', label: 'Date' },
            { value: 'boolean', label: 'Boolean' },
            { value: 'select', label: 'Select (Dropdown)' },
            { value: 'textarea', label: 'Textarea' },
          ]} />
        </FormField>
        {fieldType === 'select' && (
          <FormField label="Options (comma-separated)">
            <Textarea value={options} onChange={e => setOptions(e.target.value)} placeholder="Option 1, Option 2, Option 3" rows={2} />
          </FormField>
        )}
        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm text-gray-400">
            <input type="checkbox" checked={isRequired} onChange={e => setIsRequired(e.target.checked)} className="rounded" />
            Required
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


// --- Value Modal ---

function ValueModal({
  open,
  fieldValue,
  definitions,
  onClose,
  onSaved,
}: {
  open: boolean
  fieldValue: CustomFieldValue | null
  definitions: CustomFieldDefinition[]
  onClose: () => void
  onSaved: () => void
}) {
  const toast = useToast()
  const [definitionId, setDefinitionId] = useState('')
  const [entityId, setEntityId] = useState('')
  const [value, setValue] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setDefinitionId(fieldValue?.definition_id ?? '')
      setEntityId(fieldValue?.entity_id ?? '')
      setValue(fieldValue?.value ?? '')
    }
  }, [open, fieldValue])

  const activeDefinitions = definitions.filter(d => d.is_active)

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const body = {
        definition_id: definitionId,
        entity_id: entityId,
        value: value || null,
      }
      if (fieldValue) {
        await updateFieldValue(fieldValue.id, body)
        toast.success('Field value updated')
      } else {
        await createFieldValue(body)
        toast.success('Field value set')
      }
      onSaved()
    } catch {
      toast.error(`Failed to ${fieldValue ? 'update' : 'set'} field value`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={fieldValue ? 'Edit Field Value' : 'Set Field Value'} size="md" footer={
      <>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={!definitionId || !entityId} loading={submitting}>
          {fieldValue ? 'Save' : 'Set'}
        </Button>
      </>
    }>
      <div className="space-y-3">
        <FormField label="Field Definition" required>
          <Select
            value={definitionId}
            onChange={e => setDefinitionId(e.target.value)}
            options={[
              { value: '', label: 'Select field...' },
              ...activeDefinitions.map(d => ({ value: d.id, label: `${d.entity_type} - ${d.field_name}` })),
            ]}
            disabled={!!fieldValue}
          />
        </FormField>
        <FormField label="Entity ID" required>
          <Input value={entityId} onChange={e => setEntityId(e.target.value)} placeholder="Entity ID" disabled={!!fieldValue} />
        </FormField>
        <FormField label="Value">
          <Input value={value} onChange={e => setValue(e.target.value)} placeholder="Field value" />
        </FormField>
      </div>
    </Modal>
  )
}
