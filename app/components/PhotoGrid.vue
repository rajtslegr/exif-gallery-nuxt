<script setup lang="ts">
import { cn } from '~/lib/utils'

const isDrawerOpen = ref(false)
const route = useRoute()
const { orderBy, order } = usePhotoSort()

const LIMIT = 36
const params = computed(() => ({
  orderBy: orderBy.value,
  order: order.value,
  search: route.query.search as string | undefined,
}))
const { photos, hasMore, loadMore, loading } = usePhotosInfinite(params, LIMIT)

// Initial SSR load
const { data: initPhotos } = await useFetch('/api/photos', {
  params: {
    ...params.value,
    limit: LIMIT,
    offset: 0,
  },
})
if (initPhotos.value) {
  hasMore.value = initPhotos.value.hasMore
  photos.value = initPhotos.value.data.map(deserializePhoto)
}

useInfiniteScroll(window, loadMore, { distance: 240, canLoadMore: () => hasMore.value })

// Set up the navigation context
const { setupNavigation } = useNavigationSetup('grid', params.value, photos, hasMore, LIMIT)
setupNavigation()
</script>

<template>
  <section class="p-4 flex flex-col gap-4 relative">
    <Button
      class="ml-auto md:hidden"
      size="icon"
      variant="outline"
      @click="isDrawerOpen = !isDrawerOpen"
    >
      <div class="i-lucide-tags" />
    </Button>
    <div class="mx-auto flex gap-4 max-w-[1600px] w-full md:gap-8">
      <!-- Mirror of the tags rail so the photo grid itself stays centered -->
      <div class="flex-shrink-0 md:w-44 lt-md:hidden" />
      <div class="flex-auto h-min z-0">
        <PhotoSquareGrid :photos="photos" :loading="loading" :limit="LIMIT" />
      </div>
      <div class="flex-shrink-0 h-min right-4 top-29 fixed md:w-44 md:pointer-events-auto lt-md:pointer-events-none md:top-16 md:sticky lt-md:z-40">
        <ScrollAreaDynamic
          class="rounded-md bg-card flex max-h-[calc(100dvh-8.25rem)] transition-transform duration-300 ease-in-out lt-md:p-4 md:bg-background md:max-h-[calc(100dvh-5rem)]"
          :class="cn(
            'lt-md:translate-x-[calc(100%_+_4rem)] md:shadow-none',
            { 'lt-md:translate-x-0 lt-md:shadow-lg lt-md:border border-input lt-md:pointer-events-auto': isDrawerOpen },
          )"
        >
          <Tags />
        </ScrollAreaDynamic>
      </div>
    </div>
    <div v-if="!loading && !photos?.length" class="m-auto p-4 flex flex-col gap-4 h-[66vh] items-center justify-center">
      <template v-if="route.query.search">
        <h2>{{ $t('search.no_results') }}</h2>
        <p class="text-muted-foreground">
          {{ $t('search.try_other_keywords') }}
        </p>
      </template>
      <template v-else>
        <h2>{{ $t('no_photos') }}</h2>
        <NuxtLinkLocale to="/admin">
          <Button>{{ $t('go_to_admin') }}</Button>
        </NuxtLinkLocale>
      </template>
    </div>
  </section>
</template>
