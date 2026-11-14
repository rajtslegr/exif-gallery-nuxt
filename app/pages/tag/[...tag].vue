<script setup lang="ts">
definePageMeta({
  layout: 'home',
})

const route = useRoute()
const localePath = useLocalePath()

const tag = route.params.tag?.[0]
if (!tag) {
  navigateTo(localePath('/'))
  throw new Error('tag is required')
}

const LIMIT = 36
const { photos, loading } = await usePhotoListPage('tag', { tag }, LIMIT)

if (!photos.value.length)
  throw createError({ statusCode: 404, statusMessage: 'Tag not found', fatal: true })

useFilterSeoMeta('tag', tag)
</script>

<template>
  <section class="p-4 relative">
    <h3 class="text-xl font-medium mb-2">
      {{ tag }}
    </h3>
    <div v-if="photos && photos.length" class="mx-auto flex-[3] max-w-[1600px]">
      <PhotoSquareGrid :photos="photos" :loading="loading" :limit="LIMIT" />
    </div>
  </section>
</template>
