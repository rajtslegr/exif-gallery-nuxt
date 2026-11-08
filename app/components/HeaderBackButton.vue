<script setup lang="ts">
const router = useRouter()
const localePath = useLocalePath()

function goBack() {
  if (router.options.history.state.back)
    router.back()
  else
    navigateTo(localePath('/'))
}
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
