<script setup lang="ts">
defineOptions({
  inheritAttrs: false,
})

const attrs = useAttrs()
</script>

<template>
  <Popover>
    <Tooltip disable-closing-trigger>
      <PopoverTrigger as-child>
        <TooltipTrigger as-child>
          <Button
            variant="ghost"
            size="icon"
            :aria-label="$t('header.theme')"
            v-bind="attrs"
          >
            <div class="i-lucide-paintbrush" />
          </Button>
        </TooltipTrigger>
      </PopoverTrigger>
      <TooltipContent>
        <p>{{ $t('header.theme') }}</p>
      </TooltipContent>
      <PopoverContent :side-offset="8" align="end" class="w-96">
        <ThemeCustomizer :all-colors="allColors" />
      </PopoverContent>
    </Tooltip>
  </Popover>
</template>
