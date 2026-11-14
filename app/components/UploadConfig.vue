<script setup lang="ts">
import type { AIProviderConfig } from '../composables/useAIConfig'
import { formatModelName } from '../utils/aiProviders'

defineProps<{
  disabled?: boolean
}>()

const { config: uploadConfig } = useUploadConfig()
const { config: aiConfig, addProvider, updateProvider, removeProvider, setSelectedProvider } = useAIConfig()

// AI provider management state
const showProviderDialog = ref(false)
const editingProvider = ref<AIProviderConfig | null>(null)

// Open the add-provider dialog
function openAddProviderDialog() {
  editingProvider.value = null
  showProviderDialog.value = true
}

// Open the edit-provider dialog
function openEditProviderDialog(provider: AIProviderConfig) {
  editingProvider.value = provider
  showProviderDialog.value = true
}

// Save the provider
function handleSaveProvider(providerData: Omit<AIProviderConfig, 'id' | 'createdAt'>) {
  if (editingProvider.value) {
    // Update an existing provider
    updateProvider(editingProvider.value.id, providerData)
  }
  else {
    // Add a new provider
    addProvider(providerData)
  }
  editingProvider.value = null
}

// Select a provider
function selectProvider(providerId: string) {
  setSelectedProvider(providerId)
  // Selecting a provider also enables it
  updateProvider(providerId, { enabled: true })
}
</script>

<template>
  <div
    class="gap-x-4 gap-y-2 grid grid-cols-1 md:grid-cols-2"
    :class="{ 'opacity-50 pointer-events-none': disabled }"
  >
    <div class="p-4 border border-input rounded-lg flex flex-col gap-2">
      <div class="flex gap-2 items-center">
        <Checkbox
          id="enable-compression"
          v-model="uploadConfig.enableCompression"
        />
        <Label for="enable-compression">{{ $t('compression_config.enable') }}</Label>
        <Tooltip>
          <TooltipTrigger as-child>
            <div class="i-lucide-info cursor-help" />
          </TooltipTrigger>
          <TooltipContent>
            <p>{{ $t('compression_config.info') }}</p>
          </TooltipContent>
        </Tooltip>
      </div>
      <div v-if="uploadConfig.enableCompression" class="pl-6 flex flex-col gap-2">
        <Label class="text-muted-foreground font-medium">{{ $t('compression_config.formats') }}</Label>
        <div class="flex flex-wrap gap-2">
          <div class="flex gap-2 items-center">
            <Checkbox
              id="formats-jpeg"
              v-model="uploadConfig.formats.jpeg"
            />
            <Label for="formats-jpeg">{{ $t('compression_config.jpeg') }}</Label>
          </div>
          <div class="flex gap-2 items-center">
            <Checkbox
              id="formats-webp"
              v-model="uploadConfig.formats.webp"
            />
            <Label for="formats-webp">{{ $t('compression_config.webp') }}</Label>
          </div>
          <div class="flex gap-2 items-center">
            <Checkbox
              id="formats-avif"
              v-model="uploadConfig.formats.avif"
            />
            <Label for="formats-avif">{{ $t('compression_config.avif') }}</Label>
            <Tooltip>
              <TooltipTrigger as-child>
                <div class="i-lucide-info cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p>{{ $t('compression_config.avif_info') }}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
      <div class="flex gap-2 items-center">
        <Checkbox
          id="enable-auto-resize"
          v-model="uploadConfig.enableAutoResize"
        />
        <Label for="enable-auto-resize">{{ $t('compression_config.auto_resize') }}</Label>
        <Tooltip>
          <TooltipTrigger as-child>
            <div class="i-lucide-info cursor-help" />
          </TooltipTrigger>
          <TooltipContent>
            <p>{{ $t('compression_config.auto_resize_info') }}</p>
          </TooltipContent>
        </Tooltip>
      </div>
      <div class="flex gap-2 items-center">
        <Checkbox
          id="formats-thumbnail"
          v-model="uploadConfig.formats.thumbnail"
        />
        <Label for="formats-thumbnail">{{ $t('compression_config.thumbnail') }}</Label>
      </div>
    </div>

    <div class="p-4 border border-input rounded-lg flex flex-col gap-2">
      <div class="flex gap-2 items-center">
        <Checkbox
          id="enable-ai"
          v-model="aiConfig.enabled"
        />
        <Label for="enable-ai">{{ $t('ai_config.enable') }}</Label>
      </div>
      <div v-if="aiConfig.enabled" class="ml-6 flex flex-col gap-4">
        <div>
          <div class="mb-2 flex items-center justify-between">
            <Label>{{ $t('ai_config.providers') }}</Label>
            <Button
              variant="ghost"
              size="sm"
              class="text-xs h-7"
              @click="openAddProviderDialog"
            >
              <div class="i-lucide-plus" />
              {{ $t('ai_config.add_provider') }}
            </Button>
          </div>
          <div class="flex flex-col gap-2">
            <div
              v-for="provider in Object.values(aiConfig.providers)"
              :key="provider.id"
              class="group p-2 border rounded-lg flex gap-2 cursor-pointer transition-colors items-center justify-between hover:bg-muted"
              :class="{ 'border-primary': aiConfig.selectedProviderId === provider.id }"
              @click="selectProvider(provider.id)"
            >
              <div class="flex flex-1 gap-2 min-w-0 items-center">
                <div class="text-4 text-primary shrink-0 w-4">
                  <div v-if="aiConfig.selectedProviderId === provider.id" class="i-lucide-check" />
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-sm font-medium truncate">
                    {{ provider.name }}
                  </div>
                  <div class="text-xs text-muted-foreground truncate">
                    {{ provider.type }}
                    <span v-if="provider.model" class="ml-1">· {{ formatModelName(provider.model) }}</span>
                  </div>
                </div>
                <Badge
                  v-if="provider.id === aiConfig.selectedProviderId"
                  variant="secondary"
                  class="text-xs"
                >
                  {{ $t('ai_config.selected') }}
                </Badge>
              </div>
              <div class="flex gap-1 items-center" @click.stop>
                <TooltipIconButton
                  icon="i-lucide-pencil"
                  :label="$t('ai_config.edit')"
                  size="icon"
                  variant="ghost"
                  @click="openEditProviderDialog(provider)"
                />
                <TooltipIconButton
                  v-if="provider.id !== 'openai' && provider.id !== 'gemini'"
                  icon="i-lucide-trash-2"
                  :label="$t('ai_config.delete')"
                  size="icon"
                  variant="destructive"
                  @click="removeProvider(provider.id)"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Provider edit dialog -->
  <ProviderEditDialog
    :provider="editingProvider ?? undefined"
    :open="showProviderDialog"
    @update:open="showProviderDialog = $event"
    @save="handleSaveProvider"
  />
</template>
