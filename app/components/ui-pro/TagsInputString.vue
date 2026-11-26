<script setup lang="ts">
import type { TagsInputRootEmits, TagsInputRootProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { TagsInputRoot, useForwardPropsEmits } from 'reka-ui'
import { cn } from '@/lib/utils'

const props = defineProps<Omit<TagsInputRootProps, 'modelValue'> & { class?: HTMLAttributes['class'] }>()
const emits = defineEmits<TagsInputRootEmits>()

const model = defineModel<string | undefined>()
const value = computed({
  get: () => model.value
    ? model.value.split(',')
    : [],
  set: (value) => {
    model.value = value.join(',')
  },
})

const delegatedProps = reactiveOmit(props as TagsInputRootProps & { class?: HTMLAttributes['class'] }, 'class', 'modelValue')

const forwarded = useForwardPropsEmits(delegatedProps, emits)
</script>

<template>
  <TagsInputRoot
    v-slot="slotProps"
    v-bind="forwarded"
    v-model="value"
    :class="cn(
      'flex flex-wrap gap-2 items-center min-h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none selection:bg-primary selection:text-primary-foreground dark:bg-input/30 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
      'focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]',
      'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
      props.class,
    )"
  >
    <slot v-bind="slotProps" />
  </TagsInputRoot>
</template>
