import { useState, useEffect } from 'react'
import {
  fetchLocations,
  createLocation,
  updateLocation,
  deleteLocation,
} from '../modules/locations/api'
import type { Location } from '../modules/locations/types'
import StatusBadge from '../components/StatusBadge'
import Button from '../components/Button'
import { FormField, Input } from '../components/FormField'
import Modal from '../components/Modal'
import { SkeletonTable } from '../components/Skeleton'
import ConfirmDialog from '../components/ConfirmDialog'
import { useToast } from '../components/Toast'
import PageHeader from '../components/PageHeader'
import DataTable from '../components/DataTable'

export default function Locations() {
  const toast = useToast()
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)

  // Modals
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Location | null>(null)

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    loadAll()
  }, [])

  const loadAll = async () => {
    setLoading(true)
    try {
      const data = await fetchLocations()
      setLocations(data)
    } catch {
      toast.error('Failed to load locations')
    } finally {
      setLoading(false)
    }
  }

  const reloadLocations = () => fetchLocations().then(setLocations).catch(() => toast.error('Failed to reload locations'))

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return
    setDeleteLoading(true)
    try {
      await deleteLocation(deleteConfirm.id)
      toast.success('Location deleted')
      reloadLocations()
    } catch {
      toast.error('Failed to delete location')
    } finally {
      setDeleteLoading(false)
      setDeleteConfirm(null)
    }
  }

  if (loading) {
    return (
      <div>
        <PageHeader title="Locations" />
        <SkeletonTable rows={5} cols={5} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Locations"
        actions={
          <Button onClick={() => { setEditing(null); setShowModal(true) }}>Add Location</Button>
        }
      />

      <DataTable
        columns={[
          { key: 'name', header: 'Name', render: (row) => <span className="text-white font-medium">{String(row.name)}</span> },
          { key: 'city', header: 'City', render: (row) => <span className="text-gray-400">{String(row.city || '-')}</span>, className: 'hidden md:table-cell' },
          { key: 'country', header: 'Country', render: (row) => <span className="text-gray-400">{String(row.country || '-')}</span>, className: 'hidden md:table-cell' },
          { key: 'timezone', header: 'Timezone', render: (row) => <span className="text-gray-400">{String(row.timezone || '-')}</span>, className: 'hidden lg:table-cell' },
          { key: 'is_active', header: 'Status', render: (row) => row.is_active ? <StatusBadge status="active" /> : <StatusBadge status="inactive" /> },
        ]}
        data={locations as unknown as Record<string, unknown>[]}
        keyField="id"
        onRowClick={(row) => {
          const loc = locations.find(l => l.id === row.id)
          if (loc) { setEditing(loc); setShowModal(true) }
        }}
        emptyIcon="📍"
        emptyMessage="No locations yet"
        emptyAction="Add Location"
        onEmptyAction={() => { setEditing(null); setShowModal(true) }}
      />

      <LocationModal
        open={showModal}
        location={editing}
        onClose={() => { setShowModal(false); setEditing(null) }}
        onSaved={() => { setShowModal(false); setEditing(null); reloadLocations() }}
        onDelete={(loc) => { setShowModal(false); setEditing(null); setDeleteConfirm({ id: loc.id, name: loc.name }) }}
      />

      <ConfirmDialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Location"
        message={`Are you sure you want to delete "${deleteConfirm?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        loading={deleteLoading}
      />
    </div>
  )
}


// --- Location Modal ---

function LocationModal({
  open,
  location,
  onClose,
  onSaved,
  onDelete,
}: {
  open: boolean
  location: Location | null
  onClose: () => void
  onSaved: () => void
  onDelete: (loc: Location) => void
}) {
  const toast = useToast()
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [country, setCountry] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [timezone, setTimezone] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setName(location?.name ?? '')
      setAddress(location?.address ?? '')
      setCity(location?.city ?? '')
      setState(location?.state ?? '')
      setCountry(location?.country ?? '')
      setPostalCode(location?.postal_code ?? '')
      setTimezone(location?.timezone ?? '')
      setIsActive(location ? !!location.is_active : true)
    }
  }, [open, location])

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const body = {
        name,
        address: address || null,
        city: city || null,
        state: state || null,
        country: country || null,
        postal_code: postalCode || null,
        timezone: timezone || null,
        is_active: isActive ? 1 : 0,
      }
      if (location) {
        await updateLocation(location.id, body)
        toast.success('Location updated')
      } else {
        await createLocation(body)
        toast.success('Location created')
      }
      onSaved()
    } catch {
      toast.error(`Failed to ${location ? 'update' : 'create'} location`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={location ? 'Edit Location' : 'Add Location'} size="lg" footer={
      <>
        {location && (
          <Button variant="danger" onClick={() => onDelete(location)} className="mr-auto">Delete</Button>
        )}
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={!name} loading={submitting}>
          {location ? 'Save' : 'Create'}
        </Button>
      </>
    }>
      <div className="space-y-3">
        <FormField label="Name" required>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Location name" />
        </FormField>
        <FormField label="Address">
          <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="Street address" />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="City">
            <Input value={city} onChange={e => setCity(e.target.value)} placeholder="City" />
          </FormField>
          <FormField label="State/Province">
            <Input value={state} onChange={e => setState(e.target.value)} placeholder="State or province" />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Country">
            <Input value={country} onChange={e => setCountry(e.target.value)} placeholder="Country" />
          </FormField>
          <FormField label="Postal Code">
            <Input value={postalCode} onChange={e => setPostalCode(e.target.value)} placeholder="Postal code" />
          </FormField>
        </div>
        <FormField label="Timezone">
          <Input value={timezone} onChange={e => setTimezone(e.target.value)} placeholder="e.g. America/New_York" />
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
