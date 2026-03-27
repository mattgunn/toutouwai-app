export interface SuccessionPlan {
  id: string
  position_id: string
  incumbent_id: string | null
  risk_of_loss: string
  impact_of_loss: string
  notes: string | null
  position_title: string | null
  department_name: string | null
  incumbent_name: string | null
  candidate_count: number
  created_at: string
  updated_at: string
}

export interface SuccessionCandidate {
  id: string
  plan_id: string
  employee_id: string
  readiness: string
  notes: string | null
  employee_name: string | null
  current_position: string | null
  created_at: string
  updated_at: string
}
