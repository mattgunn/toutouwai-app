export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '\u2014'
  try {
    return new Date(dateStr).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return dateStr
  }
}

export function formatCurrency(amount: number | null | undefined, currency = 'NZD'): string {
  if (amount == null) return '\u2014'
  return new Intl.NumberFormat('en-NZ', { style: 'currency', currency }).format(amount)
}
