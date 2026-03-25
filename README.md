# jibunjisinHP

Cloudflare Pages で配信する個人HPです。  
このリポジトリには、自分だけが投稿できる公開自撮りギャラリー `me` を追加しています。

## Current stack

- Public pages: static HTML / CSS / JS
- API: Cloudflare Pages Functions
- Metadata storage: Cloudflare D1
- Image storage: Cloudflare R2
- Admin auth: admin password + signed cookie

## Routes

- `/` existing home
- `/me` public gallery
- `/admin/me` admin login or admin list
- `/admin/me/new` create post
- `/admin/me/:id/edit` edit post
- `/api/me` public API
- `/api/admin/login` admin login API
- `/api/admin/logout` admin logout API
- `/api/admin/me` admin list/create API
- `/api/admin/me/:id` admin detail/update/delete API
- `/media/me/:key` image delivery from R2

## Public URLs

- `/`
- `/me`
- `/api/me`
- `/media/me/:key`

## Admin auth flow

1. Open `/admin/me`
2. If not logged in, a password form is shown
3. POST password to `/api/admin/login`
4. If correct, the server issues a signed session cookie
5. `/admin/me`, `/admin/me/new`, `/admin/me/:id/edit`, and `/api/admin/*` require that cookie
6. `/api/admin/logout` clears the cookie

Cookie policy:

- `HttpOnly`
- `Secure`
- `SameSite=Lax`
- `Path=/`
- expiry: 14 days

## Required Cloudflare variables / secrets

Variables:

- `MAX_UPLOAD_BYTES=8388608`

Secrets:

- `ADMIN_PASSWORD`
- `SESSION_SECRET`

## D1 and R2

D1:

- binding: `DB`
- database name: `jibunjisin-me-db`
- database id: `5df37c78-ec18-4170-a090-17af7ff38c10`

R2:

- binding: `SELFIES_BUCKET`
- bucket name: `jibunjisin-me-images`

## Local setup

1. `cmd /c npm install`
2. create `.dev.vars` from `.dev.vars.example`
3. set `ADMIN_PASSWORD` and `SESSION_SECRET`
4. `cmd /c npm run db:migrate`
5. `cmd /c npm run dev`

## Migration

Local:

- `cmd /c npm run db:migrate`

Remote:

- `cmd /c npm run db:migrate:remote`

The initial migration has already been applied to the remote D1 database.

## Verification

Public checks:

- `/`
- `/me`
- `/api/me`

Admin checks:

- `/admin/me` shows login form when logged out
- correct password logs in
- `/admin/me/new` works after login
- edit and delete work after login
- logout returns to login state

## Expected errors

- `Authentication required.`
  - login cookie is missing or expired
- `Invalid password.`
  - wrong admin password
- `Admin auth is not fully configured. Set ADMIN_PASSWORD and SESSION_SECRET.`
  - missing Cloudflare secrets
- `image is too large`
  - reduce image size or raise `MAX_UPLOAD_BYTES`
- `comment must be 140 characters or fewer`
  - shorten the comment
