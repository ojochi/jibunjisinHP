# jibunjisinHP

Cloudflare Pages で配信する個人HPです。  
このリポジトリには、自分だけが投稿できる公開自撮りギャラリー `me` を追加しています。

## Current stack

- Public pages: static HTML / CSS / JS
- API: Cloudflare Pages Functions
- Metadata storage: Cloudflare D1
- Image storage: Cloudflare R2
- Admin protection: Cloudflare Access + JWT verification in Functions

## Routes

- `/` existing home
- `/me` public gallery
- `/admin/me` admin list
- `/admin/me/new` create post
- `/admin/me/:id/edit` edit post
- `/api/me` public API
- `/api/admin/me` admin list/create API
- `/api/admin/me/:id` admin detail/update/delete API
- `/media/me/:key` image delivery from R2

## Public-first release

公開してよいURL:

- `/`
- `/me`
- `/api/me`
- `/media/me/:key`

まだ使わないURL:

- `/admin/me`
- `/admin/me/new`
- `/admin/me/:id/edit`
- `/api/admin/me`
- `/api/admin/me/:id`

## Data model

### posts

- `id`
- `created_at`
- `comment`
- `source_type`
- `source_post_id`
- `source_permalink`
- `updated_at`

### post_images

- `id`
- `post_id`
- `image_key`
- `image_url`
- `sort_order`
- `created_at`

Initial release rule: one post has one image.

## Validation rules

- image: jpg / jpeg / png / webp
- image size limit: `MAX_UPLOAD_BYTES` default 8 MB
- comment: required, max 140 chars
- `created_at`: server-side only
- SQL: prepared statements only

## Local setup

1. Install dependencies  
   `cmd /c npm install`
2. Set the real D1 `database_id` in `wrangler.toml` when available
3. Apply local migration  
   `cmd /c npm run db:migrate`
4. Start local dev server  
   `cmd /c npm run dev`

`LOCAL_DEV_BYPASS_ACCESS=true` is enabled by default for local verification.

Local migration status in this workspace:

- `cmd /c npm run db:migrate`: completed
- local tables `posts` and `post_images`: created successfully

Seed note:

- no separate seed script is required
- once admin is enabled, create the first post from `/admin/me/new`

## Cloudflare dashboard setup

### D1

Configured target:

- binding: `DB`
- database name: `jibunjisin-me-db`

Still required by a human:

1. Open the D1 database `jibunjisin-me-db`
2. Copy the real database ID
3. Replace `REPLACE_WITH_D1_DATABASE_ID` in `wrangler.toml`
4. Run `wrangler d1 migrations apply DB --remote`

### R2

Configured target:

- binding: `SELFIES_BUCKET`
- bucket name: `jibunjisin-me-images`

Already expected in Pages bindings.

### Pages variables

Already expected:

- `ADMIN_EMAIL=asanojo1101@gmail.com`
- `MAX_UPLOAD_BYTES=8388608`

Add later when Access is resumed:

- `ACCESS_TEAM_DOMAIN=https://<team>.cloudflareaccess.com`
- `ACCESS_AUD=<access-aud>`

### Access

Access is intentionally on hold for the public-first release.

Current behavior:

- public routes work without Access
- admin routes return `403` unless local bypass is used

When admin is resumed:

1. Protect `/admin/*`
2. Protect `/api/admin/*`
3. Restrict to `asanojo1101@gmail.com`
4. Set `ACCESS_TEAM_DOMAIN`
5. Set `ACCESS_AUD`

## Access JWT verification

`functions/_lib/access.js` verifies Access in this order:

1. Read `Cf-Access-Jwt-Assertion`
2. Split JWT into header / payload / signature
3. Decode header and payload
4. Fetch JWKs from `https://<team>.cloudflareaccess.com/cdn-cgi/access/certs`
5. Cache JWKs in module memory for 5 minutes
6. Ask Cloudflare edge cache to keep certs for 5 minutes
7. Verify RS256 signature
8. Verify `iss`, `aud`, `exp`, `nbf`
9. Verify `Cf-Access-Authenticated-User-Email`

Failure behavior:

- invalid or missing JWT: `403`
- invalid issuer / audience / expiry / signature: `403`
- missing Access config: `403`

## _routes.json

- include: `/admin/*`, `/api/*`, `/media/*`
- exclude: none

Why this does not conflict:

- `/` and `/me` remain static pages
- `/assets/*` remains static CSS / JS / image delivery
- `/admin/*` goes through middleware before static HTML
- `/media/*` is handled by Functions because the source is R2

## Verification record

Completed in this workspace:

- `cmd /c npm install`
- Functions module import check
- local D1 migration
- local schema creation confirmation
- public-first routing cleanup
- admin routes fail safely with `403` when Access config is missing

Not yet verified:

- remote D1 migration
- real R2 upload / download
- production Pages deploy
- real Access login flow

## Local verification flow

### Start local dev

`cmd /c npm run dev`

### Public route checks

- `/`
- `/me`
- `/api/me`
- `/media/me/<image_key>`

Expected behavior:

- `/me` shows square images only
- no comment text on `/me`
- `/api/me` returns JSON

### Admin route checks while Access is not configured

- `/admin/me`
- `/admin/me/new`
- `/api/admin/me`

Expected behavior:

- local with `LOCAL_DEV_BYPASS_ACCESS=true`: available for development
- non-local or bypass off: `403`

### Expected errors and fixes

- `Cloudflare Access is not fully configured...`
  - expected until Access is resumed
- `Admin access is not configured...`
  - set `ADMIN_EMAIL`
- `image is too large`
  - reduce image size or raise `MAX_UPLOAD_BYTES`
- `comment must be 140 characters or fewer`
  - shorten the comment

## Production deploy flow

Public-first release:

1. Set the real D1 `database_id` in `wrangler.toml`
2. Run `wrangler d1 migrations apply DB --remote`
3. Push to the Pages-connected branch
4. Wait for redeploy
5. Verify `/`, `/me`, `/api/me`

## Minimal human checklist

1. Put the real D1 database ID into `wrangler.toml`
2. Run remote migration
3. Redeploy Pages
4. Verify public URLs
5. Later, when admin is resumed, set `ACCESS_TEAM_DOMAIN` and `ACCESS_AUD`
