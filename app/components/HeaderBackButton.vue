<script setup lang="ts">
const { goBack } = useBackNavigation()
</script>

<template>
  <TooltipIconButton
    :label="$t('header.back')"
    icon="i-lucide-arrow-left"
    variant="ghost"
    size="icon"
    @click="goBack()"
  />
</template>
