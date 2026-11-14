import { createCuid } from './utils'

// Compression keeps photos far below these limits, but uploads with compression
// disabled send the originals. Leave headroom without letting one request fill
// the bucket or hit the Worker request size limit.
export const MAX_FILE_BYTES = 30 * 1024 * 1024
export const MAX_TOTAL_BYTES = 90 * 1024 * 1024

/**
 * The MIME type is client supplied, so verify the container signature as well.
 * Accepted formats are what the browser encoder produces: JPEG, PNG, WebP, AVIF.
 */
export async function hasImageSignature(file: File) {
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer())
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.subarray(start, end))

  const isJpeg = bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF
  const isPng = bytes[0] === 0x89 && ascii(1, 4) === 'PNG'
  const isWebp = ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP'
  const isAvif = ascii(4, 8) === 'ftyp' && ['avif', 'avis'].includes(ascii(8, 12))

  return isJpeg || isPng || isWebp || isAvif
}

export function parseFormDate(value: FormDataEntryValue | null) {
  if (!value)
    return null

  const date = new Date(value.toString())
  return Number.isNaN(date.getTime()) ? null : date
}

/**
 * Compressed variants arrive as "<name>.<ext>" and "<name>_thumb.jpg", so the
 * thumbnail must not decide how the photo is named.
 */
export function toPhotoFileName(file: File) {
  return file.name.replace(/\.[^.]+$/, '').replace(/_thumb$/, '') || createCuid()
}
