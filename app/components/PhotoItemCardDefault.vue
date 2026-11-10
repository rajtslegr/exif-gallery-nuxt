<script setup lang="ts">
defineProps<{
  photo?: IPhoto
  mini?: boolean
  fullscreen?: boolean
  priority?: boolean
}>()
</script>

<template>
  <div
    :class="[
      fullscreen ? 'h-full w-full' : 'max-h-[calc(100dvh-5rem)]',
      mini ? 'h-full' : 'w-full',
    ]"
    :style="{ aspectRatio: !mini && photo?.aspectRatio || undefined }"
  >
    <picture v-if="photo">
      <source v-if="photo.avif" :srcset="`/photos/${photo.avif}`" type="image/avif">
      <source v-if="photo.webp" :srcset="`/photos/${photo.webp}`" type="image/webp">
      <img
        :src="`/photos/${photo.jpeg || photo.webp || photo.avif}`"
        class="m-auto h-full object-contain"
        :fetchpriority="priority ? 'high' : undefined"
        :alt="fullscreen ? (photo.semanticDescription || photo.caption || photo.title || '') : ''"
      >
    </picture>
  </div>
</template>

<style scoped>

</style>
