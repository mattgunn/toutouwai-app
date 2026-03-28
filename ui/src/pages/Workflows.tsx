import { useState, useEffect } from 'react'
import { formatDate } from '../utils/format'
import {
  fetchWorkflowDefinitions,
  createWorkflowDefinition,
  fetchWorkflowSteps,
  fetchWorkflowInstances,
  fetchMyApprovals,
  approveWorkflow,
  rejectWorkflow,
} from '../modules/workflows/api'
import type { WorkflowDefinition, WorkflowStep, WorkflowInstance, WorkflowApproval } from '../modules/workflows/types'
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
  const [selectedApproval, setSelectedApproval] = useState<WorkflowApproval | null>(null)
  const toast = useToast()

  const handleApprove = async (id: string) => {
    setApproving(id)
    try {
      await approveWorkflow(id)
      toast.success('Workflow approved')
      setSelectedApproval(null)
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
      setSelectedApproval(null)
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
    <>
      <div className="space-y-3">
        {approvals.map(approval => (
          <div
            key={approval.id}
            onClick={() => setSelectedApproval(approval)}
            className={`bg-gray-900 border border-gray-800 rounded-lg p-4 border-l-4 cursor-pointer hover:bg-gray-800/50 transition-colors ${
              approval.status === 'pending' ? 'border-l-amber-500' :
              approval.status === 'approved' ? 'border-l-emerald-500' :
              approval.status === 'rejected' ? 'border-l-red-500' : 'border-l-gray-600'
            }`}
          >
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
          </div>
        ))}
      </div>

      {/* Approval detail modal */}
      <Modal
        open={!!selectedApproval}
        onClose={() => setSelectedApproval(null)}
        title="Approval Details"
        size="md"
        footer={
          selectedApproval?.status === 'pending' ? (
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => { setRejectId(selectedApproval.id); setSelectedApproval(null) }}
              >
                Reject
              </Button>
              <Button
                size="sm"
                onClick={() => handleApprove(selectedApproval.id)}
                loading={approving === selectedApproval.id}
              >
                Approve
              </Button>
            </div>
          ) : undefined
        }
      >
        {selectedApproval && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Workflow</p>
                <p className="text-sm text-white font-medium">{selectedApproval.definition_name || 'Workflow'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Status</p>
                <StatusBadge status={selectedApproval.status} />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Entity Type</p>
                <p className="text-sm text-white capitalize">{(selectedApproval.entity_type || '').replace(/_/g, ' ')}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Entity ID</p>
                <p className="text-sm text-gray-300 font-mono text-xs break-all">{selectedApproval.entity_id}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Initiated By</p>
                <p className="text-sm text-white">{selectedApproval.initiated_by_name || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Instance Status</p>
                <StatusBadge status={selectedApproval.instance_status} />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Created</p>
                <p className="text-sm text-white">{formatDate(selectedApproval.created_at)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Decided At</p>
                <p className="text-sm text-white">{selectedApproval.decided_at ? formatDate(selectedApproval.decided_at) : '\u2014'}</p>
              </div>
            </div>
            {selectedApproval.comments && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Comments</p>
                <p className="text-sm text-gray-300">{selectedApproval.comments}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Reject modal */}
      <Modal
        open={!!rejectId}
        onClose={() => { setRejectId(null); setComments('') }}
        title="Reject Workflow"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setRejectId(null); setComments('') }} disabled={rejecting}>Cancel</Button>
            <Button variant="danger" onClick={() => rejectId && handleReject(rejectId)} loading={rejecting}>Reject</Button>
          </>
        }
      >
        <FormField label="Reason for rejection">
          <Textarea
            value={comments}
            onChange={e => setComments(e.target.value)}
            placeholder="Reason for rejection..."
            rows={2}
          />
        </FormField>
      </Modal>
    </>
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
  const [selectedDef, setSelectedDef] = useState<WorkflowDefinition | null>(null)
  const [steps, setSteps] = useState<WorkflowStep[]>([])
  const [instances, setInstances] = useState<WorkflowInstance[]>([])
  const [stepsLoading, setStepsLoading] = useState(false)
  const toast = useToast()

  useEffect(() => {
    if (selectedDef) {
      setStepsLoading(true)
      Promise.all([
        fetchWorkflowSteps(selectedDef.id).then(setSteps).catch(() => {}),
        fetchWorkflowInstances({ definition_id: selectedDef.id }).then(r => setInstances(r.instances)).catch(() => setInstances([])),
      ]).finally(() => setStepsLoading(false))
    }
  }, [selectedDef])

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

  // Detail view for selected definition
  if (selectedDef) {
    return (
      <div>
        <Button variant="ghost" size="sm" onClick={() => { setSelectedDef(null); setSteps([]); setInstances([]) }} className="mb-4">
          &larr; Back to Definitions
        </Button>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-white">{selectedDef.name}</h2>
              {selectedDef.description && <p className="text-sm text-gray-400 mt-1">{selectedDef.description}</p>}
            </div>
            <StatusBadge status={selectedDef.is_active ? 'active' : 'inactive'} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Trigger Entity</p>
              <p className="text-sm text-white capitalize">{(selectedDef.trigger_entity || '').replace(/_/g, ' ')}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Trigger Action</p>
              <p className="text-sm text-white capitalize">{(selectedDef.trigger_action || '').replace(/_/g, ' ')}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Steps</p>
              <p className="text-sm text-white">{selectedDef.step_count || 0}</p>
            </div>
          </div>
        </div>

        {stepsLoading ? (
          <SkeletonTable rows={3} cols={3} />
        ) : (
          <>
            <h3 className="text-sm font-semibold text-white mb-3">Workflow Steps</h3>
            {steps.length === 0 ? (
              <p className="text-gray-500 text-sm py-4 text-center mb-6">No steps configured</p>
            ) : (
              <div className="space-y-2 mb-6">
                {steps.map((step, idx) => (
                  <div key={step.id} className="bg-gray-900 border border-gray-800 rounded-lg p-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center text-sm font-medium shrink-0">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="text-sm text-white capitalize">
                        {step.approver_type.replace(/_/g, ' ')}
                        {step.approver_role && <span className="text-gray-400"> ({step.approver_role})</span>}
                      </p>
                      {step.approver_user_name && (
                        <p className="text-xs text-gray-500">{step.approver_user_name}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <h3 className="text-sm font-semibold text-white mb-3">Recent Instances</h3>
            {instances.length === 0 ? (
              <p className="text-gray-500 text-sm py-4 text-center">No workflow instances</p>
            ) : (
              <DataTable
                columns={[
                  { key: 'entity_type', header: 'Entity', render: (inst: WorkflowInstance) => <span className="text-gray-400 capitalize">{(inst.entity_type || '').replace(/_/g, ' ')}</span> },
                  { key: 'initiated_by_name', header: 'Initiated By', render: (inst: WorkflowInstance) => <span className="text-white">{inst.initiated_by_name || '\u2014'}</span> },
                  { key: 'current_step', header: 'Step', render: (inst: WorkflowInstance) => <span className="text-gray-400">{inst.current_step}</span> },
                  { key: 'status', header: 'Status', render: (inst: WorkflowInstance) => <StatusBadge status={inst.status} /> },
                  { key: 'created_at', header: 'Created', render: (inst: WorkflowInstance) => <span className="text-gray-400">{formatDate(inst.created_at)}</span> },
                ]}
                data={instances}
                keyField="id"
              />
            )}
          </>
        )}
      </div>
    )
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
        onRowClick={(def) => setSelectedDef(def)}
      />
    </>
  )
}
