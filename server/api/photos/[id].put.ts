import { db } from '@nuxthub/db'
import { eq } from 'drizzle-orm'
import { useValidatedBody, useValidatedParams, z } from 'h3-zod'
import { purgeGalleryCache } from '../../utils/cache'
import { loadPhotoTags } from '../../utils/photos'

/**
 * Editable text: omitted keeps the current value, `null` (or an empty string)
 * clears it. The edit dialog needs both, otherwise a caption can never be removed.
 */
const nullableText = z.string()
  .nullable()
  .optional()
  .transform(value => value === undefined ? undefined : (value?.trim() || null))

const nullableNumber = z.number().nullable().optional()

export default defineEventHandler(async (event) => {
  await requireUserSession(event)
  const { id } = await useValidatedParams(event, z.object({
    id: z.string().min(1, 'id is required'),
  }))

  const updatableFields = z.object({
    title: nullableText,
    caption: nullableText,
    semanticDescription: nullableText,
    tags: z.string().optional(),
    make: nullableText,
    model: nullableText,
    focalLength: nullableNumber,
    focalLengthIn35mmFormat: nullableNumber,
    lensMake: nullableText,
    lensModel: nullableText,
    fNumber: nullableNumber,
    iso: nullableNumber,
    exposureTime: nullableNumber,
    exposureCompensation: nullableNumber,
    locationName: nullableText,
    latitude: nullableNumber,
    longitude: nullableNumber,
    priorityOrder: nullableNumber,
    takenAt: z.string().nullable().optional(),
  })

  const body = await useValidatedBody(event, updatableFields)
  const { tags, takenAt, ...rest } = body

  try {
    const updatedPhoto = await db.update(schema.photo)
      .set({
        ...rest,
        // `undefined` leaves the column alone, `null` clears it
        takenAt: takenAt === null ? null : takenAt ? new Date(takenAt) : undefined,
        updatedAt: new Date(),
      })
      .where(eq(schema.photo.id, id))
      .returning()

    if (!updatedPhoto.length)
      throw createError({ statusCode: 404, message: 'photo not found' })

    await processPhotoTags(id, tags)
    await purgeGalleryCache(event)

    const tagsByPhotoId = await loadPhotoTags([id])
    return { ...updatedPhoto[0], tags: tagsByPhotoId.get(id) ?? [] }
  }
  catch (error) {
    // Let our own HTTP errors (e.g. the 404 above) reach the client untouched
    if (error && typeof error === 'object' && 'statusCode' in error)
      throw error

    throw createError({
      statusCode: 500,
      message: 'Failed to update photo',
      cause: error,
    })
  }
})
