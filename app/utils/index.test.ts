import { describe, expect, it } from 'vitest'
import { deserializePhoto, formatCameraText, formatExposure, formatExposureTime, formatFileSize, toFixed } from './index'

describe('formatExposureTime', () => {
  it('formats sub second times as fractions', () => {
    expect(formatExposureTime(0.005)).toBe('1/200')
    expect(formatExposureTime(0.5)).toBe('1/2')
  })

  it('keeps whole seconds as they are', () => {
    expect(formatExposureTime(1)).toBe('1')
    expect(formatExposureTime(30)).toBe('30')
  })
})

describe('formatExposure', () => {
  it('renders placeholders when exif is missing', () => {
    expect(formatExposure({})).toEqual(['ƒ/--', '--s', 'ISO --'])
  })

  it('renders the three values', () => {
    expect(formatExposure({ fNumber: 1.8, exposureTime: 0.004, iso: 400 })).toEqual(['ƒ/1.8', '1/250s', 'ISO 400'])
  })
})

describe('formatCameraText', () => {
  it('drops the Corporation suffix from the make', () => {
    // Real Nikon EXIF: make is upper case, model repeats it
    expect(formatCameraText({ make: 'NIKON CORPORATION', model: 'NIKON Z 6' })).toBe('NIKON Z 6')
  })

  it('does not repeat the make when the model already starts with it', () => {
    expect(formatCameraText({ make: 'Fujifilm', model: 'Fujifilm X-T4' })).toBe('Fujifilm X-T4')
  })

  it('falls back to a placeholder', () => {
    expect(formatCameraText({})).toBe('--')
  })
})

describe('formatFileSize', () => {
  it('uses metric units by default', () => {
    expect(formatFileSize(1500)).toBe('1.5 kB')
    expect(formatFileSize(2_500_000)).toBe('2.5 MB')
  })

  it('keeps bytes below the first threshold', () => {
    expect(formatFileSize(999)).toBe('999 B')
  })
})

describe('toFixed', () => {
  it('trims trailing zeros', () => {
    expect(toFixed(1.5)).toBe('1.5')
    expect(toFixed(1.23456789, 2)).toBe('1.23')
  })
})

describe('deserializePhoto', () => {
  it('converts dates and nulls', () => {
    const photo = deserializePhoto({
      id: 'abc',
      title: null,
      takenAt: '2024-05-01T10:00:00.000Z',
      createdAt: '2024-05-01T10:00:00.000Z',
      fileModified: null,
      tags: ['berlin'],
    } as never)

    expect(photo.takenAt).toBeInstanceOf(Date)
    expect(photo.createdAt).toBeInstanceOf(Date)
    expect(photo.title).toBeUndefined()
    expect(photo.fileModified).toBeUndefined()
    expect(photo.tags).toEqual(['berlin'])
  })

  it('keeps coordinates when the admin response includes them', () => {
    const photo = deserializePhoto({
      id: 'abc',
      latitude: 52.52,
      longitude: 13.4,
      tags: [],
    } as never)

    expect(photo.latitude).toBe(52.52)
    expect(photo.longitude).toBe(13.4)
  })
})
