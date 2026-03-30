export interface BenefitLifeEvent {
  id: string
  employee_id: string
  event_type: string
  event_date: string
  description: string | null
  status: string
  processed_by: string | null
  processed_at: string | null
  employee_name: string
  created_at: string
  updated_at: string
}
