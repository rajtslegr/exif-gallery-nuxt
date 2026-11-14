<script setup lang="ts">
import { usePhotoSort } from '~/composables/usePhotoSort'

const { orderBy, order, setSort } = usePhotoSort()
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <TooltipIconButton
        :label="$t('header.sort')"
        :icon="order === 'desc' ? 'i-lucide-arrow-down-wide-narrow' : 'i-lucide-arrow-up-wide-narrow'"
        variant="ghost"
        size="icon"
      />
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <!-- Sort direction group -->
      <DropdownMenuRadioGroup v-model="order" @update:model-value="v => setSort(orderBy, v as 'asc' | 'desc')">
        <DropdownMenuLabel class="text-xs text-muted-foreground">
          {{ $t('sort.direction') }}
        </DropdownMenuLabel>
        <DropdownMenuRadioItem value="desc">
          <div class="flex gap-1 w-full items-center justify-between">
            <span>{{ $t('sort.desc') }}</span>
            <div class="i-lucide-arrow-down op-50" />
          </div>
        </DropdownMenuRadioItem>
        <DropdownMenuRadioItem value="asc">
          <div class="flex gap-1 w-full items-center justify-between">
            <span>{{ $t('sort.asc') }}</span>
            <div class="i-lucide-arrow-up op-50" />
          </div>
        </DropdownMenuRadioItem>
      </DropdownMenuRadioGroup>

      <DropdownMenuSeparator />

      <!-- Sort field group -->
      <DropdownMenuRadioGroup v-model="orderBy" @update:model-value="v => setSort(v as 'takenAt' | 'createdAt' | 'priorityOrder')">
        <DropdownMenuLabel class="text-xs text-muted-foreground">
          {{ $t('sort.field') }}
        </DropdownMenuLabel>
        <DropdownMenuRadioItem value="takenAt" class="flex gap-2">
          <div class="flex gap-1 w-full items-center justify-between">
            <span>{{ $t('sort.taken_at') }}</span>
            <div class="i-lucide-aperture op-50" />
          </div>
        </DropdownMenuRadioItem>
        <DropdownMenuRadioItem value="createdAt" class="flex gap-2">
          <div class="flex gap-1 w-full items-center justify-between">
            <span>{{ $t('sort.created_at') }}</span>
            <div class="i-lucide-cloud-upload op-50" />
          </div>
        </DropdownMenuRadioItem>
        <DropdownMenuRadioItem value="priorityOrder" class="flex gap-2">
          <div class="flex gap-1 w-full items-center justify-between">
            <span>{{ $t('sort.priority') }}</span>
            <div class="i-lucide-star op-50" />
          </div>
        </DropdownMenuRadioItem>
      </DropdownMenuRadioGroup>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
