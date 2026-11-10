<script setup lang="ts">
const { photos, loading, limit = 36 } = defineProps<{
  photos: IPhoto[]
  loading?: boolean
  limit?: number
}>()

// Accessible name for the tile link; the image itself is decorative so the browser
// never paints alt text inside the tile while the file is still downloading.
function photoLabel(photo: IPhoto) {
  return photo.semanticDescription || photo.caption || photo.title || photo.fileName || 'Photo'
}

// Grid tiles are ~400px, so the thumbnail is always the cheapest sharp-enough source
function photoSrc(photo: IPhoto) {
  const path = photo.thumbnail || photo.webp || photo.jpeg || photo.avif
  if (!path)
    throw new Error('Photo has no Image File')
  return path
}
</script>

<template>
  <div class="gap-px grid grid-cols-2 md:gap-1 2xl:grid-cols-4 md:grid-cols-3">
    <div
      v-for="(photo, index) in photos"
      :key="photo.id"
      class="aspect-square relative overflow-hidden"
    >
      <PhotoItemCard>
        <NuxtLinkLocale
          :to="`/p/${photo.id}`"
          :aria-label="photoLabel(photo)"
          class="outline-none h-full w-full block ring-primary focus-visible:ring-2"
        >
          <img
            :src="`/photos/${photoSrc(photo)}`"
            class="h-full w-full block object-contain"
            alt=""
            :loading="index < 6 ? 'eager' : 'lazy'"
            :fetchpriority="index === 0 ? 'high' : undefined"
          >
        </NuxtLinkLocale>
      </PhotoItemCard>
    </div>
    <template v-if="loading">
      <Skeleton
        v-for="i in limit"
        :key="i"
        class="w-full aspect-square"
      />
    </template>
  </div>
</template>
