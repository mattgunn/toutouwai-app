export interface ProbationPeriod {
  id: string
  employee_id: string
  start_date: string
  end_date: string
  status: string
  review_date: string | null
  reviewer_id: string | null
  notes: string | null
  outcome: string | null
  employee_name: string
  created_at: string
  updated_at: string
}
