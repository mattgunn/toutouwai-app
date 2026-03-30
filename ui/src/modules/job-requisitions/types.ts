export interface JobRequisition {
  id: string
  title: string
  department_id: string | null
  position_id: string | null
  requested_by: string | null
  number_of_openings: number
  justification: string | null
  priority: string | null
  status: string
  budget_min: number | null
  budget_max: number | null
  currency: string | null
  target_start_date: string | null
  approved_by: string | null
  approved_at: string | null
  department_name: string | null
  position_title: string | null
  requested_by_name: string | null
  created_at: string
  updated_at: string
}
