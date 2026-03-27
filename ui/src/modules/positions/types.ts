export interface Position {
  id: string
  title: string
  department_id: string | null
  department_name: string | null
  level: string | null
  description: string | null
  employee_count: number
  created_at: string
  updated_at: string
}
