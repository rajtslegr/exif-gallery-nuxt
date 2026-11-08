import { db } from '@nuxthub/db'
import { desc, gt, sql } from 'drizzle-orm'
import { useValidatedQuery, z } from 'h3-zod'
import { setGalleryTagsCacheHeaders } from '../../utils/cache'

const tagsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(1000).default(500),
  offset: z.coerce.number().int().min(0).default(0),
})

export default eventHandler(async (event) => {
  setGalleryTagsCacheHeaders(event)

  const { limit, offset } = await useValidatedQuery(event, tagsQuerySchema)

  // Tags that lost their last photo are cleaned up on write, but filter them
  // out here as well so a stale counter can never surface as an empty filter.
  const tags = await db
    .select({
      id: schema.tag.id,
      name: schema.tag.name,
      createdAt: schema.tag.createdAt,
      photoCount: schema.tag.photoCount,
    })
    .from(schema.tag)
    .where(gt(schema.tag.photoCount, 0))
    .orderBy(desc(schema.tag.photoCount), schema.tag.name)
    .limit(limit)
    .offset(offset)

  const total = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.tag)
    .where(gt(schema.tag.photoCount, 0))
    .get()

  return {
    data: tags,
    total: total?.count || 0,
    limit,
    offset,
  }
})
