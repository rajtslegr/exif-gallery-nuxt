import { db } from '@nuxthub/db'
import { desc } from 'drizzle-orm'
import { setGalleryPhotosCacheHeaders } from '../utils/cache'
import { buildRssFeed } from '../utils/feed'
import { loadPhotoTags } from '../utils/photos'
import { getSiteUrl } from '../utils/site'

const FEED_SIZE = 30

export default eventHandler(async (event) => {
  // Same cache tag as the gallery, so uploads and deletions purge the feed too
  setGalleryPhotosCacheHeaders(event)
  setHeader(event, 'content-type', 'application/rss+xml; charset=utf-8')

  const config = useRuntimeConfig(event)

  const photos = await db
    .select({
      id: schema.photo.id,
      fileName: schema.photo.fileName,
      title: schema.photo.title,
      caption: schema.photo.caption,
      semanticDescription: schema.photo.semanticDescription,
      webp: schema.photo.webp,
      jpeg: schema.photo.jpeg,
      avif: schema.photo.avif,
      thumbnail: schema.photo.thumbnail,
      takenAt: schema.photo.takenAt,
      createdAt: schema.photo.createdAt,
    })
    .from(schema.photo)
    .orderBy(desc(schema.photo.createdAt), desc(schema.photo.id))
    .limit(FEED_SIZE)

  const tagsByPhotoId = await loadPhotoTags(photos.map(photo => photo.id))

  return buildRssFeed({
    origin: getSiteUrl(event),
    title: config.public.title || 'Exif Gallery',
    description: config.public.description || '',
    photos: photos.map(photo => ({
      ...photo,
      tags: tagsByPhotoId.get(photo.id) ?? [],
    })),
  })
})
