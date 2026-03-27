export interface Department {
  id: string
  name: string
  description: string | null
  head_id: string | null
  head_name: string | null
  employee_count: number
  created_at: string
  updated_at: string
}
