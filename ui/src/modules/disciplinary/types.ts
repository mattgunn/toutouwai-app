export interface DisciplinaryAction {
  id: string
  employee_id: string
  action_type: string
  description: string | null
  incident_date: string | null
  action_date: string
  issued_by: string | null
  status: string
  resolution: string | null
  resolved_at: string | null
  employee_name: string
  created_at: string
  updated_at: string
}
