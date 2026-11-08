export function useBackNavigation() {
  const router = useRouter()
  const localePath = useLocalePath()

  // Returns to the previous page, or to the index when the link was opened directly
  async function goBack() {
    if (router.options.history.state.back)
      await router.back()
    else
      await navigateTo(localePath('/'))
  }

  return { goBack }
}
