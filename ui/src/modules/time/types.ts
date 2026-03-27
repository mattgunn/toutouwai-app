export interface TimeEntry {
  id: string
  employee_id: string
  date: string
  hours: number
  project: string | null
  description: string | null
  employee_name: string | null
  created_at: string
  updated_at: string
}
