export interface Document {
  id: string
  employee_id: string | null
  name: string
  file_path: string | null
  file_size: number | null
  mime_type: string | null
  category: string
  description: string | null
  uploaded_by: string | null
  uploaded_by_name: string | null
  employee_name: string | null
  expiry_date: string | null
  created_at: string
  updated_at: string
}
