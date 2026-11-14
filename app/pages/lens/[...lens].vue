<script setup lang="ts">
definePageMeta({
  layout: 'home',
})

const route = useRoute()
const localePath = useLocalePath()

const lensParam = route.params.lens?.[0]
if (!lensParam) {
  navigateTo(localePath('/'))
  throw new Error('lens is required')
}

// Route params are already decoded, so no decodeURIComponent here
const lensName = computed(() => lensParam)

const LIMIT = 36
const { photos, loading } = await usePhotoListPage('lens', { lens: lensParam }, LIMIT)

if (!photos.value.length)
  throw createError({ statusCode: 404, statusMessage: 'Lens not found', fatal: true })

useFilterSeoMeta('lens', lensParam)
</script>

<template>
  <section class="p-4 relative">
    <div class="mb-2 flex gap-2 items-center">
      <div class="i-lucide-aperture text-xl" />
      <h3 class="text-xl font-medium">
        {{ lensName }}
      </h3>
    </div>
    <div v-if="photos && photos.length" class="mx-auto flex-[3] max-w-[1600px]">
      <PhotoSquareGrid :photos="photos" :loading="loading" :limit="LIMIT" />
    </div>
  </section>
</template>
