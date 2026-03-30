export interface CostCenter {
  id: string
  code: string
  name: string
  description: string | null
  department_id: string | null
  manager_id: string | null
  budget: number | null
  currency: string | null
  is_active: number
  department_name: string | null
  manager_name: string | null
  created_at: string
  updated_at: string
}
