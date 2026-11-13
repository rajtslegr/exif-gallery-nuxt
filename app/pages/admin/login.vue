<script setup lang="ts">
const { loggedIn } = useUserSession()
const route = useRoute()

function navigate() {
  navigateTo(route.query.redirect as string || '/admin')
}

if (loggedIn.value)
  navigate()
</script>

<template>
  <div class="p-4 flex flex-col gap-4 h-80dvh items-center justify-center">
    <LoginForm @logged-in="navigate()" />
  </div>
</template>

<style scoped>

</style>
