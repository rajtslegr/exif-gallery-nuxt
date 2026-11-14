<script setup lang="ts">
import Viewer from 'viewerjs'
import 'viewerjs/dist/viewer.css'

const props = defineProps<{
  id: number
  file: File
  compressFile?: compressFiles
  aiLoading?: boolean
  uploadLoading?: boolean
}>()

const emit = defineEmits<{
  upload: []
  generate: []
  close: []
}>()

const { config: uploadConfig } = useUploadConfig()
const { config: aiConfig } = useAIConfig()
const { loggedIn } = useUserSession()

const photo = defineModel<IPhotoForm>({ required: true })
const activeId = defineModel<number>('activeId')
const isOpen = computed({
  get: () => activeId.value === props.id,
  set: value => value ? activeId.value = props.id : activeId.value = undefined,
})

const compressLoading = computed(() =>
  props.compressFile?.jpeg === 'loading'
  || props.compressFile?.webp === 'loading'
  || props.compressFile?.avif === 'loading'
  || props.compressFile?.thumbnail === 'loading',
)

let viewer: Viewer | undefined
const viewerRef = ref<HTMLElement>()

onMounted(() => {
  if (!viewerRef.value)
    return
  viewer = new Viewer(viewerRef.value, {
    transition: false,
    toolbar: {
      prev: 1,
      zoomIn: 1,
      oneToOne: 1,
      reset: 1,
      zoomOut: 1,
      next: 1,
    },
  })
})

watch(() => [props.file, props.compressFile], async () => {
  await nextTick()
  if (viewer)
    viewer.update()
})

onUnmounted(() => {
  if (viewer)
    viewer.destroy()
})
</script>

<template>
  <Collapsible
    v-model:open="isOpen"
    class="p-4 border border-input rounded-lg flex flex-col gap-4"
  >
    <div class="flex gap-2 items-start justify-between">
      <div class="flex flex-col gap-2 min-w-0">
        <div class="flex flex-wrap gap-2 items-center">
          <span class="truncate">{{ file.name }}</span>
          <Tag
            v-for="tag in (photo.tags ? photo.tags.split(',') : [])"
            :key="tag"
            :label="tag"
          />
        </div>
        <div class="flex flex-wrap gap-4 items-center">
          <span class="text-lg font-medium">{{ photo.title || $t('upload_photo.untitled') }}</span>
          <span class="text-sm text-muted-foreground">{{ photo.caption }}</span>
        </div>
      </div>
      <div class="flex shrink-0 gap-1">
        <TooltipIconButton
          :icon="isOpen ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
          :label="isOpen ? $t('upload_photo.hide_details') : $t('upload_photo.show_details')"
          variant="ghost"
          size="icon"
          @click="isOpen = !isOpen"
        />
        <TooltipIconButton
          icon="i-lucide-x"
          :label="$t('button.cancel')"
          variant="ghost"
          size="icon"
          @click="emit('close')"
        />
      </div>
    </div>
    <div class="flex gap-2 justify-between lt-md:flex-col">
      <div class="flex flex-1 flex-wrap gap-6 items-start">
        <div ref="viewerRef" class="flex flex-wrap gap-4">
          <UploadPhotoImage type="original" :file="file" />
          <template v-if="uploadConfig.enableCompression">
            <UploadPhotoImage v-if="uploadConfig.formats.jpeg" type="JPEG" :file="compressFile?.jpeg" />
            <UploadPhotoImage v-if="uploadConfig.formats.webp" type="WebP" :file="compressFile?.webp" />
            <UploadPhotoImage v-if="uploadConfig.formats.avif" type="AVIF" :file="compressFile?.avif" />
          </template>
          <UploadPhotoImage v-if="uploadConfig.formats.thumbnail" type="thumbnail" :file="compressFile?.thumbnail" />
        </div>

        <div class="text-sm text-muted-foreground font-mono flex flex-1 flex-col gap-2 min-w-[200px]">
          <span>{{ formatCameraText(photo) }}</span>
          <span>{{ formatExposure(photo).join(' · ') }}</span>
          <span>{{ photo.focalLength ? toFixed(photo.focalLength, 1) : '--' }}mm <span
            v-if="photo.focalLengthIn35mmFormat"
            :title="$t('camera_lens.focal_length_35mm')"
            class="op-50"
          >{{ photo.focalLengthIn35mmFormat }}mm</span> · {{ photo.exposureCompensation ? `${photo.exposureCompensation > 0 ? '+' : ''}${photo.exposureCompensation.toFixed(1)}ev` : '0ev' }}</span>
          <span>{{ formatDate(photo.takenAt) }}</span>
        </div>
      </div>
      <div class="flex gap-2 items-end justify-center md:flex-col">
        <ProButton
          variant="outline"
          class="w-fit"
          :disabled="aiLoading || compressLoading || !loggedIn"
          :loading="uploadLoading"
          @click="loggedIn && emit('upload')"
        >
          <span>{{ $t('upload_photo.upload_button') }}</span>
        </ProButton>
        <ProButton
          v-if="aiConfig.enabled"
          variant="outline"
          class="w-fit"
          :loading="aiLoading"
          @click="emit('generate')"
        >
          <span>{{ $t('upload_photo.ai_button') }}</span>
        </ProButton>
      </div>
    </div>
    <CollapsibleContent>
      <div class="pt-4 border-t">
        <UploadPhotoForm v-model="photo" />
      </div>
    </CollapsibleContent>
  </Collapsible>
</template>
