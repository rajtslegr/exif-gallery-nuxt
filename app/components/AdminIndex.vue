<script setup lang="ts">
const { loggedIn } = useUserSession()
const { orderBy, order } = usePhotoSort()

const LIMIT = 36
const params = computed(() => ({
  orderBy: orderBy.value,
  order: order.value,
}))

const { photos, hasMore, loadMore, loading } = usePhotosInfinite(params, LIMIT)

useInfiniteScroll(window, loadMore, { distance: 320, canLoadMore: () => hasMore.value })

function photoLabel(photo: IPhoto) {
  return photo.semanticDescription || photo.caption || photo.title || photo.fileName || 'Photo'
}

// Tiles are small, so the thumbnail is always the cheapest sharp-enough source
function photoSrc(photo: IPhoto) {
  const path = photo.thumbnail || photo.webp || photo.jpeg || photo.avif
  if (!path)
    throw new Error('Photo has no Image File')
  return path
}

const { deletingPhoto, deletePhoto: _deletePhoto } = useDeletePhoto()
function deletePhoto(id: string) {
  _deletePhoto(id).then(() =>
    photos.value = photos.value.filter(photo => photo.id !== id),
  )
}

const selectedPhoto = ref<IPhoto>()
const editOpen = ref(false)

function openEditDialog(photo: IPhoto) {
  selectedPhoto.value = photo
  editOpen.value = true
}
</script>

<template>
  <div class="mx-auto p-4 flex flex-col gap-4 max-w-[1600px]">
    <div class="flex gap-2 items-center justify-between">
      <h1 class="text-xl font-medium">
        {{ $t('header.admin_dashboard') }}
      </h1>
      <NuxtLinkLocale to="/admin/upload">
        <Button variant="outline" size="sm">
          <div class="i-lucide-upload" />
          <span>{{ $t('go_to_upload') }}</span>
        </Button>
      </NuxtLinkLocale>
    </div>
    <div
      v-if="(photos && photos.length) || loading"
      class="gap-px grid grid-cols-3 md:gap-1 2xl:grid-cols-8 lg:grid-cols-5 sm:grid-cols-4 xl:grid-cols-6"
    >
      <div
        v-for="photo in photos"
        :key="photo.id"
        class="group aspect-square relative overflow-hidden"
      >
        <img
          :src="`/photos/${photoSrc(photo)}`"
          class="h-full w-full block object-contain"
          :alt="photoLabel(photo)"
          loading="lazy"
        >
        <div class="p-0.5 rounded-lg bg-background/60 op-100 flex gap-1 right-1 top-1 absolute backdrop-blur md:op-0 md:group-focus-within:op-100 md:group-hover:op-100">
          <TooltipIconButton
            icon="i-lucide-edit"
            :label="$t('button.edit')"
            variant="ghost"
            size="icon"
            @click="openEditDialog(photo)"
          />
          <TooltipIconButton
            icon="i-lucide-trash"
            :label="$t('button.delete')"
            variant="ghost"
            size="icon"
            :loading="deletingPhoto === photo.id"
            :disabled="!loggedIn"
            @click="loggedIn && deletePhoto(photo.id)"
          />
        </div>
      </div>
      <template v-if="loading">
        <Skeleton
          v-for="i in LIMIT"
          :key="i"
          class="w-full aspect-square"
        />
      </template>
    </div>
  </div>
  <EditPhotoDialog
    v-model:open="editOpen"
    :photo="selectedPhoto"
  />
</template>
