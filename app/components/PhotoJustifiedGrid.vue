<script setup lang="ts">
const { photos, loading, limit = 36 } = defineProps<{
  photos: IPhoto[]
  loading?: boolean
  limit?: number
}>()

const currentPhoto = useState<string>('currentPhoto', () => ref(''))

function photoAspectRatio(photo?: IPhoto) {
  const ar = photo?.aspectRatio
  return ar && Number.isFinite(ar) && ar > 0 ? ar : 1.5
}

function photoSrc(photo: IPhoto) {
  // Wide photos get scaled past the thumbnail width, so use the sharper WebP instead
  const path = photoAspectRatio(photo) >= 2
    ? photo.webp || photo.jpeg || photo.thumbnail || photo.avif
    : photo.thumbnail || photo.webp || photo.jpeg || photo.avif
  if (!path)
    throw new Error('Photo has no Image File')
  return path
}

/**
 * Justified layout: the aspect ratio drives both flex-basis and flex-grow,
 * so all photos in a row end up the same height, fully visible and never cropped.
 * `--tile-h` is the base row height, set by the responsive classes on the container.
 */
function tileStyle(photo: IPhoto) {
  const ar = photoAspectRatio(photo)
  return {
    flexBasis: `calc(var(--tile-h) * ${ar})`,
    flexGrow: ar,
    // Cap the growth so a lone photo on the last row is not stretched too far
    maxWidth: `calc(var(--tile-h) * ${ar * 2})`,
  }
}
</script>

<template>
  <div class="flex flex-wrap gap-px [--tile-h:110px] items-start md:gap-1 2xl:[--tile-h:220px] lg:[--tile-h:170px] sm:[--tile-h:140px] xl:[--tile-h:200px]">
    <div
      v-for="photo in photos"
      :key="photo.id"
      class="min-w-0"
      :style="tileStyle(photo)"
    >
      <PhotoItemCard>
        <NuxtLinkLocale
          :to="`/p/${photo.id}`"
          class="block"
        >
          <img
            :src="`/photos/${photoSrc(photo)}`"
            :style="{ aspectRatio: photoAspectRatio(photo) }"
            class="h-auto w-full block object-cover" :class="[{ 'current-image': currentPhoto === photo.id }]"
            :alt="photo.semanticDescription || photo.caption || photo.title"
            @click="currentPhoto = photo.id"
          >
        </NuxtLinkLocale>
      </PhotoItemCard>
    </div>
    <template v-if="loading">
      <Skeleton
        v-for="i in limit"
        :key="i"
        class="min-w-0"
        style="aspect-ratio: 1.5; flex-basis: calc(var(--tile-h) * 1.5); flex-grow: 1.5"
      />
    </template>
  </div>
</template>

<style scoped>
.current-image {
  view-transition-name: vtn-image;
}
</style>
