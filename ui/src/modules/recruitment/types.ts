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
