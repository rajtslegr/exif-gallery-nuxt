import type { SerializeObject } from 'nitropack'

export function usePhotosInfinite(params?: MaybeRef<{
  orderBy?: string
  order?: string
  tag?: string | string[]
  camera?: string
  lens?: string
  search?: string
}>, limit = 12): {
  photos: Ref<IPhoto[]>
  hasMore: Ref<boolean>
  loadMore: () => Promise<void>
  loading: Ref<boolean>
} {
  const pStore = usePhotosStore()
  const paramsValue = computed(() => toValue(params))
  const key = computed(() => JSON.stringify(paramsValue.value))

  // Current state; shallowRef avoids deep reactivity
  const state = shallowRef<InfiniteState>(pStore.getState(key.value))

  // loading lives outside the store to avoid SSR state leaking
  const loading = ref(false)
  const error = ref()

  const loadMore = async () => {
    if (loading.value || !state.value.hasMore.value)
      return

    error.value = undefined

    try {
      loading.value = true
      const response = await $fetch('/api/photos', {
        params: {
          ...paramsValue.value,
          limit,
          offset: state.value.photos.value.length,
        },
      })

      state.value.hasMore.value = response.hasMore
      state.value.photos.value.push(...response.data.map(deserializePhoto))
    }
    catch (error) {
      console.error(error)
      toast.error('An error occurred', { description: getErrorMessage(error, 'Failed to get photos') })
    }
    finally {
      loading.value = false
    }
  }

  // Switch state and reload when the key (sorting) changes
  watch(key, (newKey) => {
    state.value = pStore.getState(newKey)
    if (state.value.photos.value.length === 0)
      loadMore()
  })

  return {
    photos: computed({
      get: () => state.value.photos.value,
      set: (v) => { state.value.photos.value = v },
    }),
    hasMore: computed({
      get: () => state.value.hasMore.value,
      set: (v) => { state.value.hasMore.value = v },
    }),
    loadMore,
    loading,
  }
}

export async function usePhoto(id: MaybeRef<string>) {
  const photoId = computed(() => toValue(id))

  // awaited so the page knows the outcome during SSR (real 404 instead of a skeleton)
  const { data, pending, error, refresh } = await useFetch<SerializeObject<APIDataPhoto>>(
    () => `/api/photos/${photoId.value}`,
    { watch: [photoId] },
  )

  // Keep the toast feedback for client-side failures (e.g. photo deleted meanwhile)
  watch(error, (err) => {
    if (!err)
      return
    toast.error('An error occurred', { description: getErrorMessage(err, 'Failed to get photo') })
  }, { immediate: true })

  return {
    photo: computed(() => (data.value ? deserializePhoto(data.value) : null)),
    loading: pending,
    error,
    refresh,
  }
}

export function useDeletePhoto() {
  const { t } = useI18n()
  const deletingPhoto = ref<string>()
  async function deletePhoto(id: string) {
    deletingPhoto.value = id
    await $fetch(`/api/photos/${id}`, { method: 'DELETE' }).then(() => {
      toast.success(t('toast.delete_success'))
    }).catch((e) => {
      toast.error('An error occurred', { description: e.message || 'Please try again' })
    }).finally(() => {
      deletingPhoto.value = ''
    })
  }
  return { deletingPhoto, deletePhoto }
}
