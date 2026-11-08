<script setup lang="ts">
definePageMeta({
  layout: 'home',
})

const route = useRoute()
const localePath = useLocalePath()

const lensParam = route.params.lens?.[0]
if (!lensParam) {
  navigateTo(localePath('/'))
  throw new Error('lens is required')
}

const lensName = computed(() => {
  return decodeURIComponent(lensParam)
})

const LIMIT = 36
const params = {
  lens: lensName.value,
}
const { photos, hasMore, loadMore, loading } = usePhotosInfinite(params, LIMIT)
const { data: initPhotos } = await useFetch('/api/photos', {
  params: {
    ...params,
    limit: LIMIT,
    offset: photos.value.length,
  },
})
if (initPhotos.value) {
  hasMore.value = initPhotos.value.hasMore
  photos.value.push(...initPhotos.value.data.map(deserializePhoto))
}

useInfiniteScroll(window, loadMore, { distance: 240, canLoadMore: () => hasMore.value })

// Set up the navigation context
const { setupNavigation } = useNavigationSetup('lens', params, photos, hasMore, LIMIT)
setupNavigation()
</script>

<template>
  <section class="p-4 relative">
    <div class="mb-2 flex gap-2 items-center">
      <div class="i-lucide-aperture text-xl" />
      <h3 class="text-xl font-medium">
        {{ lensName }}
      </h3>
    </div>
    <div v-if="photos && photos.length" class="mx-auto flex-[3] max-w-[1600px]">
      <PhotoSquareGrid :photos="photos" :loading="loading" :limit="LIMIT" />
    </div>
  </section>
</template>
