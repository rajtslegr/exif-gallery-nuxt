const MAX_TAG_NAME_LENGTH = 64

/**
 * Tags are edited as a comma separated string: trim, cap, drop empties, dedupe.
 */
export function parseTagNames(tags: string) {
  const names = tags
    .split(',')
    .map(name => name.trim().slice(0, MAX_TAG_NAME_LENGTH))
    .filter(Boolean)

  return [...new Set(names)]
}
