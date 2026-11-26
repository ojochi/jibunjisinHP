import { isAuthenticated } from "../../_lib/auth.js";

function renderLoginPage() {
  return `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Admin Login</title>
    <link rel="stylesheet" href="/assets/admin-gallery.css?v=1">
  </head>
  <body>
    <main class="shell">
      <header class="page-head">
        <div>
          <h1>ログイン</h1>
        </div>
        <nav class="page-links">
          <a href="/">公開一覧を見る</a>
        </nav>
      </header>

      <section class="panel">
        <form id="admin-login-form" class="selfie-form">
          <label class="field">
            <span>パスワード</span>
            <input type="password" name="password" autocomplete="current-password" required>
          </label>

          <p id="login-message" class="message" hidden></p>

          <div class="form-actions">
            <button type="submit" class="primary">ログイン</button>
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
    <link rel="stylesheet" href="/assets/admin-gallery.css?v=1">
  </head>
  <body>
    <main class="shell">
      <header class="page-head">
        <div>
          <h1>写真の管理</h1>
        </div>
        <nav class="page-links">
          <a href="/">公開一覧を見る</a>
          <a href="/admin/me/new">写真を投稿</a>
          <button type="button" id="logout-button" class="link-button">ログアウト</button>
        </nav>
      </header>

      <section class="panel">
        <p id="admin-message" class="message" hidden></p>
        <nav class="pages" aria-label="上部ページ選択"></nav>
        <div id="admin-list" class="admin-list"></div>
        <nav class="pages" aria-label="下部ページ選択"></nav>
        <p id="admin-empty" class="empty" hidden>投稿はまだありません。</p>
      </section>
    </main>

    <script src="/assets/selfies-admin-list.js?v=3"></script>
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
