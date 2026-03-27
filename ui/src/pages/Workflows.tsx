import { useState, useEffect } from 'react'
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

type View = 'definitions' | 'approvals'

export default function Workflows() {
  const [view, setView] = useState<View>('approvals')
  const [approvals, setApprovals] = useState<WorkflowApproval[]>([])
  const [definitions, setDefinitions] = useState<WorkflowDefinition[]>([])
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    fetchMyApprovals().then(setApprovals).catch(() => {})
    fetchWorkflowDefinitions().then(setDefinitions).catch(() => {})
  }, [])

  const reload = () => {
    fetchMyApprovals().then(setApprovals).catch(() => {})
    fetchWorkflowDefinitions().then(setDefinitions).catch(() => {})
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-white">Workflows</h1>
        {view === 'definitions' && (
          <button
            onClick={() => setShowForm(true)}
            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
          >
            New Definition
          </button>
        )}
      </div>

      <div className="flex gap-1 mb-6">
        <button
          onClick={() => setView('approvals')}
          className={`px-4 py-2 text-sm rounded transition-colors ${
            view === 'approvals'
              ? 'bg-blue-600/20 text-blue-400'
              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
          }`}
        >
          My Approvals
          {approvals.length > 0 && (
            <span className="ml-2 px-1.5 py-0.5 bg-amber-600/20 text-amber-400 text-xs rounded">
              {approvals.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setView('definitions')}
          className={`px-4 py-2 text-sm rounded transition-colors ${
            view === 'definitions'
              ? 'bg-blue-600/20 text-blue-400'
              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
          }`}
        >
          Definitions
        </button>
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

  const handleApprove = async (id: string) => {
    await approveWorkflow(id)
    onAction()
  }

  const handleReject = async (id: string) => {
    await rejectWorkflow(id, comments)
    setRejectId(null)
    setComments('')
    onAction()
  }

  if (approvals.length === 0) {
    return <EmptyState message="No pending approvals" />
  }

  return (
    <div className="space-y-3">
      {approvals.map(approval => (
        <div key={approval.id} className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-white font-medium">{approval.definition_name || 'Workflow'}</p>
              <p className="text-xs text-gray-500 mt-1">
                <span className="capitalize">{approval.entity_type.replace(/_/g, ' ')}</span>
                {' \u2022 '}Initiated by {approval.initiated_by_name || 'Unknown'}
                {' \u2022 '}{new Date(approval.created_at).toLocaleDateString()}
              </p>
            </div>
            <StatusBadge status={approval.status} />
          </div>

          {rejectId === approval.id ? (
            <div className="mt-3 space-y-2">
              <textarea
                value={comments}
                onChange={e => setComments(e.target.value)}
                placeholder="Reason for rejection..."
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-500"
                rows={2}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => handleReject(approval.id)}
                  className="px-3 py-1.5 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
                >
                  Confirm Reject
                </button>
                <button
                  onClick={() => { setRejectId(null); setComments('') }}
                  className="px-3 py-1.5 bg-gray-700 text-gray-300 text-xs rounded hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => handleApprove(approval.id)}
                className="px-3 py-1.5 bg-emerald-600 text-white text-xs rounded hover:bg-emerald-700 transition-colors"
              >
                Approve
              </button>
              <button
                onClick={() => setRejectId(approval.id)}
                className="px-3 py-1.5 bg-gray-700 text-gray-300 text-xs rounded hover:bg-gray-600 transition-colors"
              >
                Reject
              </button>
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

  const handleCreate = async () => {
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
    onCreated()
  }

  return (
    <>
      {showForm && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-4">
          <h2 className="text-sm font-semibold text-white mb-3">New Workflow Definition</h2>
          <div className="grid md:grid-cols-2 gap-3">
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Workflow name"
              className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-500"
            />
            <select
              value={triggerEntity}
              onChange={e => setTriggerEntity(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white"
            >
              <option value="leave_request">Leave Request</option>
              <option value="employee">Employee</option>
              <option value="compensation">Compensation</option>
            </select>
            <select
              value={triggerAction}
              onChange={e => setTriggerAction(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white"
            >
              <option value="create">Create</option>
              <option value="update">Update</option>
              <option value="status_change">Status Change</option>
            </select>
            <input
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Description (optional)"
              className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-500"
            />
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleCreate}
              disabled={!name}
              className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              Create
            </button>
            <button
              onClick={onCloseForm}
              className="px-3 py-1.5 bg-gray-700 text-gray-300 text-sm rounded hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {definitions.length === 0 ? (
        <EmptyState message="No workflow definitions" />
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 text-xs uppercase">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Trigger</th>
                <th className="px-4 py-3 hidden md:table-cell">Action</th>
                <th className="px-4 py-3 hidden md:table-cell">Steps</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {definitions.map(def => (
                <tr key={def.id} className="border-t border-gray-800 hover:bg-gray-800/50 transition-colors">
                  <td className="px-4 py-3 text-white font-medium">{def.name}</td>
                  <td className="px-4 py-3 text-gray-400 capitalize">{def.trigger_entity.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3 text-gray-400 capitalize hidden md:table-cell">{def.trigger_action.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3 text-gray-400 hidden md:table-cell">{def.step_count || 0}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={def.is_active ? 'active' : 'inactive'} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
