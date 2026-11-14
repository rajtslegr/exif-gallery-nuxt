<script setup lang="ts">
const emit = defineEmits<{
  loggedIn: []
}>()
const { fetch: refreshSession } = useUserSession()
const password = ref('')
const loading = ref(false)

async function login() {
  if (loading.value || !password.value)
    return
  loading.value = true
  await $fetch('/api/auth', {
    method: 'POST',
    body: { password: password.value },
  })
    .then(async () => {
      await refreshSession()
      emit('loggedIn')
    })
    .catch((err) => {
      toast.error(`Error ${err.statusCode}`, {
        description: `${err.data?.message || err.message}. Please try again`,
      })
    })
  loading.value = false
}
</script>

<template>
  <div class="p-4 flex flex-col gap-4 max-w-sm w-full">
    <div class="flex flex-col gap-1">
      <h1 class="text-xl font-medium">
        {{ $t('login_form.title') }}
      </h1>
      <p class="text-sm text-muted-foreground">
        {{ $t('login_form.description') }}
      </p>
    </div>
    <form class="flex flex-col gap-4" @submit.prevent="login">
      <div class="flex flex-col gap-2">
        <Label for="password">{{ $t('login_form.password') }}</Label>
        <Input
          id="password"
          v-model="password"
          type="password"
          autocomplete="on"
          required
          :placeholder="$t('login_form.password_placeholder')"
        />
      </div>
      <ProButton
        type="submit"
        class="w-full"
        :disabled="!password || loading"
        :loading="loading"
      >
        {{ $t('login_form.login_button') }}
      </ProButton>
      <NuxtLinkLocale to="/">
        <Button variant="ghost" class="w-full">
          <div class="i-lucide-chevron-left" />
          <span>{{ $t('login_form.back_to_gallery') }}</span>
        </Button>
      </NuxtLinkLocale>
    </form>
  </div>
</template>
