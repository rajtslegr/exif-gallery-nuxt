import { db } from '@nuxthub/db'
import { eq } from 'drizzle-orm'
import { loadPhotoTags } from '../../utils/photos'

export default eventHandler(async (event) => {
  const { id } = event.context.params || {}

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'id is required',
    })
  }

  const photo = await db.query.photo.findFirst({
    where: eq(schema.photo.id, id),
  })

  if (!photo) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Photo not found',
    })
  }

  const tagsByPhotoId = await loadPhotoTags([photo.id])

  return { ...photo, tags: tagsByPhotoId.get(photo.id) ?? [] }
})
