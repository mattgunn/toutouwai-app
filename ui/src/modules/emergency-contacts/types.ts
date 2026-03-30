export interface EmergencyContact {
  id: string
  employee_id: string
  contact_name: string
  relationship: string | null
  phone: string | null
  email: string | null
  is_primary: number
  employee_name: string
  created_at: string
  updated_at: string
}
