import { isAuthenticated } from "../../_lib/auth.js";

function renderLoginPage() {
  return `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Admin Login</title>
    <link rel="stylesheet" href="/assets/selfies.css">
  </head>
  <body>
    <main class="shell">
      <header class="page-head">
        <div>
          <p class="eyebrow">Admin</p>
          <h1>ログイン</h1>
          <p class="lead">管理用パスワードを入力してください。</p>
        </div>
        <nav class="page-links">
          <a href="/">Home</a>
          <a href="/me">Public</a>
        </nav>
      </header>

      <section class="panel">
        <form id="admin-login-form" class="selfie-form" novalidate>
          <label class="field">
            <span>Password</span>
            <input type="password" name="password" autocomplete="current-password" required>
          </label>

          <p id="login-message" class="message" hidden></p>

          <div class="form-actions">
            <button type="submit" class="primary">Login</button>
          </div>
        </form>
      </section>
    </main>

    <script src="/assets/admin-login.js"></script>
  </body>
</html>`;
}

function renderAdminPage() {
  return `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>me Admin</title>
    <link rel="stylesheet" href="/assets/selfies.css">
  </head>
  <body>
    <main class="shell">
      <header class="page-head">
        <div>
          <p class="eyebrow">Admin</p>
          <h1>自撮り投稿の管理</h1>
          <p class="lead">スマホから画像を投稿、編集、削除できます。</p>
        </div>
        <nav class="page-links">
          <a href="/">Home</a>
          <a href="/me">Public</a>
          <a href="/admin/me/new">New Post</a>
          <button type="button" id="logout-button" class="link-button">Logout</button>
        </nav>
      </header>

      <section class="panel">
        <p id="admin-message" class="message" hidden></p>
        <div id="admin-list" class="admin-list"></div>
        <p id="admin-empty" class="empty" hidden>投稿はまだありません。</p>
      </section>
    </main>

    <script src="/assets/selfies-admin-list.js"></script>
    <script src="/assets/admin-logout.js"></script>
  </body>
</html>`;
}

export async function onRequestGet(context) {
  const authenticated = await isAuthenticated(context.request, context.env);
  const html = authenticated ? renderAdminPage() : renderLoginPage();

  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}
