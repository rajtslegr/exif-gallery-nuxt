<script setup lang="ts">
const { photo } = defineProps<{
  photo: IPhoto | undefined
}>()

const open = defineModel<boolean>('open')

const { loggedIn } = useUserSession()
const pStore = usePhotosStore()

const editedPhoto = ref<IPhoto>()

// UploadPhotoForm works with the comma separated tag string, IPhoto with an array
const editedPhotoForm = computed<IPhotoForm>({
  get: () => editedPhoto.value
    ? { ...editedPhoto.value, tags: editedPhoto.value.tags.join(',') }
    : {},
  set: (form) => {
    if (!editedPhoto.value)
      return
    editedPhoto.value = {
      ...editedPhoto.value,
      ...form,
      tags: form.tags ? form.tags.split(',').map(tag => tag.trim()).filter(Boolean) : [],
    }
  },
})
const isSaving = ref(false)

const EDITABLE_FIELDS = [
  'title',
  'caption',
  'semanticDescription',
  'make',
  'model',
  'focalLength',
  'focalLengthIn35mmFormat',
  'lensMake',
  'lensModel',
  'fNumber',
  'iso',
  'exposureTime',
  'exposureCompensation',
  'locationName',
  'latitude',
  'longitude',
  'priorityOrder',
  'takenAt',
] as const

/**
 * Send only fields the dialog actually received. The list endpoint omits
 * coordinates for anonymous visitors, and a missing key must leave the stored
 * value alone instead of clearing it.
 */
function buildPayload(photo: IPhoto) {
  const body: Record<string, unknown> = { tags: photo.tags.join(',') }

  for (const field of EDITABLE_FIELDS) {
    const value = photo[field]
    if (value === undefined)
      continue

    body[field] = field === 'takenAt'
      ? new Date(value as Date | string).toISOString()
      : value === '' ? null : value
  }

  return body
}

watch(() => photo, (val) => {
  if (val) {
    editedPhoto.value = { ...val }
  }
}, { immediate: true })

watch(open, (val) => {
  if (val && photo) {
    editedPhoto.value = { ...photo }
  }
}, { immediate: true })

async function saveChanges() {
  if (!editedPhoto.value)
    return

  try {
    isSaving.value = true
    await $fetch(`/api/photos/${editedPhoto.value.id}`, {
      method: 'PUT',
      body: buildPayload(editedPhoto.value),
    })

    pStore.updatePhoto(editedPhoto.value)

    toast.success('Photo updated successfully')

    open.value = false
  }
  catch (error) {
    console.error(error)
    toast.error('Failed to update photo', {
      description: getErrorMessage(error, 'An error occurred'),
    })
  }
  finally {
    isSaving.value = false
  }
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogTrigger as-child>
      <slot />
    </DialogTrigger>
    <DialogContent class="grid-rows-[auto_minmax(0,1fr)_auto] max-h-[90dvh] max-w-[90dvw] sm:max-w-[90dvw] xl:max-w-300">
      <DialogHeader>
        <DialogTitle>{{ $t('edit_photo.title') }}</DialogTitle>
      </DialogHeader>
      <div class="mx--6 px-6 overflow-y-auto">
        <section class="mb-4 relative">
          <PhotoItem
            v-if="editedPhoto"
            class="min-h-60"
            :photo="editedPhoto"
            :logged-in="true"
            mini
            hide-action
          />
        </section>
        <Card v-if="editedPhoto" :key="editedPhoto.id" class="p-4">
          <UploadPhotoForm v-model="editedPhotoForm" />
        </Card>
      </div>
      <DialogFooter class="flex flex-row gap-4 items-center justify-center">
        <Button variant="outline" @click="open = false">
          {{ $t('edit_photo.cancel') }}
        </Button>
        <ProButton
          :loading="isSaving"
          :disabled="!loggedIn"
          @click="loggedIn && saveChanges()"
        >
          {{ $t('edit_photo.save_changes') }}
        </ProButton>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<style scoped>
</style>
