<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '~/lib/utils'

const {
  class: className,
} = defineProps<{
  photo?: IPhoto
  class?: HTMLAttributes['class']
  mini?: boolean
  fullscreen?: boolean
  priority?: boolean
}>()

const emit = defineEmits<{ loaded: [] }>()
</script>

<template>
  <slot>
    <PhotoItemCardDefault
      :photo="photo"
      :mini="mini"
      :fullscreen="fullscreen"
      :priority="priority"
      :class="cn({ 'h-full': mini && !fullscreen }, className)"
      @loaded="emit('loaded')"
    />
  </slot>
</template>
