# AGENTS.md

Guidance for coding agents working in this repo. Reply in English.

## What this is

Nuxt 4 photo blog deployed to Cloudflare Workers. Photos are compressed in the
browser (JSQuash workers), stored in R2, and their metadata lives in D1 (SQLite)
through Drizzle ORM. AI providers generate titles, captions and tags on upload.

## Commands

```bash
pnpm dev          # dev server with local D1/R2
pnpm dev --remote # dev server against real Cloudflare resources
pnpm build        # production build
pnpm deploy       # build + wrangler deploy
pnpm db:generate  # Drizzle migration after schema changes
pnpm lint --fix   # ESLint (@antfu/eslint-config) — always run after edits
pnpm typecheck    # vue-tsc
pnpm test         # Vitest, specs live next to sources in server/utils
```

## Layout

- `app/pages/` — `index`, `gallery`, `grid`, `p/[...id]`, `tag/[...tag]`, `camera/[...camera]`, `lens/[...lens]`, `admin/*`
- `app/components/` — `ui` (shadcn-vue, unprefixed via `nuxt.config`), `inspira`, `ui-pro`, feature components
- `app/composables/`, `app/stores/` — Pinia photo cache, infinite scroll, AI + upload config, theme
- `app/workers/` — `decode.worker.ts`, `encode.worker.ts`; pipeline in `app/utils/compress.ts`
- `server/api/` — `auth.post.ts`, `photos/*` (list, get, put, delete, upload), `tags/index.get.ts`
- `server/routes/` — `/photos/[pathname]` (R2 blobs), `feed.xml`, `sitemap.xml`, `robots.txt`
- `server/db/` — `schema.ts`, `migrations/sqlite/`, `scripts/`
- `server/utils/` — query helpers, cache, feed, tag normalization, each with a `*.test.ts` where testable

## Data model

```text
photos (1) ←→ (N) photo_tags (N) ←→ (1) tags
```

`photos` stores EXIF fields, one column per R2 variant (`jpeg`, `webp`, `avif`,
`thumbnail`), AI metadata, `aspect_ratio` and `priority_order`. `tags.name` is
unique with a denormalized `photo_count`; `photo_tags` cascades on delete. Edit
`server/db/schema.ts`, then run `pnpm db:generate` and commit the generated SQL.

## Migrations (easy to break)

Local dev uses NuxtHub, which records migration names **without** the `.sql`
suffix in `_hub_migrations`. Production applies them with `wrangler d1 migrations
apply`, which records names **with** the suffix. Do not run `wrangler d1
migrations` commands against the local database, and do not rename applied
migrations — the mismatch makes a migration run twice. Production migrations are
applied by `.github/workflows/migrate.yml` on push to `main`.

## Auth

`nuxt-auth-utils` sessions; every authenticated session is an admin session. API
handlers that mutate data call `requireUserSession(event)`. Login is
`POST /api/auth` compared against `NUXT_ADMIN_PASSWORD` (no default; the handler
returns 500 when unset, and throttles attempts to one per 5 seconds).
`NUXT_SESSION_PASSWORD` (32+ chars) encrypts the session cookie.

## Conventions

- TypeScript strict; never use `any` — reach for `unknown` plus a Zod schema.
- `@antfu/eslint-config`: single quotes, no semicolons, sorted keys/imports. Run `pnpm lint --fix`.
- `<script setup lang="ts">` only; components, composables and utils are auto-imported.
- UI strings go through `$t()` with keys in `i18n/locales/en.yml` (English only).
- Public runtime config: `NUXT_PUBLIC_TITLE`, `NUXT_PUBLIC_DESCRIPTION`, `NUXT_PUBLIC_DEFAULT_VIEW`.
- `/photos/**` responses are cached immutably for a year; never serve user-specific content from that path.
