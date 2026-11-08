import { db } from '@nuxthub/db'
import { eq } from 'drizzle-orm'
import { useValidatedBody, useValidatedParams, z } from 'h3-zod'
import { purgeGalleryCache } from '../../utils/cache'

export default defineEventHandler(async (event) => {
  await requireUserSession(event)
  const { id } = await useValidatedParams(event, z.object({
    id: z.string().min(1, 'id is required'),
  }))

  const updatableFields = z.object({
    title: z.string().optional(),
    caption: z.string().optional(),
    semanticDescription: z.string().optional(),
    tags: z.string().optional(),
    make: z.string().optional(),
    model: z.string().optional(),
    focalLength: z.number().optional(),
    focalLengthIn35mmFormat: z.number().optional(),
    lensMake: z.string().optional(),
    lensModel: z.string().optional(),
    fNumber: z.number().optional(),
    iso: z.number().int().optional(),
    exposureTime: z.number().optional(),
    exposureCompensation: z.number().optional(),
    locationName: z.string().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    priorityOrder: z.number().optional(),
    takenAt: z.string().optional(),
  })

  const body = await useValidatedBody(event, updatableFields)

  try {
    const updatedPhoto = await db.update(schema.photo)
      .set({
        ...body,
        takenAt: body.takenAt ? new Date(body.takenAt) : undefined,
        updatedAt: new Date(),
      })
      .where(eq(schema.photo.id, id))
      .returning()

    if (!updatedPhoto.length)
      throw createError({ statusCode: 404, message: 'photo not found' })

    await processPhotoTags(id, body.tags)
    await purgeGalleryCache(event)

    return updatedPhoto[0]
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
