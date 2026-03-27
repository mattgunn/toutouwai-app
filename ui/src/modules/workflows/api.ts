import { BASE, authFetch, jsonPost, jsonPut, jsonDelete } from '../shared/api'
import type {
  WorkflowDefinition,
  WorkflowStep,
  WorkflowInstancesResponse,
  WorkflowApproval,
} from './types'

export async function fetchWorkflowDefinitions(): Promise<WorkflowDefinition[]> {
  const res = await authFetch(`${BASE}/workflows/definitions`)
  if (!res.ok) throw new Error('Failed to fetch workflow definitions')
  return res.json()
}

export async function createWorkflowDefinition(body: unknown): Promise<WorkflowDefinition> {
  const res = await jsonPost(`${BASE}/workflows/definitions`, body)
  if (!res.ok) throw new Error('Failed to create workflow definition')
  return res.json()
}

export async function updateWorkflowDefinition(id: string, body: unknown): Promise<WorkflowDefinition> {
  const res = await jsonPut(`${BASE}/workflows/definitions/${id}`, body)
  if (!res.ok) throw new Error('Failed to update workflow definition')
  return res.json()
}

export async function fetchWorkflowSteps(defId: string): Promise<WorkflowStep[]> {
  const res = await authFetch(`${BASE}/workflows/definitions/${defId}/steps`)
  if (!res.ok) throw new Error('Failed to fetch workflow steps')
  return res.json()
}

export async function createWorkflowStep(defId: string, body: unknown): Promise<WorkflowStep> {
  const res = await jsonPost(`${BASE}/workflows/definitions/${defId}/steps`, body)
  if (!res.ok) throw new Error('Failed to create workflow step')
  return res.json()
}

export async function updateWorkflowStep(stepId: string, body: unknown): Promise<WorkflowStep> {
  const res = await jsonPut(`${BASE}/workflows/steps/${stepId}`, body)
  if (!res.ok) throw new Error('Failed to update workflow step')
  return res.json()
}

export async function deleteWorkflowStep(stepId: string): Promise<void> {
  const res = await jsonDelete(`${BASE}/workflows/steps/${stepId}`)
  if (!res.ok) throw new Error('Failed to delete workflow step')
}

export async function fetchWorkflowInstances(params?: Record<string, string>): Promise<WorkflowInstancesResponse> {
  const qs = params ? '?' + new URLSearchParams(params).toString() : ''
  const res = await authFetch(`${BASE}/workflows/instances${qs}`)
  if (!res.ok) throw new Error('Failed to fetch workflow instances')
  return res.json()
}

export async function fetchMyApprovals(): Promise<WorkflowApproval[]> {
  const res = await authFetch(`${BASE}/workflows/my-approvals`)
  if (!res.ok) throw new Error('Failed to fetch approvals')
  return res.json()
}

export async function approveWorkflow(approvalId: string, comments?: string): Promise<void> {
  const res = await jsonPost(`${BASE}/workflows/approvals/${approvalId}/approve`, { comments })
  if (!res.ok) throw new Error('Failed to approve')
}

export async function rejectWorkflow(approvalId: string, comments?: string): Promise<void> {
  const res = await jsonPost(`${BASE}/workflows/approvals/${approvalId}/reject`, { comments })
  if (!res.ok) throw new Error('Failed to reject')
}
