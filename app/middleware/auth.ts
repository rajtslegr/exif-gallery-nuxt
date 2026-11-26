export default defineNuxtRouteMiddleware((to) => {
  const { loggedIn } = useUserSession()
  const localePath = useLocalePath()
  if (!loggedIn.value) {
    return navigateTo({
      path: localePath('/admin/login'),
      query: {
        redirect: to.fullPath === localePath('/admin/login')
          ? localePath('/admin')
          : to.fullPath,
      },
    },
    )
  }
})
