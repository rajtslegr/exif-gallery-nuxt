<script setup lang="ts">
definePageMeta({
  layout: 'home',
})

const { isGridDefault } = useDefaultView()
</script>

<template>
  <PhotoGrid v-if="isGridDefault" />
  <PhotoGalleryFeed v-else />
</template>
