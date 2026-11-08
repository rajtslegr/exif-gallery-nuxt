import { db, schema } from '@nuxthub/db'
import { and, eq, inArray, sql } from 'drizzle-orm'

const MAX_TAG_NAME_LENGTH = 64

type BatchStatement = Parameters<typeof db.batch>[0][number]

function parseTagNames(tags: string) {
  const names = tags
    .split(',')
    .map(name => name.trim().slice(0, MAX_TAG_NAME_LENGTH))
    .filter(Boolean)

  return [...new Set(names)]
}

export function recountTagsStatement(tagIds: string[]) {
  // Recompute instead of incrementing/decrementing so the counter self-heals
  return db.update(schema.tag)
    .set({
      photoCount: sql`(select count(*) from ${schema.photoTag} where ${schema.photoTag.tagId} = ${schema.tag.id})`,
    })
    .where(inArray(schema.tag.id, tagIds))
}

export function dropEmptyTagsStatement(tagIds: string[]) {
  return db.delete(schema.tag)
    .where(and(inArray(schema.tag.id, tagIds), eq(schema.tag.photoCount, 0)))
}

async function resolveTagIds(tagNames: string[]) {
  if (!tagNames.length)
    return []

  const tagIdsByName = new Map<string, string>()
  const existingTags = await db.query.tag.findMany({
    where: inArray(schema.tag.name, tagNames),
  })
  existingTags.forEach(tag => tagIdsByName.set(tag.name, tag.id))

  const missingNames = tagNames.filter(name => !tagIdsByName.has(name))
  if (missingNames.length) {
    const createdTags = await db.insert(schema.tag)
      .values(missingNames.map(name => ({ name })))
      .onConflictDoNothing()
      .returning()
    createdTags.forEach(tag => tagIdsByName.set(tag.name, tag.id))

    // Names that lost an insert race are still in the table, fetch them
    const unresolvedNames = tagNames.filter(name => !tagIdsByName.has(name))
    if (unresolvedNames.length) {
      const racedTags = await db.query.tag.findMany({
        where: inArray(schema.tag.name, unresolvedNames),
      })
      racedTags.forEach(tag => tagIdsByName.set(tag.name, tag.id))
    }
  }

  return tagNames
    .map(name => tagIdsByName.get(name))
    .filter((tagId): tagId is string => tagId !== undefined)
}

export async function processPhotoTags(photoId: string, tags: string | null | undefined) {
  // undefined/null means "leave the tags alone", an empty string clears them
  if (tags === undefined || tags === null)
    return

  const tagNames = parseTagNames(tags)

  const currentPhotoTags = await db.query.photoTag.findMany({
    where: eq(schema.photoTag.photoId, photoId),
  })
  const currentTagIds = currentPhotoTags.map(photoTag => photoTag.tagId)

  const tagIds = await resolveTagIds(tagNames)
  const affectedTagIds = [...new Set([...currentTagIds, ...tagIds])]

  if (!affectedTagIds.length)
    return

  const statements: BatchStatement[] = [
    db.delete(schema.photoTag).where(eq(schema.photoTag.photoId, photoId)),
  ]

  if (tagIds.length) {
    statements.push(
      db.insert(schema.photoTag)
        .values(tagIds.map(tagId => ({ photoId, tagId })))
        .onConflictDoNothing(),
    )
  }

  // Tags left without any photo are dropped so they stop showing up as filters
  statements.push(recountTagsStatement(affectedTagIds), dropEmptyTagsStatement(affectedTagIds))

  // D1 runs a batch as one transactional round trip, so relations and counters move together
  await db.batch(statements as unknown as Parameters<typeof db.batch>[0])
}
