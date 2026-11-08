import type { NavigationType } from '~/stores/navigation'

export function usePhotoNavigation(photoId: MaybeRef<string>) {
  const localePath = useLocalePath()
  const navStore = useNavigationStore()
  const router = useRouter()
  const { goBack } = useBackNavigation()

  const id = computed(() => toValue(photoId))

  // Whether there is a valid browsing context
  const hasContext = computed(() => navStore.hasValidContext(id.value))

  // Whether paging is possible
  const canGoPrev = computed(() => hasContext.value && navStore.hasPrev(id.value))
  const canGoNext = computed(() => hasContext.value && navStore.hasNext(id.value))

  // Current position info
  const currentIndex = computed(() => navStore.getCurrentIndex(id.value))
  const totalLoaded = computed(() => navStore.photoIds.length)
  const hasMore = computed(() => navStore.hasMore)

  // Whether more photos are loading
  const loading = computed(() => navStore.loading)

  // Go to the previous photo
  async function goPrev() {
    if (!canGoPrev.value)
      return

    const prevId = navStore.getPrevId(id.value)
    if (prevId) {
      await router.replace(localePath(`/p/${prevId}`))
    }
  }

  // Go to the next photo
  async function goNext() {
    if (!canGoNext.value)
      return

    const nextId = await navStore.getNextId(id.value)
    if (nextId) {
      await router.replace(localePath(`/p/${nextId}`))
    }
  }

  // Keyboard navigation
  function handleKeydown(event: KeyboardEvent) {
    // Ignore key presses inside form fields
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      return
    }

    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault()
        goPrev()
        break
      case 'ArrowRight':
      case 'ArrowDown':
      case ' ':
        event.preventDefault()
        goNext()
        break
      case 'Escape':
        // When the browser itself is in fullscreen, Escape already exits it
        if (document.fullscreenElement)
          break
        event.preventDefault()
        goBack()
        break
    }
  }

  // Set up the keyboard listener
  onMounted(() => {
    window.addEventListener('keydown', handleKeydown)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown)
  })

  return {
    hasContext,
    canGoPrev,
    canGoNext,
    currentIndex,
    totalLoaded,
    hasMore,
    loading,
    goPrev,
    goNext,
  }
}

// Helper for list pages: set up the navigation context
export function useNavigationSetup(
  type: NavigationType,
  params: NavigationContext['params'],
  photos: Ref<IPhoto[]>,
  hasMore: Ref<boolean>,
  limit: number,
) {
  const navStore = useNavigationStore()

  function setupNavigation() {
    navStore.setContext(
      { type, params },
      photos.value,
      hasMore.value,
      limit,
    )
  }

  // Refresh the context when the photo list or hasMore changes
  watch([photos, hasMore], () => {
    setupNavigation()
  }, { deep: true })

  return {
    setupNavigation,
  }
}
