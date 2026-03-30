export interface Location {
  id: string
  name: string
  address: string | null
  city: string | null
  state: string | null
  country: string | null
  postal_code: string | null
  timezone: string | null
  is_active: number
  created_at: string
  updated_at: string
}
