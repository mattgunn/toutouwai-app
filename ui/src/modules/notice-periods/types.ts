export interface NoticePeriod {
  id: string
  employee_id: string
  notice_type: string
  notice_date: string
  effective_date: string
  last_working_day: string | null
  notice_length_days: number | null
  status: string
  reason: string | null
  notes: string | null
  employee_name: string
  created_at: string
  updated_at: string
}
