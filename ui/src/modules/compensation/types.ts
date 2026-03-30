export interface CompensationRecord {
  id: string
  employee_id: string
  effective_date: string
  salary: number
  currency: string
  pay_frequency: string
  reason: string | null
  notes: string | null
  employee_name: string | null
  created_at: string
  updated_at: string
}

export interface CurrentCompensation extends CompensationRecord {
  employee_status: string | null
  department_name: string | null
  position_title: string | null
}

export interface SalaryBand {
  id: string
  name: string
  grade: string
  position_id: string | null
  min_salary: number
  mid_salary: number
  max_salary: number
  currency: string
  position_title: string | null
  created_at: string
  updated_at: string
}
