<script setup lang="ts">
const {
  showAdmin = false,
  showLogout = false,
} = defineProps<{
  links: { icon: string, to: string, tooltip: string }[]
  showAdmin?: boolean
  showLogout?: boolean
}>()

const config = useRuntimeConfig()
const { path } = toRefs(useRoute())
const localePath = useLocalePath()

const disconnect = ref(false)
const { loggedIn, clear } = useUserSession()

async function clearSession() {
  disconnect.value = true
  await clear().finally(() => disconnect.value = false)
  navigateTo(localePath('/admin/login'))
}

const route = useRoute()

const idle = useState('p-idle', () => true)
const showSortButton = ref(false)
const showSearchButton = ref(false)
const fullscreen = ref(false)
watch(() => route.name, (routeName) => {
  const name = String(routeName).split('_')[0]
  showSortButton.value = !!name && ['index', 'grid', 'admin'].includes(name)
  showSearchButton.value = !!name && ['index', 'grid'].includes(name)
  fullscreen.value = !!name && ['p-id'].includes(name)
}, { immediate: true })
</script>

<template>
  <header
    class="px-4 border-b bg-background/60 flex h-12 w-full transition-transform duration-300 items-center top-0 justify-between sticky z-50 backdrop-blur"
    :class="fullscreen ? (idle ? '-translate-y-full op-0 pointer-events-none' : 'translate-y-0 op-100') : ''"
  >
    <nav class="flex flex-auto gap-2 min-w-0 items-center justify-items-start">
      <NuxtLinkLocale to="/" class="font-medium flex-[0_1_auto] min-w-0 truncate">
        {{ config.public.title || $t('title') }}
      </NuxtLinkLocale>
      <HeaderBackButton v-if="fullscreen" />
      <HeaderSearchButton v-if="showSearchButton" />
    </nav>
    <nav class="flex flex-auto min-w-0 items-center justify-items-start">
      <TooltipIconButton
        v-for="link in links"
        :key="link.to"
        :label="link.tooltip"
      >
        <NuxtLink
          :to="link.to"
          :aria-label="link.tooltip"
          :aria-current="path === link.to ? 'page' : undefined"
          class="text-sm font-medium px-4 text-center rounded-md flex h-7 transition-colors items-center justify-center data-[active=true]:text-primary hover:text-primary data-[active=true]:bg-muted"
          :data-active="path === link.to"
        >
          <div :class="link.icon" />
        </NuxtLink>
      </TooltipIconButton>
    </nav>
    <nav class="flex items-center">
      <NuxtLinkLocale v-if="showAdmin" to="/admin">
        <TooltipIconButton :label="$t('header.admin')" icon="i-lucide-server-cog op-50" variant="ghost" size="icon" />
      </NuxtLinkLocale>
      <TooltipIconButton
        v-if="showLogout && loggedIn"
        :loading="disconnect"
        :label="$t('header.logout')"
        icon="i-lucide-power text-destructive"
        variant="ghost"
        size="icon"
        @click="clearSession()"
      />
      <HeaderSortMenu v-if="showSortButton" />
      <ThemePopover class="flex-shrink-0" />
    </nav>
  </header>
</template>
