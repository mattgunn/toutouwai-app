export interface ReviewCycle {
  id: string
  name: string
  start_date: string
  end_date: string
  status: string
  review_count: number
  created_at: string
  updated_at: string
}

export interface Review {
  id: string
  employee_id: string
  reviewer_id: string
  cycle_id: string
  rating: number | null
  feedback: string | null
  status: string
  employee_name: string | null
  reviewer_name: string | null
  cycle_name: string | null
  submitted_at: string | null
  created_at: string
  updated_at: string
}

export interface Goal {
  id: string
  employee_id: string
  title: string
  description: string | null
  due_date: string | null
  status: string
  progress: number
  employee_name: string | null
  created_at: string
  updated_at: string
}
