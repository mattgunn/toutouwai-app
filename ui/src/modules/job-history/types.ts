export interface JobHistoryEntry {
  id: string
  employee_id: string
  effective_date: string
  position_id: string | null
  department_id: string | null
  manager_id: string | null
  location: string | null
  employment_type: string | null
  reason: string | null
  notes: string | null
  employee_name: string
  position_title: string | null
  department_name: string | null
  manager_name: string | null
  created_at: string
  updated_at: string
}
