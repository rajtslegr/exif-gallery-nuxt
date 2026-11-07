import type { SerializeObject } from 'nitropack'

export type NavigationType = 'home' | 'tag' | 'camera' | 'lens' | 'grid' | 'admin' | 'direct'

export interface NavigationContext {
  type: NavigationType
  params?: {
    tag?: string
    camera?: string
    lens?: string
    orderBy?: string
    order?: string
  }
}

export interface NavigationState {
  context: NavigationContext | null
  photoIds: string[]
  hasMore: boolean
  loading: boolean
  offset: number
  limit: number
}

export const useNavigationStore = defineStore('navigation', () => {
  // Persisted in sessionStorage so a refresh keeps the context
  const context = useSessionStorage<NavigationContext | null>('nav-context', null)
  const photoIds = useSessionStorage<string[]>('nav-photo-ids', [])
  const hasMore = useSessionStorage<boolean>('nav-has-more', false)
  const offset = useSessionStorage<number>('nav-offset', 0)
  const limit = useSessionStorage<number>('nav-limit', 12)

  // Local state, not persisted
  const loading = ref(false)

  // Set the browsing context
  function setContext(
    navContext: NavigationContext,
    initialPhotos: IPhoto[],
    initialHasMore: boolean,
    initialLimit: number,
  ) {
    context.value = navContext
    photoIds.value = initialPhotos.map(p => p.id)
    hasMore.value = initialHasMore
    offset.value = initialPhotos.length
    limit.value = initialLimit
  }

  // Clear the context
  function clearContext() {
    context.value = null
    photoIds.value = []
    hasMore.value = false
    offset.value = 0
    limit.value = 12
  }

  // Check for a valid browsing context
  function hasValidContext(photoId: string): boolean {
    if (!context.value)
      return false
    return photoIds.value.includes(photoId)
  }

  // Get the index of the current photo in the queue
  function getCurrentIndex(photoId: string): number {
    return photoIds.value.indexOf(photoId)
  }

  // Whether there is a previous photo
  function hasPrev(photoId: string): boolean {
    const index = getCurrentIndex(photoId)
    return index > 0
  }

  // Whether there is a next photo
  function hasNext(photoId: string): boolean {
    const index = getCurrentIndex(photoId)
    if (index === -1)
      return false
    if (index < photoIds.value.length - 1)
      return true
    return hasMore.value
  }

  // Get the previous photo id
  function getPrevId(photoId: string): string | null {
    const index = getCurrentIndex(photoId)
    if (index <= 0)
      return null
    return photoIds.value[index - 1] ?? null
  }

  // Get the next photo id
  async function getNextId(photoId: string): Promise<string | null> {
    const index = getCurrentIndex(photoId)
    if (index === -1)
      return null

    // If the next photo is already queued
    if (index < photoIds.value.length - 1) {
      return photoIds.value[index + 1] ?? null
    }

    // Needs to load more
    if (hasMore.value) {
      await loadMorePhotos()
      return photoIds.value[index + 1] ?? null
    }

    return null
  }

  // Load more photos
  async function loadMorePhotos(): Promise<void> {
    if (loading.value || !hasMore.value || !context.value)
      return

    loading.value = true

    try {
      const response = await $fetch('/api/photos', {
        params: {
          ...context.value.params,
          limit: limit.value,
          offset: offset.value,
        },
      })

      const newPhotos = (response.data as unknown as SerializeObject<APIDataPhoto>[]).map(deserializePhoto)

      hasMore.value = response.hasMore
      photoIds.value.push(...newPhotos.map(p => p.id))
      offset.value += newPhotos.length
    }
    catch (err: any) {
      console.error('Failed to load more photos:', err)
      toast.error('Failed to load', { description: err?.data?.message || err?.message || 'Could not load more photos' })
    }
    finally {
      loading.value = false
    }
  }

  return {
    context,
    photoIds,
    hasMore,
    loading,
    setContext,
    clearContext,
    hasValidContext,
    getCurrentIndex,
    hasPrev,
    hasNext,
    getPrevId,
    getNextId,
    loadMorePhotos,
  }
})
