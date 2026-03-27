export interface WorkflowDefinition {
  id: string
  name: string
  trigger_entity: string
  trigger_action: string
  description: string | null
  is_active: number
  step_count?: number
  created_at: string
  updated_at: string
}

export interface WorkflowStep {
  id: string
  definition_id: string
  step_order: number
  approver_type: string
  approver_role: string | null
  approver_user_id: string | null
  approver_user_name: string | null
  created_at: string
  updated_at: string
}

export interface WorkflowInstance {
  id: string
  definition_id: string
  entity_type: string
  entity_id: string
  initiated_by: string | null
  status: string
  current_step: number
  definition_name: string | null
  initiated_by_name: string | null
  created_at: string
  updated_at: string
}

export interface WorkflowInstancesResponse {
  instances: WorkflowInstance[]
  total: number
  page: number
  per_page: number
}

export interface WorkflowApproval {
  id: string
  instance_id: string
  step_id: string
  approver_id: string | null
  status: string
  comments: string | null
  decided_at: string | null
  entity_type: string
  entity_id: string
  instance_status: string
  definition_name: string | null
  initiated_by_name: string | null
  created_at: string
  updated_at: string
}
