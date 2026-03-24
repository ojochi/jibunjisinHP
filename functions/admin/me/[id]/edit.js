import { escapeHtml } from "../../../_lib/selfies.js";

export function onRequestGet(context) {
  const postId = escapeHtml(context.params.id);

  return new Response(
    `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Edit me Post</title>
    <link rel="stylesheet" href="/assets/selfies.css">
  </head>
  <body>
    <main class="shell">
      <header class="page-head">
        <div>
          <p class="eyebrow">Admin</p>
          <h1>自撮り投稿を編集</h1>
        </div>
        <nav class="page-links">
          <a href="/">Home</a>
          <a href="/me">Public</a>
          <a href="/admin/me">Admin List</a>
        </nav>
      </header>

      <section class="panel">
        <form id="selfie-form" class="selfie-form" novalidate>
          <input type="hidden" name="mode" value="edit">

          <label class="field">
            <span>Image</span>
            <input type="file" name="image" accept="image/jpeg,image/png,image/webp">
            <small>画像を選ぶと差し替えます。未選択ならそのままです。</small>
          </label>

          <div class="preview-wrap">
            <img id="image-preview" class="image-preview" alt="" hidden>
          </div>

          <label class="field">
            <span>Comment</span>
            <textarea name="comment" rows="4" maxlength="140" required></textarea>
            <small><span id="comment-count">0</span>/140</small>
          </label>

          <p id="form-message" class="message" hidden></p>

          <div class="form-actions">
            <button type="submit" class="primary">Save</button>
            <button type="button" id="delete-button" class="danger">Delete</button>
          </div>
        </form>
      </section>
    </main>

    <script>
      window.__SELFIE_FORM_MODE = "edit";
      window.__SELFIE_POST_ID = "${postId}";
    </script>
    <script src="/assets/selfies-form.js"></script>
  </body>
</html>`,
    {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store"
      }
    }
  );
}
