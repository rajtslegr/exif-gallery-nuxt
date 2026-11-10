import { blob } from '@nuxthub/blob'
import { db } from '@nuxthub/db'
import { eq } from 'drizzle-orm'
import { purgeGalleryCache } from '../../utils/cache'
import { dropEmptyTagsStatement, recountTagsStatement } from '../../utils/tag'

type BatchStatement = Parameters<typeof db.batch>[0][number]

export default eventHandler(async (event) => {
  await requireUserSession(event)
  const { id } = event.context.params || {}

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'id is required',
    })
  }

  const photo = await db.query.photo.findFirst({
    where: (photo, { eq }) => eq(photo.id, id),
  })

  if (!photo) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Photo not found',
    })
  }

  const photoTags = await db.query.photoTag.findMany({
    where: eq(schema.photoTag.photoId, id),
  })
  const tagIds = photoTags.map(photoTag => photoTag.tagId)

  const statements: BatchStatement[] = [
    db.delete(schema.photoTag).where(eq(schema.photoTag.photoId, id)),
    db.delete(schema.photo).where(eq(schema.photo.id, id)),
  ]

  if (tagIds.length) {
    statements.push(recountTagsStatement(tagIds), dropEmptyTagsStatement(tagIds))
  }

  try {
    await db.batch(statements as unknown as Parameters<typeof db.batch>[0])
  }
  catch (error) {
    console.error('Failed to delete photo from database:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to delete photo',
    })
  }

  // Blobs are removed only after the rows are gone: a failed DB delete must not
  // leave a record pointing at files that no longer exist.
  const formats = ['jpeg', 'webp', 'avif', 'medium', 'thumbnail'] as const
  await Promise.allSettled(formats.map(async (format) => {
    const pathname = photo[format]
    if (!pathname)
      return
    try {
      await blob.delete(pathname)
    }
    catch (error) {
      console.error(`Failed to delete ${format} file (${pathname}):`, error)
    }
  }))

  await purgeGalleryCache(event)
  return { success: true }
})
