import { useState, useEffect } from 'react'
import {
  fetchEmergencyContacts,
  createEmergencyContact,
  updateEmergencyContact,
  deleteEmergencyContact,
} from '../modules/emergency-contacts/api'
import { fetchEmployees } from '../modules/employees/api'
import type { EmergencyContact } from '../modules/emergency-contacts/types'
import type { Employee } from '../modules/employees/types'
import StatusBadge from '../components/StatusBadge'
import EmployeeLink from '../components/EmployeeLink'
import Button from '../components/Button'
import { FormField, Input, Select } from '../components/FormField'
import Modal from '../components/Modal'
import { SkeletonTable } from '../components/Skeleton'
import ConfirmDialog from '../components/ConfirmDialog'
import { useToast } from '../components/Toast'
import PageHeader from '../components/PageHeader'
import DataTable from '../components/DataTable'

export default function EmergencyContacts() {
  const toast = useToast()
  const [contacts, setContacts] = useState<EmergencyContact[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)

  // Modals
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<EmergencyContact | null>(null)

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    loadAll()
  }, [])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [c, emp] = await Promise.all([
        fetchEmergencyContacts(),
        fetchEmployees(),
      ])
      setContacts(c)
      setEmployees(emp.employees)
    } catch {
      toast.error('Failed to load emergency contacts')
    } finally {
      setLoading(false)
    }
  }

  const reloadContacts = () => fetchEmergencyContacts().then(setContacts).catch(() => toast.error('Failed to reload emergency contacts'))

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return
    setDeleteLoading(true)
    try {
      await deleteEmergencyContact(deleteConfirm.id)
      toast.success('Emergency contact deleted')
      reloadContacts()
    } catch {
      toast.error('Failed to delete emergency contact')
    } finally {
      setDeleteLoading(false)
      setDeleteConfirm(null)
    }
  }

  if (loading) {
    return (
      <div>
        <PageHeader title="Emergency Contacts" />
        <SkeletonTable rows={5} cols={6} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Emergency Contacts"
        actions={
          <Button onClick={() => { setEditing(null); setShowModal(true) }}>Add Contact</Button>
        }
      />

      <DataTable
        columns={[
          { key: 'employee_name', header: 'Employee', render: (row) => {
            const contact = contacts.find(c => c.id === row.id)
            return contact ? <EmployeeLink employeeId={contact.employee_id} name={contact.employee_name} /> : <span className="text-gray-400">{String(row.employee_name)}</span>
          }},
          { key: 'contact_name', header: 'Contact Name', render: (row) => <span className="text-white font-medium">{String(row.contact_name)}</span> },
          { key: 'relationship', header: 'Relationship', render: (row) => <span className="text-gray-400">{String(row.relationship || '-')}</span>, className: 'hidden md:table-cell' },
          { key: 'phone', header: 'Phone', render: (row) => <span className="text-gray-400">{String(row.phone || '-')}</span> },
          { key: 'email', header: 'Email', render: (row) => <span className="text-gray-400">{String(row.email || '-')}</span>, className: 'hidden md:table-cell' },
          { key: 'is_primary', header: 'Primary', render: (row) => <StatusBadge status={Number(row.is_primary) ? 'yes' : 'no'} /> },
        ]}
        data={contacts as unknown as Record<string, unknown>[]}
        keyField="id"
        onRowClick={(row) => {
          const contact = contacts.find(c => c.id === row.id)
          if (contact) { setEditing(contact); setShowModal(true) }
        }}
        emptyMessage="No emergency contacts found"
        emptyAction="Add Contact"
        onEmptyAction={() => { setEditing(null); setShowModal(true) }}
      />

      <EmergencyContactModal
        open={showModal}
        contact={editing}
        employees={employees}
        onClose={() => { setShowModal(false); setEditing(null) }}
        onSaved={() => { setShowModal(false); setEditing(null); reloadContacts() }}
        onDelete={(c) => { setShowModal(false); setEditing(null); setDeleteConfirm({ id: c.id, name: c.contact_name }) }}
      />

      <ConfirmDialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Emergency Contact"
        message={`Are you sure you want to delete "${deleteConfirm?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        loading={deleteLoading}
      />
    </div>
  )
}


// --- Emergency Contact Modal ---

function EmergencyContactModal({
  open,
  contact,
  employees,
  onClose,
  onSaved,
  onDelete,
}: {
  open: boolean
  contact: EmergencyContact | null
  employees: Employee[]
  onClose: () => void
  onSaved: () => void
  onDelete: (c: EmergencyContact) => void
}) {
  const toast = useToast()
  const [employeeId, setEmployeeId] = useState('')
  const [contactName, setContactName] = useState('')
  const [relationship, setRelationship] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [isPrimary, setIsPrimary] = useState('0')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setEmployeeId(contact?.employee_id ?? '')
      setContactName(contact?.contact_name ?? '')
      setRelationship(contact?.relationship ?? '')
      setPhone(contact?.phone ?? '')
      setEmail(contact?.email ?? '')
      setIsPrimary(contact ? String(contact.is_primary) : '0')
    }
  }, [open, contact])

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const body = {
        employee_id: employeeId,
        contact_name: contactName,
        relationship: relationship || null,
        phone: phone || null,
        email: email || null,
        is_primary: parseInt(isPrimary),
      }
      if (contact) {
        await updateEmergencyContact(contact.id, body)
        toast.success('Emergency contact updated')
      } else {
        await createEmergencyContact(body)
        toast.success('Emergency contact created')
      }
      onSaved()
    } catch {
      toast.error(`Failed to ${contact ? 'update' : 'create'} emergency contact`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={contact ? 'Edit Emergency Contact' : 'Add Emergency Contact'} size="lg" footer={
      <>
        {contact && (
          <Button variant="danger" onClick={() => onDelete(contact)} className="mr-auto">Delete</Button>
        )}
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={!employeeId || !contactName} loading={submitting}>
          {contact ? 'Save' : 'Create'}
        </Button>
      </>
    }>
      <div className="space-y-3">
        <FormField label="Employee" required>
          <Select value={employeeId} onChange={e => setEmployeeId(e.target.value)} options={[
            { value: '', label: 'Select employee' },
            ...employees.map(e => ({ value: e.id, label: `${e.first_name} ${e.last_name}` })),
          ]} />
        </FormField>
        <FormField label="Contact Name" required>
          <Input value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Full name" />
        </FormField>
        <FormField label="Relationship">
          <Input value={relationship} onChange={e => setRelationship(e.target.value)} placeholder="e.g. Spouse, Parent" />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Phone">
            <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone number" />
          </FormField>
          <FormField label="Email">
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" />
          </FormField>
        </div>
        <FormField label="Primary Contact">
          <Select value={isPrimary} onChange={e => setIsPrimary(e.target.value)} options={[
            { value: '0', label: 'No' },
            { value: '1', label: 'Yes' },
          ]} />
        </FormField>
      </div>
    </Modal>
  )
}
