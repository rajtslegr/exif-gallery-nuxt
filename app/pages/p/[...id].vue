<script setup lang="ts">
import { useLocalStorage, useWakeLock } from '@vueuse/core'
import { cn } from '@/lib/utils'

type SlideshowMode = 'loop' | 'sequential' | 'random'

definePageMeta({
  layout: 'home',
})

const route = useRoute()
const imageReady = ref(false)
const router = useRouter()
const localePath = useLocalePath()
const config = useRuntimeConfig()

const id = ref(route.params.id?.[0] || '')

// Every next/prev navigates to another photo, which has to load again
watch(id, () => {
  imageReady.value = false
})
if (!id.value)
  throw createError({ statusCode: 404, statusMessage: 'Photo not found', fatal: true })

watch(() => route.params.id, (params) => {
  const nextId = params?.[0]
  if (nextId)
    id.value = nextId
})

const { loggedIn } = useUserSession()

const { photo, error: photoError } = await usePhoto(id)
if (photoError.value) {
  const statusCode = getErrorStatus(photoError.value) === 404 ? 404 : 500
  throw createError({
    statusCode,
    statusMessage: statusCode === 404 ? 'Photo not found' : 'Failed to load photo',
    fatal: true,
  })
}

// Resolved during setup: useRequestURL() is not available once unhead evaluates the getters
const origin = useRequestURL().origin

const photoImageUrl = computed(() => {
  const path = photo.value?.webp || photo.value?.jpeg || photo.value?.avif
  return path ? `${origin}/photos/${path}` : undefined
})

const photoTitle = computed(() => photo.value?.title || photo.value?.fileName)
const photoDescription = computed(() => photo.value?.caption || photo.value?.semanticDescription)
const photoUrl = computed(() => photo.value ? `${origin}/p/${photo.value.id}` : undefined)

useSeoMeta({
  title: () => photoTitle.value,
  description: () => photoDescription.value,
  ogTitle: () => photoTitle.value,
  ogDescription: () => photoDescription.value,
  ogImage: () => photoImageUrl.value,
  ogUrl: () => photoUrl.value,
  ogType: 'article',
  twitterCard: 'summary_large_image',
})

useHead(() => ({
  link: photoUrl.value ? [{ rel: 'canonical', href: photoUrl.value }] : [],
  script: photo.value
    ? [{
        type: 'application/ld+json',
        // Structured data for image search. A caption containing a closing script
        // tag must not end this block, so every `<` is escaped.
        innerHTML: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'ImageObject',
          'name': photoTitle.value,
          'description': photoDescription.value,
          'contentUrl': photoImageUrl.value,
          'thumbnailUrl': photo.value.thumbnail ? `${origin}/photos/${photo.value.thumbnail}` : undefined,
          'url': photoUrl.value,
          'datePublished': (photo.value.takenAt ?? photo.value.createdAt)?.toISOString(),
          'uploadDate': photo.value.createdAt?.toISOString(),
          'keywords': photo.value.tags.length ? photo.value.tags.join(', ') : undefined,
          'copyrightHolder': config.public.title
            ? { '@type': 'Organization', 'name': config.public.title }
            : undefined,
        }).replace(/</g, '\\u003c'),
      }]
    : [],
}))

const pStore = usePhotosStore()
const photosStore = pStore.photosStore

function onDeleted() {
  photosStore.clear()
  navigateTo(localePath('/'))
}

const idleState = useState('p-idle', () => true)
const { idle } = useIdle(2000, { initialState: idleState.value })
watch(idle, val => idleState.value = val, { immediate: true })

// Photo paging navigation
const { hasContext, canGoPrev, canGoNext, loading, goPrev, goNext }
  = usePhotoNavigation(id)
const navStore = useNavigationStore()

const slideshowPlaying = useState('slideshow-playing', () => false)
const slideshowKeepAwake = useLocalStorage('slideshow-keep-screen-awake', false)
const { request: requestWakeLock, release: releaseWakeLock } = useWakeLock()
const slideshowInterval = useLocalStorage('slideshow-interval-seconds', 60)
const slideshowMode = useLocalStorage<SlideshowMode>('slideshow-playback-mode', 'loop')

const shouldKeepScreenAwake = computed(() => slideshowPlaying.value && slideshowKeepAwake.value)
watch(shouldKeepScreenAwake, (keepAwake) => {
  if (keepAwake)
    void requestWakeLock('screen').catch(() => {})
  else
    void releaseWakeLock().catch(() => {})
}, { immediate: true })

const cursorHidden = computed(() => slideshowPlaying.value && idle.value)
watch(cursorHidden, (hidden) => {
  if (import.meta.client)
    document.documentElement.classList.toggle('cursor-none', hidden)
}, { immediate: true })

const randomVisited = new Set<string>()
let preloadedForPhotoId: string | undefined
let preloadedNextPhotoId: string | undefined
let preloadToken = 0
let slideshowTimer: ReturnType<typeof setTimeout> | undefined
let slideshowTimerToken = 0
let advancing = false

function invalidatePreload() {
  preloadToken += 1
  preloadedForPhotoId = undefined
  preloadedNextPhotoId = undefined
}

async function getNextPhotoIdForPreload(): Promise<string | null> {
  const currentId = id.value
  if (!currentId || !navStore.hasValidContext(currentId))
    return null

  if (slideshowMode.value === 'random') {
    if (navStore.hasMore)
      await navStore.loadMorePhotos()

    const candidates = navStore.photoIds.filter(photoId => photoId !== currentId && !randomVisited.has(photoId))
    if (candidates.length > 0)
      return candidates[Math.floor(Math.random() * candidates.length)] ?? null

    const loopCandidates = navStore.photoIds.filter(photoId => photoId !== currentId)
    return loopCandidates[Math.floor(Math.random() * loopCandidates.length)] ?? null
  }

  const currentIndex = navStore.getCurrentIndex(currentId)
  if (currentIndex < 0)
    return null

  if (currentIndex >= navStore.photoIds.length - 1 && navStore.hasMore)
    await navStore.loadMorePhotos()

  const nextId = navStore.photoIds[currentIndex + 1]
  if (nextId)
    return nextId

  if (slideshowMode.value === 'loop')
    return navStore.photoIds.find(photoId => photoId !== currentId) ?? null

  return null
}

function preloadImage(photo: Pick<APIDataPhoto, 'avif' | 'webp' | 'jpeg'>) {
  if (!import.meta.client || !document.body)
    return

  const picture = document.createElement('picture')
  picture.style.position = 'fixed'
  picture.style.width = '1px'
  picture.style.height = '1px'
  picture.style.opacity = '0'
  picture.style.pointerEvents = 'none'
  picture.style.overflow = 'hidden'
  picture.setAttribute('aria-hidden', 'true')

  if (photo.avif) {
    const source = document.createElement('source')
    source.srcset = `/photos/${photo.avif}`
    source.type = 'image/avif'
    picture.appendChild(source)
  }
  if (photo.webp) {
    const source = document.createElement('source')
    source.srcset = `/photos/${photo.webp}`
    source.type = 'image/webp'
    picture.appendChild(source)
  }

  const image = document.createElement('img')
  const fallbackPath = photo.jpeg || photo.webp || photo.avif
  if (!fallbackPath) {
    picture.remove()
    return
  }

  image.alt = ''
  image.loading = 'eager'
  image.decoding = 'async'
  picture.appendChild(image)
  document.body.appendChild(picture)
  image.src = `/photos/${fallbackPath}`

  let cleanupTimer: ReturnType<typeof setTimeout> | undefined
  const cleanup = () => {
    if (cleanupTimer)
      clearTimeout(cleanupTimer)
    picture.remove()
  }
  image.addEventListener('load', cleanup, { once: true })
  image.addEventListener('error', cleanup, { once: true })
  cleanupTimer = setTimeout(cleanup, 30_000)
}

async function preloadNextPhoto() {
  invalidatePreload()
  if (!slideshowPlaying.value || !photo.value || !hasContext.value)
    return

  const currentToken = preloadToken
  const nextId = await getNextPhotoIdForPreload()
  if (!nextId || currentToken !== preloadToken)
    return

  try {
    const response = await $fetch<APIDataPhoto>(`/api/photos/${nextId}`, { method: 'get' })
    if (currentToken !== preloadToken)
      return

    preloadedForPhotoId = id.value
    preloadedNextPhotoId = nextId
    preloadImage(response)
  }
  catch (error) {
    if (currentToken === preloadToken)
      console.error('Failed to preload next photo:', error)
  }
}

function clearSlideshowTimer() {
  slideshowTimerToken += 1
  if (slideshowTimer) {
    clearTimeout(slideshowTimer)
    slideshowTimer = undefined
  }
}

async function goToPhoto(photoId: string) {
  await router.replace(localePath(`/p/${photoId}`))
}

async function goToFirstPhoto() {
  const firstId = navStore.photoIds[0]
  if (!firstId || firstId === id.value)
    return false

  await goToPhoto(firstId)
  return true
}

async function goToRandomPhoto() {
  if (navStore.hasMore)
    await navStore.loadMorePhotos()

  let nextId = preloadedForPhotoId === id.value ? preloadedNextPhotoId : undefined
  if (!nextId) {
    let candidates = navStore.photoIds.filter(photoId => photoId !== id.value && !randomVisited.has(photoId))
    if (candidates.length === 0) {
      randomVisited.clear()
      candidates = navStore.photoIds.filter(photoId => photoId !== id.value)
    }
    nextId = candidates[Math.floor(Math.random() * candidates.length)]
  }

  if (!nextId)
    return false

  randomVisited.add(id.value)
  randomVisited.add(nextId)
  await goToPhoto(nextId)
  return true
}

function scheduleSlideshow() {
  clearSlideshowTimer()
  if (!slideshowPlaying.value || !photo.value || !hasContext.value)
    return

  const timerToken = slideshowTimerToken
  slideshowTimer = setTimeout(() => {
    if (timerToken !== slideshowTimerToken)
      return

    slideshowTimer = undefined
    void advanceSlideshow(timerToken)
  }, slideshowInterval.value * 1000)
}

async function advanceSlideshow(timerToken: number) {
  if (timerToken !== slideshowTimerToken || !slideshowPlaying.value || advancing)
    return

  advancing = true
  let moved = false
  try {
    if (slideshowMode.value === 'random') {
      moved = await goToRandomPhoto()
    }
    else if (canGoNext.value) {
      await goNext()
      moved = true
    }
    else if (slideshowMode.value === 'loop') {
      moved = await goToFirstPhoto()
    }
  }
  finally {
    advancing = false
  }

  if (timerToken !== slideshowTimerToken || !slideshowPlaying.value)
    return

  if (moved)
    scheduleSlideshow()
  else
    slideshowPlaying.value = false
}

watch([slideshowPlaying, slideshowInterval, slideshowMode], () => {
  randomVisited.clear()
  scheduleSlideshow()
  void preloadNextPhoto()
})
watch([photo, hasContext, () => route.params.id], () => {
  scheduleSlideshow()
  void preloadNextPhoto()
}, { immediate: true })
onBeforeRouteLeave((to) => {
  if (to.name !== route.name) {
    slideshowPlaying.value = false
    invalidatePreload()
  }
})
onBeforeUnmount(() => {
  invalidatePreload()
  clearSlideshowTimer()
})

// Swipe support on mobile
const imageContainerRef = ref<HTMLElement>()
const { isSwiping, direction } = useSwipe(imageContainerRef, {
  threshold: 50,
  onSwipeEnd: () => {
    if (direction.value === 'left' && canGoNext.value) {
      goNext()
    }
    else if (direction.value === 'right' && canGoPrev.value) {
      goPrev()
    }
  },
})
</script>

<template>
  <section
    v-if="photo"
    ref="imageContainerRef"
    class="bg-white flex flex-col h-[calc(100dvh-3rem)] relative overflow-hidden dark:bg-black"
  >
    <PhotoItem
      :photo="photo"
      :logged-in="loggedIn"
      :fullscreen="true"
      :priority="true"
      editable
      @deleted="onDeleted()"
      @image-loaded="imageReady = true"
    >
      <template #image-overlay>
        <div
          v-if="hasContext && canGoPrev"
          class="group cursor-pointer left-2 top-1/2 absolute z-10 lt-md:hidden -translate-y-1/2"
        >
          <Button
            variant="ghost"
            :aria-label="$t('button.previous_photo')"
            class="text-xl text-foreground/67 rounded-lg bg-background/30 size-16 shadow-lg transition-all duration-300 backdrop-blur hover:bg-background/50"
            :class="cn(
              (isSwiping ? direction === 'right' : !idle) ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0 pointer-events-none',
              'group-hover:translate-x-0 group-hover:opacity-100 group-hover:pointer-events-auto',
            )"
            @click="goPrev"
          >
            <div class="i-lucide-chevron-left" />
          </Button>
        </div>
        <div
          v-if="hasContext && canGoNext"
          class="group cursor-pointer right-2 top-1/2 absolute z-10 lt-md:hidden -translate-y-1/2"
        >
          <ProButton
            variant="ghost"
            :aria-label="$t('button.next_photo')"
            class="text-xl text-foreground/67 rounded-lg bg-background/30 size-16 shadow-lg transition-all duration-300 backdrop-blur hover:bg-background/50"
            :class="cn(
              (isSwiping ? direction === 'left' : !idle) ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 pointer-events-none',
              'group-hover:translate-x-0 group-hover:opacity-100 group-hover:pointer-events-auto',
            )"
            :loading="loading"
            @click="goNext"
          >
            <div class="i-lucide-chevron-right" />
          </ProButton>
        </div>
      </template>
      <template #action-button>
        <SlideshowControls
          v-if="hasContext"
          v-model:playing="slideshowPlaying"
          v-model:keep-screen-awake="slideshowKeepAwake"
          v-model:interval="slideshowInterval"
          v-model:mode="slideshowMode"
        />
      </template>
    </PhotoItem>
    <div v-if="!imageReady" class="bg-background flex items-center inset-0 justify-center absolute z-20">
      <Skeleton class="h-full w-full" />
    </div>
  </section>
  <section v-else>
    <Skeleton class="w-full aspect-[4/3]" />
  </section>
</template>
