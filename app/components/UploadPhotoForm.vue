<script setup lang="ts">
const photo = defineModel<IPhotoForm>({ required: true })
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- Basic Information -->
    <div>
      <h3 class="text-sm text-muted-foreground font-medium">
        {{ $t('basic_info.title') }}
      </h3>
      <div class="gap-x-4 gap-y-1 grid grid-cols-1 lg:grid-cols-4 md:grid-cols-2">
        <div>
          <Label class="text-sm font-medium">{{ $t('basic_info.photo_title') }}</Label>
          <Input v-model="photo.title" />
        </div>
        <div>
          <Label class="text-sm font-medium">{{ $t('basic_info.description') }}</Label>
          <Input v-model="photo.caption" />
        </div>
        <div class="lg:col-span-2">
          <Label class="text-sm font-medium">{{ $t('basic_info.tags') }}</Label>
          <TagsInputString v-model="photo.tags">
            <TagsInputItem v-for="tag in (photo.tags ? photo.tags.split(',') : []) || []" :key="tag" :value="tag">
              <TagsInputItemText />
              <TagsInputItemDelete />
            </TagsInputItem>
            <TagsInputInput :placeholder="$t('basic_info.tags_placeholder')" />
          </TagsInputString>
        </div>
        <div class="lg:col-span-4">
          <Label class="text-sm font-medium">{{ $t('basic_info.semantic_description') }}</Label>
          <Textarea v-model="photo.semanticDescription" class="py-1 min-h-12" />
        </div>
      </div>
    </div>

    <!-- Camera and Lens -->
    <div>
      <h3 class="text-sm text-muted-foreground font-medium">
        {{ $t('camera_lens.title') }}
      </h3>
      <div class="gap-x-4 gap-y-1 grid grid-cols-1 md:grid-cols-4 sm:grid-cols-2">
        <div>
          <Label class="text-sm font-medium">{{ $t('camera_lens.camera_make') }}</Label>
          <Input v-model="photo.make" />
        </div>
        <div>
          <Label class="text-sm font-medium">{{ $t('camera_lens.camera_model') }}</Label>
          <Input v-model="photo.model" />
        </div>
        <div>
          <Label class="text-sm font-medium">{{ $t('camera_lens.lens_make') }}</Label>
          <Input v-model="photo.lensMake" />
        </div>
        <div>
          <Label class="text-sm font-medium">{{ $t('camera_lens.lens_model') }}</Label>
          <Input v-model="photo.lensModel" />
        </div>
        <div>
          <Label class="text-sm font-medium">{{ $t('camera_lens.focal_length') }}</Label>
          <NumberFieldFull v-model="photo.focalLength" />
        </div>
        <div>
          <Label class="text-sm font-medium">{{ $t('camera_lens.focal_length_35mm') }}</Label>
          <NumberFieldFull v-model="photo.focalLengthIn35mmFormat" />
        </div>
      </div>
    </div>

    <!-- Exposure Settings -->
    <div>
      <h3 class="text-sm text-muted-foreground font-medium">
        {{ $t('exposure.title') }}
      </h3>
      <div class="gap-x-4 gap-y-1 grid grid-cols-1 lg:grid-cols-4 md:grid-cols-2">
        <div>
          <Label class="text-sm font-medium">{{ $t('exposure.aperture') }}</Label>
          <NumberFieldFull v-model="photo.fNumber" :step="0.1" :format-options="{ minimumFractionDigits: 1, maximumFractionDigits: 1 }" />
        </div>
        <div>
          <Label class="text-sm font-medium">{{ $t('exposure.iso') }}</Label>
          <NumberFieldFull v-model="photo.iso" />
        </div>
        <div>
          <Label class="text-sm font-medium">{{ $t('exposure.shutter_speed') }}</Label>
          <NumberFieldFull v-model="photo.exposureTime" :step="0.00001" :format-options="{ minimumFractionDigits: 0, maximumFractionDigits: 5 }" />
        </div>
        <div>
          <Label class="text-sm font-medium">{{ $t('exposure.exposure_compensation') }}</Label>
          <NumberFieldFull v-model="photo.exposureCompensation" :step="0.1" :format-options="{ minimumFractionDigits: 1, maximumFractionDigits: 1, signDisplay: 'always' }" />
        </div>
      </div>
    </div>

    <!-- Location Information -->
    <div>
      <h3 class="text-sm text-muted-foreground font-medium">
        {{ $t('location.title') }}
      </h3>
      <div class="gap-x-4 gap-y-1 grid grid-cols-1 lg:grid-cols-4 md:grid-cols-2">
        <div>
          <Label class="text-sm font-medium">{{ $t('location.location_name') }}</Label>
          <Input v-model="photo.locationName" />
        </div>
        <div>
          <Label class="text-sm font-medium">{{ $t('location.latitude') }}</Label>
          <NumberFieldFull v-model="photo.latitude" :step="0.000001" :format-options="{ minimumFractionDigits: 0, maximumFractionDigits: 6 }" />
        </div>
        <div>
          <Label class="text-sm font-medium">{{ $t('location.longitude') }}</Label>
          <NumberFieldFull v-model="photo.longitude" :step="0.000001" :format-options="{ minimumFractionDigits: 0, maximumFractionDigits: 6 }" />
        </div>
        <div>
          <Label class="text-sm font-medium">{{ $t('location.taken_at') }}</Label>
          <InputDatetime v-model="photo.takenAt" />
        </div>
      </div>
    </div>

    <!-- Gallery ordering -->
    <div>
      <h3 class="text-sm text-muted-foreground font-medium">
        {{ $t('sort.priority') }}
      </h3>
      <div class="gap-x-4 gap-y-1 grid grid-cols-1 lg:grid-cols-4 md:grid-cols-2">
        <div>
          <Label class="text-sm font-medium">{{ $t('sort.priority_value') }}</Label>
          <NumberFieldFull v-model="photo.priorityOrder" />
          <p class="text-xs text-muted-foreground">
            {{ $t('sort.priority_hint') }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
