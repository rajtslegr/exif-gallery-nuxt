<script setup lang="ts">
import type { CompressMultiResultOption } from '~/utils/compress'
import pLimit from 'p-limit'

interface FileEntry {
  id: number
  file: File
  aiLoading?: boolean
  uploadLoading?: boolean
  compressedFile?: compressFiles
  photo: IPhotoForm
}

const { loggedIn } = useUserSession()

let fileId = 0

const files = ref<FileEntry[]>([])
const processLoading = ref(true)
const uploadLoading = ref(false)

const { config: uploadConfig } = useUploadConfig()
const { config: aiConfig } = useAIConfig()

function setFile(fileEntry: FileEntry) {
  const index = files.value.findIndex(f => f.id === fileEntry.id)
  if (index !== -1) {
    files.value[index] = { ...fileEntry }
  }
}

const pStore = usePhotosStore()
const photosStore = pStore.photosStore

const uploadLimit = pLimit(4)
async function upload(fileEntry: FileEntry) {
  fileEntry.uploadLoading = true
  setFile(fileEntry)
  const formData = new FormData()
  if (
    fileEntry.compressedFile?.jpeg instanceof File
    || fileEntry.compressedFile?.webp instanceof File
    || fileEntry.compressedFile?.avif instanceof File
  ) {
    Object.entries(fileEntry.compressedFile || {}).forEach(([type, compressedFile]) => {
      if (compressedFile) {
        formData.append(type, compressedFile)
      }
    })
  }
  else {
    // thumbnail only
    if (fileEntry.compressedFile?.thumbnail instanceof File) {
      formData.append('thumbnail', fileEntry.compressedFile.thumbnail)
    }
    // original file
    if (fileEntry.file.type === 'image/webp')
      formData.append('webp', fileEntry.file)
    else if (fileEntry.file.type === 'image/avif')
      formData.append('avif', fileEntry.file)
    else
      formData.append('jpeg', fileEntry.file)
  }
  formData.append('fileModified', fileEntry.file.lastModified.toString())
  Object.entries(fileEntry.photo).forEach(([key, value]) => {
    if (value instanceof Date) {
      formData.append(key, value.toISOString())
    }
    else if (typeof value === 'number' || typeof value === 'boolean') {
      formData.append(key, value.toString())
    }
    else if (value != null) {
      formData.append(key, value)
    }
  })

  try {
    const response = await uploadLimit(() => $fetch<{
      success: boolean
    }>('/api/photos/upload', {
      method: 'POST',
      body: formData,
    }))

    if (response.success) {
      toast.success(`Uploaded ${fileEntry.photo.title || ''}`, { description: fileEntry.file.name })
      const index = files.value.findIndex(f => f.id === fileEntry.id)
      if (index !== -1) {
        files.value.splice(index, 1)
      }
      photosStore.clear()
    }
    else {
      toast.error('Upload failed', { description: 'Please try again' })
      fileEntry.uploadLoading = false
      setFile(fileEntry)
    }
  }
  catch (error) {
    console.error(error)
    toast.error('Upload failed', {
      description: getErrorMessage(error, 'Upload failed'),
    })
    fileEntry.uploadLoading = false
    setFile(fileEntry)
  }
}

async function uploadAll() {
  const uploadTask = files.value.map(upload)
  uploadLoading.value = true
  await Promise.allSettled(uploadTask).finally(() => {
    uploadLoading.value = false
  })
}

async function processFileExif(fileEntry: FileEntry) {
  const photo = await getExifData(fileEntry.file).catch((e) => {
    console.warn('parse exif data failed: ', e)
    return {} as ReturnType<typeof getExifData>
  })
  if (!photo.takenAt) {
    photo.takenAt = new Date(fileEntry.file.lastModified)
  }
  fileEntry.photo = { ...fileEntry.photo, ...photo }
  setFile(fileEntry)
}

async function processFileCompress(fileEntry: FileEntry) {
  const fileType = fileEntry.file.type
  const baseFormats = toRaw(uploadConfig.value).formats

  const formatsConfig: CompressMultiResultOption = {}
  const formatKeys = ['jpeg', 'webp', 'avif', 'thumbnail'] as const
  const autoResize = uploadConfig.value.enableAutoResize

  for (const key of formatKeys) {
    const enabled = baseFormats[key]
    if (!enabled)
      continue
    if (fileType === 'image/webp' && (key === 'jpeg' || key === 'webp'))
      continue
    if (fileType === 'image/avif' && (key === 'jpeg' || key === 'webp' || key === 'avif'))
      continue

    switch (key) {
      case 'jpeg':
        formatsConfig.jpeg = { target: 'jpeg', autoResize }
        break
      case 'webp':
        formatsConfig.webp = { target: 'webp', autoResize }
        break
      case 'avif':
        formatsConfig.avif = { target: 'avif', autoResize }
        break
      case 'thumbnail':
        formatsConfig.thumbnail = { target: 'thumbnail' }
        break
    }
  }

  fileEntry.compressedFile = Object.fromEntries(Object.entries(formatsConfig).map(
    ([type, value]) => [type, value ? 'loading' : undefined],
  ))
  if (formatsConfig.thumbnail && aiConfig.value.enabled) {
    fileEntry.aiLoading = true
  }
  setFile(fileEntry)
  await compressImageMultiResult(
    fileEntry.file,
    formatsConfig,
    async (type, file) => {
      fileEntry.compressedFile = {
        ...fileEntry.compressedFile,
        [type]: file,
      }
      setFile(fileEntry)
      if (type === 'thumbnail' && aiConfig.value.enabled) {
        await processFileAiDescription(fileEntry, file)
      }
    },
  )
}

const aiLimit = pLimit(1)
async function processFileAiDescription(fileEntry: FileEntry, thumbnailFile?: File) {
  fileEntry.aiLoading = true
  setFile(fileEntry)
  try {
    const thumbnail = thumbnailFile || fileEntry.compressedFile?.thumbnail
    const fileToAnalyze = thumbnail instanceof File ? thumbnail : fileEntry.file
    const aiData = await aiLimit(() => getAiImageAnalysis(fileToAnalyze, thumbnail instanceof File))
    fileEntry.photo = { ...fileEntry.photo, ...aiData, tags: aiData.tags.join(',') }
  }
  catch (error: unknown) {
    console.error('Failed to get AI description', error)
    toast.error($t('upload_photo.ai_error'), { description: (error as Error)?.message || $t('upload_photo.ai_error_retry') })
  }
  finally {
    fileEntry.aiLoading = false
    setFile(fileEntry)
  }
}

async function processFile(fileEntry: FileEntry) {
  await processFileExif(fileEntry)
  const task: Promise<unknown>[] = []
  if (uploadConfig.value.enableCompression) {
    task.push(processFileCompress(fileEntry))
  }
  if (!uploadConfig.value.formats.thumbnail && aiConfig.value.enabled) {
    task.push(processFileAiDescription(fileEntry))
  }
  await Promise.allSettled(task)
}

async function processFiles(rawFiles: File[]) {
  const fileEntries: FileEntry[] = rawFiles.map((file, index) => ({
    id: fileId + index,
    file,
    photo: {},
  }))
  files.value.push(...fileEntries)
  fileId += rawFiles.length
  processLoading.value = true
  Promise.allSettled(fileEntries.map(processFile)).finally(() => {
    processLoading.value = false
  })
}

const activeId = ref<number>()

const isActive = ref(false)

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files?.length)
    processFiles(Array.from(input.files))
  input.value = ''
}

function onDrop(e: DragEvent) {
  isActive.value = false
  const droppedFiles = e.dataTransfer?.files
  if (droppedFiles?.length)
    processFiles(Array.from(droppedFiles))
}

function closeFile(id: number) {
  const index = files.value.findIndex(f => f.id === id)
  if (index !== -1) {
    files.value.splice(index, 1)
  }
}
</script>

<template>
  <div class="mx-auto mb-20 p-4 flex flex-col gap-4 max-w-[1600px]">
    <UploadConfig :disabled="files.length > 0" />

    <label
      class="px-4 py-16 border border-input rounded-lg border-dashed flex flex-col gap-2 cursor-pointer transition-colors items-center justify-center data-[active=true]:border-primary data-[active=true]:bg-muted hover:bg-muted"
      :data-active="isActive"
      @dragover.prevent="isActive = true"
      @dragleave="isActive = false"
      @drop.prevent="onDrop"
    >
      <input
        type="file"
        multiple
        accept="image/*"
        class="hidden"
        @change="onFileChange"
      >
      <div class="i-lucide-upload text-20 text-muted-foreground" />
      <p class="text-sm">
        {{ $t('file_upload.title') }}
      </p>
      <p class="text-xs text-muted-foreground">
        {{ $t('file_upload.description') }}
      </p>
    </label>

    <ProButton
      v-if="files.length"
      :disabled="processLoading || !loggedIn"
      :loading="uploadLoading"
      class="ml-auto"
      @click="loggedIn && uploadAll()"
    >
      <span>{{ $t('upload_photo.upload_all') }}</span>
    </ProButton>

    <UploadPhoto
      v-for="file in files"
      :id="file.id"
      :key="file.id"
      v-model:active-id="activeId"
      v-model="file.photo"
      :file="file.file"
      :compress-file="file.compressedFile"
      :ai-loading="file.aiLoading"
      :upload-loading="file.uploadLoading"
      @upload="upload(file)"
      @generate="processFileAiDescription(file)"
      @close="closeFile(file.id)"
    />
  </div>
</template>
