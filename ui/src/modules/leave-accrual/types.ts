export interface LeaveAccrualPolicy {
  id: string
  leave_type_id: string
  name: string
  accrual_rate: number
  accrual_frequency: string
  max_balance: number | null
  carry_over_limit: number | null
  waiting_period_days: number | null
  is_active: number
  leave_type_name: string
  created_at: string
  updated_at: string
}
