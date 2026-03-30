export interface JobPosting {
  id: string
  title: string
  department_id: string | null
  description: string | null
  requirements: string | null
  status: string
  location: string | null
  employment_type: string
  salary_min: number | null
  salary_max: number | null
  department_name: string | null
  applicant_count: number
  published_at: string | null
  closes_at: string | null
  created_at: string
  updated_at: string
}

export interface Applicant {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string | null
  job_posting_id: string
  status: string
  stage: string
  resume_url: string | null
  notes: string | null
  rating: number | null
  job_title: string | null
  applied_at: string
  created_at: string
  updated_at: string
}

export interface Interview {
  id: string
  applicant_id: string
  interviewer_id: string | null
  interview_type: string
  scheduled_at: string
  duration_minutes: number
  location: string | null
  notes: string | null
  status: string
  feedback: string | null
  rating: number | null
  applicant_name: string | null
  interviewer_name: string | null
  created_at: string
  updated_at: string
}

export interface Offer {
  id: string
  applicant_id: string
  job_posting_id: string | null
  salary: number | null
  currency: string
  start_date: string | null
  position_id: string | null
  department_id: string | null
  status: string
  notes: string | null
  sent_at: string | null
  responded_at: string | null
  applicant_name: string | null
  job_title: string | null
  position_title: string | null
  department_name: string | null
  created_at: string
  updated_at: string
}
