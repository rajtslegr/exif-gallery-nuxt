# EXIF Gallery Nuxt

Self-hosted photo gallery for Cloudflare. Photos are uploaded from the browser,
compressed into JPEG/WebP/AVIF + thumbnail variants, described by an AI provider,
and served from Cloudflare R2 with metadata in D1.

## Features

- Browser-side compression and resize via Web Workers ([JSQuash](https://github.com/jamsinclair/jSquash)), so the server never touches pixels
- Full EXIF extraction (`exifr`) and per-photo metadata editing
- Optional AI-generated title, caption, tags and semantic description (OpenAI, Gemini, or any OpenAI-compatible endpoint)
- Normalized tag system, plus camera/lens filtering and full-text search
- Gallery and grid views, infinite scroll, `viewer.js` lightbox
- RSS feed, sitemap, robots.txt, Open Graph image
- Password-protected admin panel for upload, edit and delete
- Edge-native: Nuxt on Cloudflare Workers, D1 for data, R2 for blobs

## Stack

Nuxt 4 · Vue 3.5 · Cloudflare Workers (D1 + R2 via NuxtHub) · Drizzle ORM · UnoCSS · shadcn-vue / reka-ui · Pinia · `@nuxtjs/i18n` (English only) · `nuxt-auth-utils` · AI SDK · Vitest

## Local development

```bash
pnpm install
pnpm dev          # local D1 + R2 emulation
pnpm dev --remote # run against the real Cloudflare resources
```

Other scripts:

```bash
pnpm build        # production build
pnpm preview      # preview the production build
pnpm deploy       # build and deploy to Cloudflare Workers
pnpm db:generate  # generate a Drizzle migration after editing server/db/schema.ts
pnpm lint --fix   # ESLint (@antfu/eslint-config)
pnpm typecheck    # vue-tsc
pnpm test         # Vitest unit tests (server/utils)
pnpm logs         # wrangler tail of the deployment
```

## Environment variables

Set these in `.env` for local development and in the Workers runtime for production:

| Variable                   | Required | Purpose                                                        |
| -------------------------- | -------- | -------------------------------------------------------------- |
| `NUXT_ADMIN_PASSWORD`      | yes      | Admin panel password. Auth returns 500 if unset.               |
| `NUXT_SESSION_PASSWORD`    | yes      | `nuxt-auth-utils` session key, at least 32 characters.         |
| `NUXT_PUBLIC_TITLE`        | no       | Site title, falls back to the `title` i18n string.             |
| `NUXT_PUBLIC_DESCRIPTION`  | no       | Meta description, falls back to the `description` i18n string. |
| `NUXT_PUBLIC_DEFAULT_VIEW` | no       | Home view: `gallery` (default) or `grid`.                      |

AI provider settings are configured in the admin panel and stored in `localStorage`, not in env vars.

## Deployment

`wrangler.jsonc` binds the two Cloudflare resources: the `DB` D1 database and the
`BLOB` R2 bucket. Deploy with `pnpm deploy`, then apply migrations through the
`Database Migration` GitHub Action (`.github/workflows/migrate.yml`), which needs
the `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` secrets.

### Migration tracking

The two environments record applied migrations differently:

- **Local dev** — NuxtHub manages migrations and writes names without the `.sql` suffix into `_hub_migrations`.
- **Production** — `wrangler d1 migrations apply` writes names with the `.sql` suffix.

Never run `wrangler d1 migrations` commands against your local database; the suffix
mismatch makes the same migration run twice. Local changes are applied by NuxtHub
automatically, production changes by the GitHub Action on every push to `main`.

## Project structure

```text
app/
  components/    ui (shadcn-vue), inspira, ui-pro, feature components
  composables/   photos, AI config, upload config, sorting, theme
  pages/         index, gallery, grid, p/[...id], tag/, camera/, lens/, admin/
  stores/        Pinia caches (photos, navigation)
  workers/       decode.worker.ts, encode.worker.ts
  utils/         compress.ts, AI providers
i18n/locales/    en.yml
server/
  api/           auth, photos (CRUD + upload), tags
  routes/        /photos/[pathname], feed.xml, sitemap.xml, robots.txt
  db/            schema.ts, migrations, scripts
  utils/         query helpers, cache, feed, tag normalization (+ Vitest specs)
```

## Data model

```text
photos (1) ←→ (N) photo_tags (N) ←→ (1) tags
```

`photos` holds EXIF, file names for each R2 variant, AI metadata and ordering;
`tags.name` is unique with a denormalized `photo_count`; `photo_tags` cascades on
both sides.

## License

MIT, see [LICENSE](./LICENSE).
