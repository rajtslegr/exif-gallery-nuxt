<script setup lang="ts">
import { refDebounced } from '@vueuse/core'

const route = useRoute()
const router = useRouter()

const open = ref(false)

// Search input (debounced)
const searchInput = ref('')
const debouncedSearch = refDebounced(searchInput, 300)

// Sync URL changes back into the input
watch(() => route.query.search, (value) => {
  searchInput.value = (value as string) || ''
}, { immediate: true })

// Write the debounced search term into the URL
watch(debouncedSearch, (value) => {
  if (value) {
    router.push({
      query: { ...route.query, search: value },
    })
  }
  else {
    // Drop the search param when the query is cleared
    const { search, ...restQuery } = route.query
    router.push({ query: restQuery })
  }
})

function clearSearch() {
  searchInput.value = ''
}
</script>

<template>
  <Popover v-model:open="open">
    <PopoverTrigger as-child>
      <TooltipIconButton
        :label="$t('header.search')"
        icon="i-lucide-search"
        variant="ghost"
        size="icon"
      />
    </PopoverTrigger>
    <PopoverContent class="op-80 w-96" align="start">
      <div class="space-y-2">
        <!-- Search field -->
        <div class="flex gap-2 items-center">
          <Input
            v-model="searchInput"
            :placeholder="$t('search.placeholder')"
            class="flex-1"
          />
          <Button
            v-if="searchInput"
            variant="ghost"
            size="icon"
            @click="clearSearch"
          >
            <div class="i-lucide-x" />
          </Button>
        </div>

        <!-- Search hints -->
        <p class="text-xs text-muted-foreground">
          {{ $t('search.hint') }}
        </p>
      </div>
    </PopoverContent>
  </Popover>
</template>
