import { escapeXml } from './site'

export interface FeedPhoto {
  id: string
  fileName: string
  title?: string | null
  caption?: string | null
  semanticDescription?: string | null
  webp?: string | null
  jpeg?: string | null
  avif?: string | null
  thumbnail?: string | null
  takenAt?: Date | null
  createdAt?: Date | null
  tags: string[]
}

export interface FeedOptions {
  origin: string
  title: string
  description: string
  photos: FeedPhoto[]
}

function imagePath(photo: FeedPhoto) {
  return photo.webp || photo.jpeg || photo.avif || photo.thumbnail
}

function imageMime(photo: FeedPhoto) {
  if (photo.webp)
    return 'image/webp'
  if (photo.avif)
    return 'image/avif'
  return 'image/jpeg'
}

function toRfc822(value: Date | null | undefined) {
  return (value ?? new Date()).toUTCString()
}

/**
 * RSS 2.0 for a photo blog: readers get the image through the enclosure and an
 * inline <img> in the description.
 */
export function buildRssFeed({ origin, title, description, photos }: FeedOptions) {
  const newest = photos[0]?.takenAt ?? photos[0]?.createdAt ?? new Date()

  const items = photos.map((photo) => {
    const link = `${origin}/p/${photo.id}`
    const name = photo.title || photo.fileName
    const path = imagePath(photo)
    const imageUrl = path ? `${origin}/photos/${path}` : null

    // Escaped once as a whole below, so the parts stay raw here
    const body = [
      photo.caption || photo.semanticDescription,
      imageUrl ? `<img src="${imageUrl}" alt="${name}">` : '',
    ].filter(Boolean).join('\n')

    return [
      '    <item>',
      `      <title>${escapeXml(name)}</title>`,
      `      <link>${escapeXml(link)}</link>`,
      `      <guid isPermaLink="true">${escapeXml(link)}</guid>`,
      `      <pubDate>${toRfc822(photo.takenAt ?? photo.createdAt)}</pubDate>`,
      `      <description>${escapeXml(body)}</description>`,
      imageUrl ? `      <enclosure url="${escapeXml(imageUrl)}" type="${imageMime(photo)}" length="0" />` : '',
      ...photo.tags.map(tag => `      <category>${escapeXml(tag)}</category>`),
      '    </item>',
    ].filter(Boolean).join('\n')
  })

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '  <channel>',
    `    <title>${escapeXml(title)}</title>`,
    `    <link>${escapeXml(`${origin}/`)}</link>`,
    `    <description>${escapeXml(description)}</description>`,
    '    <language>en</language>',
    `    <lastBuildDate>${toRfc822(newest)}</lastBuildDate>`,
    `    <atom:link href="${escapeXml(`${origin}/feed.xml`)}" rel="self" type="application/rss+xml" />`,
    ...items,
    '  </channel>',
    '</rss>',
    '',
  ].join('\n')
}
