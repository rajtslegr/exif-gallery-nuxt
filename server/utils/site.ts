import type { H3Event } from 'h3'

/**
 * Absolute origin of the current request, so sitemap/robots/canonical URLs do not
 * need a configured site url for this single-domain deployment.
 */
export function getSiteUrl(event: H3Event) {
  return getRequestURL(event).origin
}
