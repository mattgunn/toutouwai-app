export interface Skill {
  id: string
  name: string
  category: string | null
  description: string | null
  employee_count: number
  created_at: string
  updated_at: string
}

export interface EmployeeSkill {
  id: string
  employee_id: string
  skill_id: string
  proficiency_level: string | null
  years_experience: number | null
  notes: string | null
  verified_by: string | null
  verified_at: string | null
  employee_name: string
  skill_name: string
  created_at: string
  updated_at: string
}
