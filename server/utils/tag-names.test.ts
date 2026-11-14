import { describe, expect, it } from 'vitest'
import { parseTagNames } from './tag-names'

describe('parseTagNames', () => {
  it('splits, trims and drops empty entries', () => {
    expect(parseTagNames(' berlin, night ,, ')).toEqual(['berlin', 'night'])
  })

  it('dedupes while keeping the first occurrence order', () => {
    expect(parseTagNames('berlin,night,berlin')).toEqual(['berlin', 'night'])
  })

  it('caps the length so a tag cannot grow without bound', () => {
    const parsed = parseTagNames('x'.repeat(100))
    expect(parsed[0]).toHaveLength(64)
  })

  it('returns nothing for an empty string', () => {
    expect(parseTagNames('')).toEqual([])
  })

  it('does not treat commas inside a name as separators', () => {
    expect(parseTagNames('a,b')).toEqual(['a', 'b'])
  })
})
