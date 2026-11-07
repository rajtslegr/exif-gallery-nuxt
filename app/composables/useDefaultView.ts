export type ViewMode = 'gallery' | 'grid'

/**
 * Default view, driven by `NUXT_PUBLIC_DEFAULT_VIEW`: `gallery` (default) or `grid`
 */
export function useDefaultView() {
  const config = useRuntimeConfig()
  const defaultView = computed<ViewMode>(() =>
    config.public.defaultView === 'grid' ? 'grid' : 'gallery',
  )

  return {
    defaultView,
    isGridDefault: computed(() => defaultView.value === 'grid'),
  }
}
