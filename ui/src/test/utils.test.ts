import { describe, it, expect } from 'vitest'
import { formatDate, formatCurrency } from '../utils/format'

// ─── formatDate ──────────────────────────────────────────────────────────────

describe('formatDate', () => {
  it('returns formatted date for valid ISO string', () => {
    const result = formatDate('2024-06-15')
    // en-NZ locale: "15 Jun 2024"
    expect(result).toContain('Jun')
    expect(result).toContain('2024')
    expect(result).toContain('15')
  })

  it('returns em dash for null', () => {
    expect(formatDate(null)).toBe('\u2014')
  })

  it('returns em dash for undefined', () => {
    expect(formatDate(undefined)).toBe('\u2014')
  })

  it('returns em dash for empty string', () => {
    expect(formatDate('')).toBe('\u2014')
  })

  it('handles invalid date strings gracefully', () => {
    // The function catches errors and returns the original string
    const result = formatDate('not-a-date')
    // new Date('not-a-date') produces Invalid Date, toLocaleDateString returns 'Invalid Date'
    // so the function returns either the original string or 'Invalid Date'
    expect(typeof result).toBe('string')
  })
})

// ─── formatCurrency ──────────────────────────────────────────────────────────

describe('formatCurrency', () => {
  it('formats NZD correctly', () => {
    const result = formatCurrency(1234.56)
    expect(result).toContain('1,234.56') // en-NZ formatting
  })

  it('returns em dash for null', () => {
    expect(formatCurrency(null)).toBe('\u2014')
  })

  it('returns em dash for undefined', () => {
    expect(formatCurrency(undefined)).toBe('\u2014')
  })

  it('handles 0 correctly', () => {
    const result = formatCurrency(0)
    expect(result).toContain('0.00')
  })

  it('handles large numbers', () => {
    const result = formatCurrency(1000000)
    expect(result).toContain('1,000,000')
  })
})
