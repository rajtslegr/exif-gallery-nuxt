<script setup lang="ts">
definePageMeta({
  layout: 'home',
})

const route = useRoute()
const localePath = useLocalePath()

const tag = route.params.tag?.[0]
if (!tag) {
  navigateTo(localePath('/'))
  throw new Error('id is required')
}

const LIMIT = 36
const params = {
  tag,
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
const { setupNavigation } = useNavigationSetup('tag', params, photos, hasMore, LIMIT)
setupNavigation()
</script>

<template>
  <section class="p-4 relative">
    <h3 class="text-xl font-medium mb-2">
      {{ tag }}
    </h3>
    <div v-if="photos && photos.length" class="mx-auto flex-[3] max-w-[1600px]">
      <PhotoJustifiedGrid :photos="photos" :loading="loading" :limit="LIMIT" />
    </div>
  </section>
</template>
