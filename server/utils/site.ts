import type { H3Event } from 'h3'

export function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Absolute origin of the current request, so sitemap/robots/canonical URLs do not
 * need a configured site url for this single-domain deployment.
 */
export function getSiteUrl(event: H3Event) {
  return getRequestURL(event).origin
}

/**
 * Stored timestamps are second based integers in new rows, but the
 * CURRENT_TIMESTAMP default writes text, so accept both and treat naive sqlite
 * timestamps as UTC.
 */
export function toLastmod(value: unknown) {
  if (value instanceof Date)
    return Number.isNaN(value.getTime()) ? undefined : value.toISOString()

  if (typeof value === 'number')
    return new Date(value * 1000).toISOString()

  if (typeof value === 'string' && value) {
    const naiveTimestamp = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)
    const parsed = new Date(naiveTimestamp ? `${value.replace(' ', 'T')}Z` : value)
    return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString()
  }

  return undefined
}
