export interface BenefitPlan {
  id: string
  name: string
  type: string
  provider: string | null
  description: string | null
  is_active: number
  active_enrollments: number
  created_at: string
  updated_at: string
}

export interface BenefitEnrollment {
  id: string
  employee_id: string
  plan_id: string
  status: string
  start_date: string
  end_date: string | null
  coverage_level: string
  employee_contribution: number
  employer_contribution: number
  employee_name: string | null
  plan_name: string | null
  plan_type: string | null
  created_at: string
  updated_at: string
}
