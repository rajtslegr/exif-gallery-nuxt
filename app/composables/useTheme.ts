export function useTheme(init = false) {
  const theme = useLocalStorage('shadcn-theme', 'blue')

  if (init && !import.meta.env.SSR) {
    watch(theme, (value) => {
      const oldClass = Array.from(document.body.classList).filter(className => className.startsWith('theme-'))
      if (oldClass.length)
        document.body.classList.remove(...oldClass)
      document.body.classList.add(`theme-${value}`)
    }, { immediate: true })
  }

  return {
    theme,
  }
}
