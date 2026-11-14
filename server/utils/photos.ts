import type { Photo } from './drizzle'
import { db } from '@nuxthub/db'
import { eq, inArray } from 'drizzle-orm'

/**
 * A photo as it may leave the server for anonymous visitors.
 * Exact coordinates are stored for future map/geocoding work, but they identify
 * where a photo was taken (often someone's home), so they are never public.
 */
export type PublicPhoto = Omit<Photo, 'latitude' | 'longitude'> & Partial<Pick<Photo, 'latitude' | 'longitude'>>

export function toPublicPhoto(photo: Photo): PublicPhoto {
  const { latitude: _latitude, longitude: _longitude, ...rest } = photo
  return rest
}

/**
 * Loads tag names for the given photos in one query and groups them by photo id,
 * so list endpoints stay at a constant number of D1 round trips.
 */
export async function loadPhotoTags(photoIds: string[]) {
  const tagsByPhotoId = new Map<string, string[]>()

  if (!photoIds.length)
    return tagsByPhotoId

  const rows = await db
    .select({ photoId: schema.photoTag.photoId, name: schema.tag.name })
    .from(schema.photoTag)
    .innerJoin(schema.tag, eq(schema.photoTag.tagId, schema.tag.id))
    .where(inArray(schema.photoTag.photoId, photoIds))
    .orderBy(schema.tag.name)

  for (const row of rows) {
    const names = tagsByPhotoId.get(row.photoId)
    if (names)
      names.push(row.name)
    else
      tagsByPhotoId.set(row.photoId, [row.name])
  }

  return tagsByPhotoId
}
