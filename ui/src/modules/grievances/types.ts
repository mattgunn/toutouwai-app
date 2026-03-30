export interface Grievance {
  id: string
  employee_id: string
  subject: string
  description: string | null
  category: string | null
  priority: string | null
  status: string
  assigned_to: string | null
  resolution: string | null
  filed_date: string
  resolved_at: string | null
  employee_name: string
  created_at: string
  updated_at: string
}
