import { db } from '@nuxthub/db'
import { eq, inArray } from 'drizzle-orm'

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
