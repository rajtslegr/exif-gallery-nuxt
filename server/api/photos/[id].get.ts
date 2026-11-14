import { db } from '@nuxthub/db'
import { eq } from 'drizzle-orm'
import { loadPhotoTags, toPublicPhoto } from '../../utils/photos'

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
  const tags = tagsByPhotoId.get(photo.id) ?? []

  // Coordinates are admin-only: the detail page is public and this response is
  // also serialized into the page payload.
  const { user } = await getUserSession(event)
  if (user)
    return { ...photo, tags }

  return { ...toPublicPhoto(photo), tags }
})
