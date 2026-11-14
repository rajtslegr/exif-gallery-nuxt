import { describe, expect, it } from 'vitest'
import { toLastmod } from './site'

describe('toLastmod', () => {
  it('formats a date', () => {
    expect(toLastmod(new Date('2024-05-01T10:00:00.000Z'))).toBe('2024-05-01T10:00:00.000Z')
  })

  it('treats second based integers as unix seconds', () => {
    expect(toLastmod(1_714_557_600)).toBe('2024-05-01T10:00:00.000Z')
  })

  // D1 writes CURRENT_TIMESTAMP as text without a zone, which is UTC
  it('treats a naive sqlite timestamp as UTC', () => {
    expect(toLastmod('2024-05-01 10:00:00')).toBe('2024-05-01T10:00:00.000Z')
  })

  it('parses a timestamp that already carries a zone', () => {
    expect(toLastmod('2024-05-01T12:00:00+02:00')).toBe('2024-05-01T10:00:00.000Z')
  })

  it('ignores unusable values', () => {
    expect(toLastmod(undefined)).toBeUndefined()
    expect(toLastmod(null)).toBeUndefined()
    expect(toLastmod('')).toBeUndefined()
    expect(toLastmod('nope')).toBeUndefined()
    expect(toLastmod(new Date('nope'))).toBeUndefined()
  })
})
