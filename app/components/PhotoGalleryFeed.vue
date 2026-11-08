<script setup lang="ts">
const route = useRoute()
const { loggedIn } = useUserSession()
const { orderBy, order } = usePhotoSort()

const LIMIT = 6
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

useInfiniteScroll(window, loadMore, { distance: 320, canLoadMore: () => hasMore.value })

// Set up the navigation context
const { setupNavigation } = useNavigationSetup('home', params.value, photos, hasMore, LIMIT)
setupNavigation()
</script>

<template>
  <section class="p-4 relative">
    <div class="flex flex-col gap-4 xl:px-20">
      <PhotoItem
        v-for="(photo, index) in photos"
        :key="photo.id"
        :photo="photo"
        :logged-in="loggedIn"
        :priority="index === 0"
        editable
        @deleted="photos = photos.filter(p => p.id !== $event)"
      >
        <template #action-button>
          <NuxtLinkLocale
            :to="`/p/${photo.id}`"
          >
            <TooltipIconButton
              :label="$t('button.view_photo')"
              icon="i-lucide-image-upscale text-muted-foreground"
              variant="ghost"
              size="icon"
            />
          </NuxtLinkLocale>
        </template>
      </PhotoItem>
      <template v-if="loading">
        <Skeleton
          v-for="i in LIMIT"
          :key="i"
          class="w-full aspect-[4/3]"
        />
      </template>
      <div v-if="!loading && !photos?.length" class="m-auto flex flex-col gap-4 h-[66vh] items-center justify-center">
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
    </div>
  </section>
</template>
