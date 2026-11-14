import type { NavigationType } from '~/stores/navigation'

export interface PhotoListParams {
  tag?: string
  camera?: string
  lens?: string
  orderBy?: string
  order?: string
  search?: string
}

/**
 * The five list views (home, grid, tag, camera, lens) all do the same thing:
 * SSR-fetch the first page, hand it to the infinite-scroll state, wire the
 * scroll listener and publish the browsing context used by the photo page.
 */
export async function usePhotoListPage(
  type: NavigationType,
  params: MaybeRef<PhotoListParams>,
  limit: number,
  scrollDistance = 240,
) {
  const { photos, hasMore, loadMore, loading } = usePhotosInfinite(params, limit)
  const paramsValue = computed(() => toValue(params))

  const { data } = await useFetch('/api/photos', {
    params: {
      ...paramsValue.value,
      limit,
      offset: 0,
    },
  })

  // Only seed an empty state: on a client-side revisit the cached list is newer
  // than the SSR payload, and appending it again would duplicate photos.
  if (data.value && !photos.value.length) {
    hasMore.value = data.value.hasMore
    photos.value = data.value.data.map(deserializePhoto)
  }

  useInfiniteScroll(window, loadMore, { distance: scrollDistance, canLoadMore: () => hasMore.value })

  const { setupNavigation } = useNavigationSetup(type, paramsValue.value, photos, hasMore, limit)
  setupNavigation()

  return { photos, hasMore, loadMore, loading }
}

/**
 * Tag/camera/lens pages are indexable: give each one its own title and canonical
 * instead of inheriting the site-wide ones.
 */
export function useFilterSeoMeta(type: 'tag' | 'camera' | 'lens', param: string) {
  const { t } = useI18n()
  // Resolved during setup: useRequestURL() is not available once unhead evaluates the getters
  const origin = useRequestURL().origin
  // The camera route encodes "Make|Model", so the canonical keeps the pipe
  const path = `/${type}/${encodeURIComponent(param)}`
  const name = param.replace(/\|/g, ' ')

  useSeoMeta({ title: () => t(`filter.${type}_title`, { name }) })
  useHead(() => ({ link: [{ rel: 'canonical', href: `${origin}${path}` }] }))
}
