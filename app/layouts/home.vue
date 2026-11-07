<script setup lang="ts">
const localePath = useLocalePath()
const { t } = useI18n()
const { isGridDefault } = useDefaultView()

// The default view lives at `/`, the other view has its own explicit route
const links = computed(() => [
  {
    icon: 'i-lucide-gallery-vertical',
    to: localePath(isGridDefault.value ? '/gallery' : '/'),
    tooltip: t('header.gallery_view'),
  },
  {
    icon: 'i-lucide-layout-grid',
    to: localePath(isGridDefault.value ? '/' : '/grid'),
    tooltip: t('header.grid_view'),
  },
])
</script>

<template>
  <Header
    :links="links"
    :show-admin="true"
  />
  <slot />
</template>
