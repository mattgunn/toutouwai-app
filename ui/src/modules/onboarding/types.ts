export interface OnboardingTemplate {
  id: string
  name: string
  description: string | null
  department_id: string | null
  department_name: string | null
  is_active: number
  created_at: string
  updated_at: string
}

export interface OnboardingTemplateTask {
  id: string
  template_id: string
  title: string
  description: string | null
  assigned_to_role: string
  due_days: number
  sort_order: number
  created_at: string
  updated_at: string
}

export interface OnboardingChecklist {
  id: string
  employee_id: string
  template_id: string | null
  status: string
  started_at: string
  completed_at: string | null
  employee_name: string | null
  template_name: string | null
  tasks: OnboardingTask[]
  total_tasks: number
  completed_tasks: number
  created_at: string
  updated_at: string
}

export interface OnboardingTask {
  id: string
  checklist_id: string
  title: string
  description: string | null
  assigned_to_role: string
  assigned_to_id: string | null
  due_date: string | null
  status: string
  completed_at: string | null
  completed_by: string | null
  sort_order: number
  created_at: string
  updated_at: string
}
