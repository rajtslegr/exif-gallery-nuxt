<script setup lang="ts">
import type { PrimitiveProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import type { ButtonVariants } from '../ui/button'
import { reactiveOmit } from '@vueuse/core'

interface ButtonProps extends PrimitiveProps {
  variant?: ButtonVariants['variant']
  size?: ButtonVariants['size']
  class?: HTMLAttributes['class']
}

defineOptions({
  inheritAttrs: false,
})

const props = defineProps<Props>()

interface Props extends ButtonProps {
  icon?: string
  label: string
  loading?: boolean
}

const buttonProps = reactiveOmit(props, 'icon', 'label', 'loading')

const attrs = useAttrs()
</script>

<template>
  <Tooltip>
    <TooltipTrigger as-child>
      <slot>
        <Button
          v-bind="{ ...attrs, ...buttonProps }"
          :aria-label="label"
        >
          <Spinner v-if="loading" class="animate-spin" />
          <div :class="icon" />
        </Button>
      </slot>
    </TooltipTrigger>
    <TooltipContent>
      <p>{{ label }}</p>
    </TooltipContent>
  </Tooltip>
</template>

<style scoped>

</style>
