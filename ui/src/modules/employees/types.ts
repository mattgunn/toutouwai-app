export interface Employee {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string | null
  department_id: string | null
  position_id: string | null
  manager_id: string | null
  start_date: string | null
  end_date: string | null
  status: string
  avatar_url: string | null
  address: string | null
  emergency_contact: string | null
  department_name: string | null
  position_title: string | null
  manager_name: string | null
  created_at: string
  updated_at: string
}

export interface EmployeesResponse {
  employees: Employee[]
  total: number
  page: number
  per_page: number
}
