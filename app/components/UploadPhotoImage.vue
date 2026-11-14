<script setup lang="ts">
defineProps<{
  file?: File | 'loading'
  type: string
}>()

function getBlobUrl(file: File): string {
  return URL.createObjectURL(file)
}
</script>

<template>
  <div class="flex flex-col gap-1 items-center">
    <Skeleton v-if="file === 'loading'" class="rounded-lg h-24 w-24" />
    <img
      v-else-if="file"
      :src="getBlobUrl(file)"
      :alt="file.name"
      class="rounded-lg h-24 w-24 object-cover"
    >
    <div v-else class="rounded-lg bg-muted flex h-24 w-24 items-center justify-center">
      <span class="text-sm text-muted-foreground">{{ type }}</span>
    </div>
    <span class="text-xs text-muted-foreground">{{ type }}</span>
    <span v-if="file && file !== 'loading'" class="text-xs text-muted-foreground">{{ formatFileSize(file.size) }}</span>
  </div>
</template>
