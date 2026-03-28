import { useState, useEffect } from 'react'
import { formatDate } from '../utils/format'
import {
  fetchWorkflowDefinitions,
  createWorkflowDefinition,
  fetchMyApprovals,
  approveWorkflow,
  rejectWorkflow,
} from '../modules/workflows/api'
import type { WorkflowDefinition, WorkflowApproval } from '../modules/workflows/types'
import StatusBadge from '../components/StatusBadge'
import EmptyState from '../components/EmptyState'
import DataTable from '../components/DataTable'
import Tabs from '../components/Tabs'
import Modal from '../components/Modal'
import Button from '../components/Button'
import { FormField, Input, Select, Textarea } from '../components/FormField'
import { SkeletonTable } from '../components/Skeleton'
import { useToast } from '../components/Toast'
import PageHeader from '../components/PageHeader'

export default function Workflows() {
  const [view, setView] = useState('approvals')
  const [approvals, setApprovals] = useState<WorkflowApproval[]>([])
  const [definitions, setDefinitions] = useState<WorkflowDefinition[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetchMyApprovals().then(setApprovals).catch(() => {}),
      fetchWorkflowDefinitions().then(setDefinitions).catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [])

  const reload = () => {
    fetchMyApprovals().then(setApprovals).catch(() => {})
    fetchWorkflowDefinitions().then(setDefinitions).catch(() => {})
  }

  if (loading) {
    return (
      <div>
        <PageHeader title="Workflows" />
        <SkeletonTable rows={5} cols={4} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Workflows"
        actions={view === 'definitions' ? (
          <Button onClick={() => setShowForm(true)}>
            New Definition
          </Button>
        ) : undefined}
      />

      <div className="mb-6">
        <Tabs
          variant="pills"
          tabs={[
            { key: 'approvals', label: 'My Approvals', count: approvals.length },
            { key: 'definitions', label: 'Definitions' },
          ]}
          active={view}
          onChange={setView}
        />
      </div>

      {view === 'approvals' && <ApprovalsView approvals={approvals} onAction={reload} />}
      {view === 'definitions' && (
        <DefinitionsView
          definitions={definitions}
          showForm={showForm}
          onCloseForm={() => setShowForm(false)}
          onCreated={reload}
        />
      )}
    </div>
  )
}

function ApprovalsView({ approvals, onAction }: { approvals: WorkflowApproval[]; onAction: () => void }) {
  const [rejectId, setRejectId] = useState<string | null>(null)
  const [comments, setComments] = useState('')
  const [approving, setApproving] = useState<string | null>(null)
  const [rejecting, setRejecting] = useState(false)
  const toast = useToast()

  const handleApprove = async (id: string) => {
    setApproving(id)
    try {
      await approveWorkflow(id)
      toast.success('Workflow approved')
      onAction()
    } catch {
      toast.error('Failed to approve workflow')
    } finally {
      setApproving(null)
    }
  }

  const handleReject = async (id: string) => {
    setRejecting(true)
    try {
      await rejectWorkflow(id, comments)
      setRejectId(null)
      setComments('')
      toast.success('Workflow rejected')
      onAction()
    } catch {
      toast.error('Failed to reject workflow')
    } finally {
      setRejecting(false)
    }
  }

  if (approvals.length === 0) {
    return <EmptyState icon="✅" message="No pending approvals" />
  }

  return (
    <div className="space-y-3">
      {approvals.map(approval => (
        <div key={approval.id} className={`bg-gray-900 border border-gray-800 rounded-lg p-4 border-l-4 ${
          approval.status === 'pending' ? 'border-l-amber-500' :
          approval.status === 'approved' ? 'border-l-emerald-500' :
          approval.status === 'rejected' ? 'border-l-red-500' : 'border-l-gray-600'
        }`}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-white font-medium">{approval.definition_name || 'Workflow'}</p>
              <p className="text-xs text-gray-500 mt-1">
                <span className="capitalize">{(approval.entity_type || '').replace(/_/g, ' ')}</span>
                {' \u2022 '}Initiated by {approval.initiated_by_name || 'Unknown'}
                {' \u2022 '}{formatDate(approval.created_at)}
              </p>
            </div>
            <StatusBadge status={approval.status} />
          </div>

          {rejectId === approval.id ? (
            <div className="mt-3 space-y-2">
              <FormField label="Reason for rejection">
                <Textarea
                  value={comments}
                  onChange={e => setComments(e.target.value)}
                  placeholder="Reason for rejection..."
                  rows={2}
                />
              </FormField>
              <div className="flex gap-2">
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleReject(approval.id)}
                  loading={rejecting}
                >
                  Confirm Reject
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => { setRejectId(null); setComments('') }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                onClick={() => handleApprove(approval.id)}
                loading={approving === approval.id}
              >
                Approve
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setRejectId(approval.id)}
              >
                Reject
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function DefinitionsView({
  definitions,
  showForm,
  onCloseForm,
  onCreated,
}: {
  definitions: WorkflowDefinition[]
  showForm: boolean
  onCloseForm: () => void
  onCreated: () => void
}) {
  const [name, setName] = useState('')
  const [triggerEntity, setTriggerEntity] = useState('leave_request')
  const [triggerAction, setTriggerAction] = useState('create')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const toast = useToast()

  const handleCreate = async () => {
    setSubmitting(true)
    try {
      await createWorkflowDefinition({
        name,
        trigger_entity: triggerEntity,
        trigger_action: triggerAction,
        description: description || null,
      })
      setName('')
      setTriggerEntity('leave_request')
      setTriggerAction('create')
      setDescription('')
      onCloseForm()
      toast.success('Workflow definition created')
      onCreated()
    } catch {
      toast.error('Failed to create workflow definition')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Modal
        open={showForm}
        onClose={onCloseForm}
        title="New Workflow Definition"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={onCloseForm} disabled={submitting}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!name} loading={submitting}>Create</Button>
          </>
        }
      >
        <div className="grid md:grid-cols-2 gap-4">
          <FormField label="Name" required>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Workflow name"
            />
          </FormField>
          <FormField label="Trigger Entity">
            <Select
              value={triggerEntity}
              onChange={e => setTriggerEntity(e.target.value)}
              options={[
                { value: 'leave_request', label: 'Leave Request' },
                { value: 'employee', label: 'Employee' },
                { value: 'compensation', label: 'Compensation' },
              ]}
            />
          </FormField>
          <FormField label="Trigger Action">
            <Select
              value={triggerAction}
              onChange={e => setTriggerAction(e.target.value)}
              options={[
                { value: 'create', label: 'Create' },
                { value: 'update', label: 'Update' },
                { value: 'status_change', label: 'Status Change' },
              ]}
            />
          </FormField>
          <FormField label="Description">
            <Input
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Description (optional)"
            />
          </FormField>
        </div>
      </Modal>

      <DataTable
        columns={[
          { key: 'name', header: 'Name', render: (def: WorkflowDefinition) => <span className="text-white font-medium">{def.name}</span> },
          { key: 'trigger_entity', header: 'Trigger', render: (def: WorkflowDefinition) => <span className="text-gray-400 capitalize">{(def.trigger_entity || '').replace(/_/g, ' ')}</span> },
          { key: 'trigger_action', header: 'Action', render: (def: WorkflowDefinition) => <span className="text-gray-400 capitalize">{(def.trigger_action || '').replace(/_/g, ' ')}</span>, className: 'hidden md:table-cell' },
          { key: 'step_count', header: 'Steps', render: (def: WorkflowDefinition) => <span className="text-gray-400">{def.step_count || 0}</span>, className: 'hidden md:table-cell' },
          { key: 'is_active', header: 'Status', render: (def: WorkflowDefinition) => <StatusBadge status={def.is_active ? 'active' : 'inactive'} /> },
        ]}
        data={definitions}
        emptyIcon="🔄"
        emptyMessage="No workflow definitions"
      />
    </>
  )
}
