<script setup lang="ts">
definePageMeta({
  layout: 'home',
})

// Same photos as the homepage, only reachable through navigation
useSeoMeta({
  robots: 'noindex, follow',
})
</script>

<template>
  <PhotoGrid />
</template>
