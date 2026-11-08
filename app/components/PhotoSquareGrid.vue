<script setup lang="ts">
const { photos, loading, limit = 36 } = defineProps<{
  photos: IPhoto[]
  loading?: boolean
  limit?: number
}>()

const currentPhoto = useState<string>('currentPhoto', () => ref(''))

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
      v-for="photo in photos"
      :key="photo.id"
      class="aspect-square relative overflow-hidden"
    >
      <PhotoItemCard>
        <NuxtLinkLocale
          :to="`/p/${photo.id}`"
          class="h-full w-full block"
        >
          <img
            :src="`/photos/${photoSrc(photo)}`"
            class="h-full w-full block object-contain" :class="[{ 'current-image': currentPhoto === photo.id }]"
            :alt="photo.semanticDescription || photo.caption || photo.title"
            loading="lazy"
            @click="currentPhoto = photo.id"
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

<style scoped>
.current-image {
  view-transition-name: vtn-image;
}
</style>
