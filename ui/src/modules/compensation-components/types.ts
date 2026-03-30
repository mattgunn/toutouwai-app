export interface CompensationComponent {
  id: string
  employee_id: string
  component_type: string
  amount: number
  currency: string
  frequency: string | null
  effective_date: string
  end_date: string | null
  description: string | null
  status: string
  employee_name: string
  created_at: string
  updated_at: string
}
