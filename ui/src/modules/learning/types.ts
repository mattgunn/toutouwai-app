export interface Course {
  id: string
  title: string
  description: string | null
  category: string
  format: string
  duration_hours: number
  provider: string | null
  is_mandatory: number
  is_active: number
  enrollment_count: number
  created_at: string
  updated_at: string
}

export interface CourseEnrollment {
  id: string
  course_id: string
  employee_id: string
  status: string
  assigned_by: string | null
  assigned_at: string
  started_at: string | null
  completed_at: string | null
  score: number | null
  certificate_url: string | null
  due_date: string | null
  employee_name: string
  course_title: string
  created_at: string
  updated_at: string
}

export interface Certification {
  id: string
  employee_id: string
  name: string
  issuer: string | null
  issue_date: string | null
  expiry_date: string | null
  credential_id: string | null
  credential_url: string | null
  employee_name: string
  created_at: string
  updated_at: string
}
