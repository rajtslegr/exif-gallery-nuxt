<script setup lang="ts">
definePageMeta({
  layout: 'home',
})

const route = useRoute()
const localePath = useLocalePath()

const cameraParam = route.params.camera?.[0]
if (!cameraParam) {
  navigateTo(localePath('/'))
  throw new Error('camera is required')
}

const cameraName = computed(() => cameraParam.replace(/\|/g, ' '))

const LIMIT = 36
const { photos, loading } = await usePhotoListPage('camera', { camera: cameraParam }, LIMIT)

if (!photos.value.length)
  throw createError({ statusCode: 404, statusMessage: 'Camera not found', fatal: true })

useFilterSeoMeta('camera', cameraParam)
</script>

<template>
  <section class="p-4 relative">
    <div class="mb-2 flex gap-2 items-center">
      <div class="i-lucide-camera text-xl" />
      <h3 class="text-xl font-medium">
        {{ cameraName }}
      </h3>
    </div>
    <div v-if="photos && photos.length" class="mx-auto flex-[3] max-w-[1600px]">
      <PhotoSquareGrid :photos="photos" :loading="loading" :limit="LIMIT" />
    </div>
  </section>
</template>
