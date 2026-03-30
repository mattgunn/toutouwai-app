export interface Asset {
  id: string
  name: string
  asset_tag: string | null
  category: string | null
  serial_number: string | null
  purchase_date: string | null
  purchase_cost: number | null
  status: string
  assigned_to: string | null
  assigned_date: string | null
  notes: string | null
  assigned_to_name: string | null
  created_at: string
  updated_at: string
}
