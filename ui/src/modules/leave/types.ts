export interface LeaveType {
  id: string
  name: string
  days_per_year: number
  color: string
  is_active: boolean
}

export interface LeaveRequest {
  id: string
  employee_id: string
  leave_type_id: string
  start_date: string
  end_date: string
  days: number
  status: string
  notes: string | null
  employee_name: string | null
  leave_type_name: string | null
  created_at: string
  updated_at: string
}

export interface LeaveBalance {
  employee_id: string
  employee_name: string
  leave_type_id: string
  leave_type_name: string
  entitled: number
  used: number
  remaining: number
}
