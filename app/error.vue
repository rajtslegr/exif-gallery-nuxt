<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()

const { t } = useI18n()
const localePath = useLocalePath()
const config = useRuntimeConfig()

const statusCode = computed(() => props.error.statusCode ?? 500)
const message = computed(() =>
  statusCode.value === 404 ? t('error.not_found') : t('error.server'),
)

useSeoMeta({
  title: () => `${statusCode.value} · ${config.public.title || t('title')}`,
  robots: 'noindex',
})
</script>

<template>
  <div class="p-8 text-center flex flex-col gap-4 min-h-[100dvh] items-center justify-center">
    <p class="text-6xl tracking-tight font-semibold">
      {{ statusCode }}
    </p>
    <p class="text-muted-foreground max-w-sm">
      {{ message }}
    </p>
    <Button as-child>
      <NuxtLink :to="localePath('/')">
        {{ t('error.back_home') }}
      </NuxtLink>
    </Button>
  </div>
</template>
