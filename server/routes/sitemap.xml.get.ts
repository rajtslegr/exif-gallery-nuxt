import { db } from '@nuxthub/db'
import { and, desc, gt, isNotNull, sql } from 'drizzle-orm'
import { setGalleryPhotosCacheHeaders } from '../utils/cache'
import { escapeXml, getSiteUrl, toLastmod } from '../utils/site'

const PAGE_SIZE = 500

interface SitemapEntry {
  path: string
  lastmod?: string
}

async function collectEntries() {
  const entries: SitemapEntry[] = [{ path: '/' }]

  // Photos are walked in pages so a large library cannot blow up one request
  let offset = 0
  while (true) {
    const photos = await db
      .select({ id: schema.photo.id, updatedAt: sql<unknown>`${schema.photo.updatedAt}` })
      .from(schema.photo)
      .orderBy(desc(schema.photo.id))
      .limit(PAGE_SIZE)
      .offset(offset)

    entries.push(...photos.map(photo => ({
      path: `/p/${photo.id}`,
      lastmod: toLastmod(photo.updatedAt),
    })))

    if (photos.length < PAGE_SIZE)
      break
    offset += PAGE_SIZE
  }

  const tags = await db
    .select({ name: schema.tag.name })
    .from(schema.tag)
    .where(gt(schema.tag.photoCount, 0))
    .orderBy(schema.tag.name)

  entries.push(...tags.map(tag => ({ path: `/tag/${encodeURIComponent(tag.name)}` })))

  // The camera route takes "Make|Model"
  const cameras = await db
    .select({ make: schema.photo.make, model: schema.photo.model })
    .from(schema.photo)
    .where(and(isNotNull(schema.photo.make), isNotNull(schema.photo.model)))
    .groupBy(schema.photo.make, schema.photo.model)
    .orderBy(schema.photo.make, schema.photo.model)

  entries.push(...cameras
    .filter((camera): camera is { make: string, model: string } => Boolean(camera.make && camera.model))
    .map(camera => ({ path: `/camera/${encodeURIComponent(`${camera.make}|${camera.model}`)}` })))

  const lenses = await db
    .select({ lensModel: schema.photo.lensModel })
    .from(schema.photo)
    .where(isNotNull(schema.photo.lensModel))
    .groupBy(schema.photo.lensModel)
    .orderBy(schema.photo.lensModel)

  entries.push(...lenses
    .filter((lens): lens is { lensModel: string } => Boolean(lens.lensModel))
    .map(lens => ({ path: `/lens/${encodeURIComponent(lens.lensModel)}` })))

  return entries
}

export default eventHandler(async (event) => {
  // Same cache tag as the gallery, so uploads and deletions purge the sitemap too
  setGalleryPhotosCacheHeaders(event)
  setHeader(event, 'content-type', 'application/xml; charset=utf-8')

  const origin = getSiteUrl(event)
  const entries = await collectEntries()

  const urls = entries.map(entry => [
    '  <url>',
    `    <loc>${escapeXml(`${origin}${entry.path}`)}</loc>`,
    entry.lastmod ? `    <lastmod>${entry.lastmod}</lastmod>` : '',
    '  </url>',
  ].filter(Boolean).join('\n'))

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    '</urlset>',
    '',
  ].join('\n')
})
