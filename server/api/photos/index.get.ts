import { db } from '@nuxthub/db'
import { and, asc, desc, eq, inArray, like, or, sql } from 'drizzle-orm'
import { useValidatedQuery, z } from 'h3-zod'
import { setGalleryPhotosCacheHeaders } from '../../utils/cache'
import { loadPhotoTags } from '../../utils/photos'

const photoQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  orderBy: z.enum(['takenAt', 'createdAt']).default('takenAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
  tag: z.union([z.string(), z.array(z.string())]).optional(),
  camera: z.string().max(200).optional(),
  lens: z.string().max(200).optional(),
  search: z.string().max(100).optional(),
})

type SerializedPhoto = typeof schema.photo.$inferSelect

interface PhotosResponse {
  data: (SerializedPhoto & { tags: string[] })[]
  hasMore: boolean
  limit: number
  offset: number
}

export default eventHandler(async (event): Promise<PhotosResponse> => {
  setGalleryPhotosCacheHeaders(event)

  const {
    limit: limitNum,
    offset: offsetNum,
    orderBy,
    order,
    tag,
    camera,
    lens,
    search,
  } = await useValidatedQuery(event, photoQuerySchema)

  const conditions = []

  // The hidden column is kept for legacy rows, but the public gallery does not use it yet.

  // Camera filter: "make|model" or just "make"
  if (camera) {
    const cameraStr = String(camera)
    const parts = cameraStr.split('|')
    if (parts.length === 2) {
      const [make, model] = parts
      if (make)
        conditions.push(eq(schema.photo.make, make))
      if (model)
        conditions.push(eq(schema.photo.model, model))
    }
    else {
      conditions.push(like(schema.photo.make, `%${cameraStr}%`))
    }
  }

  // Lens filter
  if (lens)
    conditions.push(eq(schema.photo.lensModel, String(lens)))

  // Text search: keywords are AND-ed together (space separated)
  if (search) {
    const keywords = String(search).split(/\s+/).filter(Boolean)

    for (const keyword of keywords) {
      const keywordStr = `%${keyword}%`
      conditions.push(
        or(
          like(schema.photo.title, keywordStr),
          like(schema.photo.caption, keywordStr),
          like(schema.photo.semanticDescription, keywordStr),
          like(schema.photo.locationName, keywordStr),
          like(schema.photo.make, keywordStr),
          like(schema.photo.model, keywordStr),
          like(schema.photo.lensModel, keywordStr),
          // Tags live in the tags/photo_tags tables; a subquery keeps the search
          // working now that they are no longer duplicated on the photo row.
          inArray(
            schema.photo.id,
            db.select({ photoId: schema.photoTag.photoId })
              .from(schema.photoTag)
              .innerJoin(schema.tag, eq(schema.photoTag.tagId, schema.tag.id))
              .where(like(schema.tag.name, keywordStr)),
          ),
        ),
      )
    }
  }

  const orderColumn = orderBy === 'createdAt'
    ? schema.photo.createdAt
    : schema.photo.takenAt
  const orderExpression = order === 'asc' ? asc(orderColumn) : desc(orderColumn)
  // Photos imported in bursts share a timestamp; the id tiebreaker keeps offset
  // pagination deterministic instead of duplicating or skipping rows.
  const orderExpressions = [orderExpression, desc(schema.photo.id)]
  const photoConditions = conditions.length > 0 ? and(...conditions) : undefined
  const queryLimit = limitNum + 1

  if (tag) {
    // A single tag param is one full tag; repeated tag params mean multi-tag filtering.
    const tagNames = (Array.isArray(tag) ? tag : [tag]).map(String).filter(Boolean)
    const matchedPhotoIds = db.$with('matched_photo_ids').as(
      tagNames.length === 1
        ? db.select({ photoId: schema.photoTag.photoId })
            .from(schema.photoTag)
            .innerJoin(schema.tag, eq(schema.photoTag.tagId, schema.tag.id))
            .where(eq(schema.tag.name, tagNames[0]!))
        : db.select({ photoId: schema.photoTag.photoId })
            .from(schema.photoTag)
            .innerJoin(schema.tag, eq(schema.photoTag.tagId, schema.tag.id))
            .where(inArray(schema.tag.name, tagNames))
            .groupBy(schema.photoTag.photoId)
            .having(sql`count(distinct ${schema.tag.name}) = ${tagNames.length}`),
    )

    const rows = await db
      .with(matchedPhotoIds)
      .select({ photo: schema.photo })
      .from(matchedPhotoIds)
      .innerJoin(schema.photo, eq(matchedPhotoIds.photoId, schema.photo.id))
      .where(photoConditions)
      .orderBy(...orderExpressions)
      .limit(queryLimit)
      .offset(offsetNum)

    const hasMore = rows.length > limitNum
    const photos = rows.slice(0, limitNum).map(row => row.photo)
    const tagsByPhotoId = await loadPhotoTags(photos.map(photo => photo.id))

    return {
      data: photos.map(photo => ({ ...photo, tags: tagsByPhotoId.get(photo.id) ?? [] })),
      hasMore,
      limit: limitNum,
      offset: offsetNum,
    }
  }

  const photos = await db.query.photo.findMany({
    where: photoConditions,
    limit: queryLimit,
    offset: offsetNum,
    orderBy: orderExpressions,
  })
  const hasMore = photos.length > limitNum
  const pagePhotos = photos.slice(0, limitNum)
  const tagsByPhotoId = await loadPhotoTags(pagePhotos.map(photo => photo.id))

  return {
    data: pagePhotos.map(photo => ({ ...photo, tags: tagsByPhotoId.get(photo.id) ?? [] })),
    hasMore,
    limit: limitNum,
    offset: offsetNum,
  }
})
