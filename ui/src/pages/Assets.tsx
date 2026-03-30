import { useState, useEffect } from 'react'
import {
  fetchAssets,
  createAsset,
  updateAsset,
  deleteAsset,
} from '../modules/assets/api'
import { fetchEmployees } from '../modules/employees/api'
import type { Asset } from '../modules/assets/types'
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

export default function Assets() {
  const toast = useToast()
  const [assets, setAssets] = useState<Asset[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')

  // Modals
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Asset | null>(null)

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    loadAll()
  }, [])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [a, emp] = await Promise.all([
        fetchAssets(),
        fetchEmployees(),
      ])
      setAssets(a)
      setEmployees(emp.employees)
    } catch {
      toast.error('Failed to load assets')
    } finally {
      setLoading(false)
    }
  }

  const reloadAssets = () => fetchAssets().then(setAssets).catch(() => toast.error('Failed to reload assets'))

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return
    setDeleteLoading(true)
    try {
      await deleteAsset(deleteConfirm.id)
      toast.success('Asset deleted')
      reloadAssets()
    } catch {
      toast.error('Failed to delete asset')
    } finally {
      setDeleteLoading(false)
      setDeleteConfirm(null)
    }
  }

  const filteredAssets = statusFilter === 'all'
    ? assets
    : assets.filter(a => a.status === statusFilter)

  if (loading) {
    return (
      <div>
        <PageHeader title="Assets" />
        <SkeletonTable rows={5} cols={6} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Assets"
        actions={
          <Button onClick={() => { setEditing(null); setShowModal(true) }}>Add Asset</Button>
        }
      />

      <div className="flex gap-2 mb-4 flex-wrap">
        {['all', 'available', 'assigned', 'maintenance', 'retired'].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              statusFilter === s
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
          { key: 'name', header: 'Name', render: (row) => <span className="text-white font-medium">{String(row.name)}</span> },
          { key: 'asset_tag', header: 'Asset Tag', render: (row) => <span className="text-gray-400">{String(row.asset_tag || '-')}</span>, className: 'hidden md:table-cell' },
          { key: 'category', header: 'Category', render: (row) => <span className="text-gray-400 capitalize">{String(row.category || '-')}</span>, className: 'hidden md:table-cell' },
          { key: 'serial_number', header: 'Serial #', render: (row) => <span className="text-gray-400">{String(row.serial_number || '-')}</span>, className: 'hidden lg:table-cell' },
          { key: 'status', header: 'Status', render: (row) => <StatusBadge status={String(row.status)} /> },
          { key: 'assigned_to_name', header: 'Assigned To', render: (row) => row.assigned_to_id ? <EmployeeLink employeeId={String(row.assigned_to_id)} name={String(row.assigned_to_name)} /> : <span className="text-gray-500">-</span> },
        ]}
        data={filteredAssets as unknown as Record<string, unknown>[]}
        keyField="id"
        onRowClick={(row) => {
          const asset = assets.find(a => a.id === row.id)
          if (asset) { setEditing(asset); setShowModal(true) }
        }}
        emptyIcon="💻"
        emptyMessage="No assets found"
        emptyAction="Add Asset"
        onEmptyAction={() => { setEditing(null); setShowModal(true) }}
      />

      <AssetModal
        open={showModal}
        asset={editing}
        employees={employees}
        onClose={() => { setShowModal(false); setEditing(null) }}
        onSaved={() => { setShowModal(false); setEditing(null); reloadAssets() }}
        onDelete={(a) => { setShowModal(false); setEditing(null); setDeleteConfirm({ id: a.id, name: a.name }) }}
      />

      <ConfirmDialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Asset"
        message={`Are you sure you want to delete "${deleteConfirm?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        loading={deleteLoading}
      />
    </div>
  )
}


// --- Asset Modal ---

function AssetModal({
  open,
  asset,
  employees,
  onClose,
  onSaved,
  onDelete,
}: {
  open: boolean
  asset: Asset | null
  employees: Employee[]
  onClose: () => void
  onSaved: () => void
  onDelete: (a: Asset) => void
}) {
  const toast = useToast()
  const [name, setName] = useState('')
  const [assetTag, setAssetTag] = useState('')
  const [category, setCategory] = useState('laptop')
  const [serialNumber, setSerialNumber] = useState('')
  const [status, setStatus] = useState('available')
  const [assignedToId, setAssignedToId] = useState('')
  const [purchaseDate, setPurchaseDate] = useState('')
  const [purchaseCost, setPurchaseCost] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setName(asset?.name ?? '')
      setAssetTag(asset?.asset_tag ?? '')
      setCategory(asset?.category ?? 'laptop')
      setSerialNumber(asset?.serial_number ?? '')
      setStatus(asset?.status ?? 'available')
      setAssignedToId(asset?.assigned_to ?? '')
      setPurchaseDate(asset?.purchase_date ?? '')
      setPurchaseCost(asset?.purchase_cost != null ? String(asset.purchase_cost) : '')
      setNotes(asset?.notes ?? '')
    }
  }, [open, asset])

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const body = {
        name,
        asset_tag: assetTag || null,
        category,
        serial_number: serialNumber || null,
        status,
        assigned_to_id: assignedToId || null,
        purchase_date: purchaseDate || null,
        purchase_cost: purchaseCost ? parseFloat(purchaseCost) : null,
        notes: notes || null,
      }
      if (asset) {
        await updateAsset(asset.id, body)
        toast.success('Asset updated')
      } else {
        await createAsset(body)
        toast.success('Asset created')
      }
      onSaved()
    } catch {
      toast.error(`Failed to ${asset ? 'update' : 'create'} asset`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={asset ? 'Edit Asset' : 'Add Asset'} size="lg" footer={
      <>
        {asset && (
          <Button variant="danger" onClick={() => onDelete(asset)} className="mr-auto">Delete</Button>
        )}
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={!name} loading={submitting}>
          {asset ? 'Save' : 'Create'}
        </Button>
      </>
    }>
      <div className="space-y-3">
        <FormField label="Name" required>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Asset name" />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Asset Tag">
            <Input value={assetTag} onChange={e => setAssetTag(e.target.value)} placeholder="e.g. AST-001" />
          </FormField>
          <FormField label="Category">
            <Select value={category} onChange={e => setCategory(e.target.value)} options={[
              { value: 'laptop', label: 'Laptop' },
              { value: 'desktop', label: 'Desktop' },
              { value: 'monitor', label: 'Monitor' },
              { value: 'phone', label: 'Phone' },
              { value: 'tablet', label: 'Tablet' },
              { value: 'furniture', label: 'Furniture' },
              { value: 'vehicle', label: 'Vehicle' },
              { value: 'other', label: 'Other' },
            ]} />
          </FormField>
        </div>
        <FormField label="Serial Number">
          <Input value={serialNumber} onChange={e => setSerialNumber(e.target.value)} placeholder="Serial number" />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Status">
            <Select value={status} onChange={e => setStatus(e.target.value)} options={[
              { value: 'available', label: 'Available' },
              { value: 'assigned', label: 'Assigned' },
              { value: 'maintenance', label: 'Maintenance' },
              { value: 'retired', label: 'Retired' },
            ]} />
          </FormField>
          <FormField label="Assigned To">
            <Select
              value={assignedToId}
              onChange={e => setAssignedToId(e.target.value)}
              options={[
                { value: '', label: 'Unassigned' },
                ...employees.map(e => ({ value: e.id, label: `${e.first_name} ${e.last_name}` })),
              ]}
            />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Purchase Date">
            <Input type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} />
          </FormField>
          <FormField label="Purchase Cost">
            <Input type="number" value={purchaseCost} onChange={e => setPurchaseCost(e.target.value)} placeholder="0.00" min="0" step="0.01" />
          </FormField>
        </div>
        <FormField label="Notes">
          <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Additional notes" rows={3} />
        </FormField>
      </div>
    </Modal>
  )
}
