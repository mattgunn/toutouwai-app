import type { Employee } from '../employees/types'
import type { LeaveRequest } from '../leave/types'

export interface DashboardData {
  total_employees: number
  active_employees: number
  pending_leave_requests: number
  open_positions: number
  active_review_cycles: number
  recent_hires: Employee[]
  upcoming_leave: LeaveRequest[]
}
