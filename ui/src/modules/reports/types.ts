export interface HeadcountRow {
  department: string | null
  status: string
  count: number
}

export interface PositionRow {
  position: string | null
  count: number
}

export interface HeadcountReport {
  by_department: HeadcountRow[]
  by_position: PositionRow[]
  totals: { status: string; count: number }[]
}

export interface TurnoverReport {
  by_period: { period: string; terminations: number }[]
  total_active: number
  total_terminated: number
  turnover_rate: number
}

export interface LeaveUtilizationReport {
  by_type: { leave_type: string; request_count: number; total_days: number; status: string | null }[]
  by_department: { department: string | null; leave_type: string; days_used: number }[]
}

export interface TimeSummaryReport {
  by_employee: { employee_name: string; total_hours: number; entry_count: number }[]
  by_project: { project: string; total_hours: number; entry_count: number }[]
  total_hours: number
  total_entries: number
}

export interface CompensationReport {
  by_department: { department: string | null; employee_count: number; position_level: string | null }[]
  by_position: { position: string | null; level: string | null; employee_count: number }[]
}

export interface RecruitmentReport {
  postings_by_status: { status: string; count: number }[]
  applicants_by_stage: { stage: string; count: number }[]
  total_postings: number
  total_applicants: number
  total_hired: number
  conversion_rate: number
}

export interface DiversityReport {
  by_department: { department: string | null; count: number }[]
  by_tenure: { tenure_group: string; count: number }[]
  by_gender: { gender: string; count: number }[]
  by_employment_type: { employment_type: string; count: number }[]
  by_age: { age_group: string; count: number }[]
  by_location: { location: string; count: number }[]
  by_ethnicity: { ethnicity: string; count: number }[]
}
