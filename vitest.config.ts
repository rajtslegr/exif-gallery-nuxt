import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Nuxt auto-imports do not exist here, so tests import what they need
    // explicitly. Everything tested is plain TypeScript, no Nuxt runtime needed.
    include: ['app/**/*.test.ts', 'server/**/*.test.ts'],
  },
})
