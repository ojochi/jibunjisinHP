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
    <link rel="stylesheet" href="/assets/admin-gallery.css?v=1">
  </head>
  <body>
    <main class="shell">
      <header class="page-head">
        <div>
          <h1>写真を編集</h1>
        </div>
        <nav class="page-links">
          <a href="/">公開一覧を見る</a>
          <a href="/admin/me">写真の管理へ</a>
        </nav>
      </header>

      <section class="panel">
        <form id="selfie-form" class="selfie-form">
          <input type="hidden" name="mode" value="edit">

          <label class="field">
            <span>写真</span>
            <input type="file" name="image" accept="image/jpeg,image/png,image/webp">
            <small>画像を選ぶと差し替えます。未選択ならそのままです。</small>
          </label>

          <div class="preview-wrap">
            <img id="image-preview" class="image-preview" alt="" hidden>
          </div>

          <details id="note"><summary>ひとこと（任意）</summary>
            <textarea aria-label="ひとこと" name="comment" rows="3" maxlength="140"></textarea>
            <small><span id="comment-count">0</span>/140</small>
          </details>

          <p id="form-message" class="message" hidden></p>

          <div class="form-actions">
            <button type="submit" class="primary">変更を保存</button>
            <button type="button" id="share-button">X&#12395;&#20849;&#26377;</button>
            <button type="button" id="delete-button" class="danger">削除</button>
          </div>
        </form>
      </section>
    </main>

    <script>
      window.__SELFIE_FORM_MODE = "edit";
      window.__SELFIE_POST_ID = "${postId}";
    </script>
    <script src="/assets/selfies-form.js?v=3"></script>
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
