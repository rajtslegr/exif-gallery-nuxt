export interface InfiniteState {
  photos: Ref<IPhoto[]>
  hasMore: Ref<boolean>
}

// Every search term produces its own cache entry, so keep only the most recent ones
const MAX_CACHED_STATES = 4

export const usePhotosStore = defineStore('photos', () => {
  const photosStore = shallowRef<Map<string, InfiniteState>>(new Map())

  function getState(key: string) {
    const existingState = photosStore.value.get(key)
    if (existingState)
      return existingState

    while (photosStore.value.size >= MAX_CACHED_STATES) {
      const [oldestKey] = photosStore.value.keys()
      if (oldestKey === undefined)
        break
      photosStore.value.delete(oldestKey)
    }

    const state: InfiniteState = {
      photos: ref([]),
      hasMore: ref(true),
    }
    photosStore.value.set(key, state)

    return state
  }

  function updatePhoto(photo: IPhoto) {
    photosStore.value.forEach((state) => {
      const index = state.photos.value.findIndex(p => p.id === photo.id)
      if (index !== -1) {
        state.photos.value[index] = photo
      }
    })
  }

  return {
    photosStore,
    getState,
    updatePhoto,
  }
})
