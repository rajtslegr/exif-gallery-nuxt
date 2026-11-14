import { describe, expect, it } from 'vitest'
import { hasImageSignature, MAX_FILE_BYTES, parseFormDate, toPhotoFileName } from './upload'

function fileWithBytes(name: string, bytes: number[], type = 'image/jpeg') {
  return new File([new Uint8Array(bytes)], name, { type })
}

describe('toPhotoFileName', () => {
  // Regression: the thumbnail variant used to win the naming race, so every
  // compressed upload was stored as "<name>_thumb".
  it('strips the _thumb suffix of the thumbnail variant', () => {
    expect(toPhotoFileName(fileWithBytes('IMG_1234_thumb.jpg', []))).toBe('IMG_1234')
  })

  it('strips the extension of a regular variant', () => {
    expect(toPhotoFileName(fileWithBytes('IMG_1234.webp', [], 'image/webp'))).toBe('IMG_1234')
  })

  it('keeps dots that are part of the name', () => {
    expect(toPhotoFileName(fileWithBytes('2024.05.01-berlin.jpg', []))).toBe('2024.05.01-berlin')
  })

  it('keeps names without an extension', () => {
    expect(toPhotoFileName(fileWithBytes('IMG_1234', []))).toBe('IMG_1234')
  })

  it('falls back to a generated id for an empty name', () => {
    const name = toPhotoFileName(fileWithBytes('', []))
    expect(name).not.toBe('')
    expect(name).toHaveLength(16)
  })
})

describe('hasImageSignature', () => {
  it('accepts jpeg', async () => {
    await expect(hasImageSignature(fileWithBytes('a.jpg', [0xFF, 0xD8, 0xFF, 0xE0]))).resolves.toBe(true)
  })

  it('accepts png', async () => {
    const png = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]
    await expect(hasImageSignature(fileWithBytes('a.png', png, 'image/png'))).resolves.toBe(true)
  })

  it('accepts webp', async () => {
    const webp = [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]
    await expect(hasImageSignature(fileWithBytes('a.webp', webp, 'image/webp'))).resolves.toBe(true)
  })

  it('accepts avif', async () => {
    const avif = [0, 0, 0, 0, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66]
    await expect(hasImageSignature(fileWithBytes('a.avif', avif, 'image/avif'))).resolves.toBe(true)
  })

  it('rejects a file whose declared type lies', async () => {
    await expect(hasImageSignature(fileWithBytes('payload.jpg', [0x3C, 0x73, 0x76, 0x67]))).resolves.toBe(false)
  })

  it('rejects an empty file', async () => {
    await expect(hasImageSignature(fileWithBytes('empty.jpg', []))).resolves.toBe(false)
  })
})

describe('parseFormDate', () => {
  it('parses an iso string', () => {
    expect(parseFormDate('2024-05-01T10:00:00.000Z')?.toISOString()).toBe('2024-05-01T10:00:00.000Z')
  })

  it('returns null for a missing value', () => {
    expect(parseFormDate(null)).toBeNull()
    expect(parseFormDate('')).toBeNull()
  })

  it('returns null instead of an invalid date', () => {
    expect(parseFormDate('not a date')).toBeNull()
  })
})

describe('limits', () => {
  it('allows room for originals but not for a whole library', () => {
    expect(MAX_FILE_BYTES).toBe(30 * 1024 * 1024)
  })
})
