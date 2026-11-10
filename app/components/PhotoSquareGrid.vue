<script setup lang="ts">
const { photos, loading, limit = 36 } = defineProps<{
  photos: IPhoto[]
  loading?: boolean
  limit?: number
}>()

// Grid tiles are ~400px, so the thumbnail is always the cheapest sharp-enough source
function photoSrcset(photo: IPhoto) {
  if (!photo.thumbnail || !photo.medium)
    return undefined
  return `/photos/${photo.thumbnail} 1x, /photos/${photo.medium} 2x`
}

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
          class="outline-none h-full w-full block ring-primary focus-visible:ring-2"
        >
          <img
            :src="`/photos/${photoSrc(photo)}`"
            :srcset="photoSrcset(photo)"
            class="h-full w-full block object-contain"
            :alt="photo.semanticDescription || photo.caption || photo.title || photo.fileName"
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
