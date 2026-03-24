(function () {
  var list = document.getElementById("admin-list");
  var empty = document.getElementById("admin-empty");
  var message = document.getElementById("admin-message");

  if (!list || !empty || !message) {
    return;
  }

  function showMessage(text, isError) {
    message.hidden = false;
    message.textContent = text;
    message.className = isError ? "message error" : "message";
  }

  function truncate(text) {
    return text.length > 60 ? text.slice(0, 60) + "..." : text;
  }

  function formatDate(value) {
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value || "";
    }

    return date.toLocaleString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function renderItem(item) {
    var row = document.createElement("article");
    row.className = "admin-row";

    var thumb = document.createElement("div");
    thumb.className = "admin-thumb";
    if (item.image && item.image.imageUrl) {
      var img = document.createElement("img");
      img.src = item.image.imageUrl;
      img.alt = item.comment || "Selfie thumbnail";
      img.loading = "lazy";
      thumb.appendChild(img);
    }

    var body = document.createElement("div");
    body.className = "admin-row-body";

    var head = document.createElement("div");
    head.className = "admin-row-head";

    var meta = document.createElement("div");
    meta.className = "card-meta";
    meta.textContent = formatDate(item.createdAt);
    head.appendChild(meta);

    var comment = document.createElement("p");
    comment.className = "admin-comment";
    comment.textContent = truncate(item.comment);

    var actions = document.createElement("div");
    actions.className = "admin-actions";

    var edit = document.createElement("a");
    edit.href = "/admin/me/" + item.id + "/edit";
    edit.textContent = "Edit";

    var remove = document.createElement("button");
    remove.type = "button";
    remove.className = "danger";
    remove.textContent = "Delete";
    remove.addEventListener("click", function () {
      var confirmed = window.confirm("Delete this post?");
      if (!confirmed) {
        return;
      }

      fetch("/api/admin/me/" + item.id, { method: "DELETE" })
        .then(function (response) {
          if (!response.ok) {
            return response.json().then(function (data) {
              throw new Error(data.error || "Delete failed.");
            });
          }

          row.remove();
          if (!list.children.length) {
            empty.hidden = false;
          }
          showMessage("Post deleted.", false);
        })
        .catch(function (error) {
          showMessage(error.message || "Delete failed.", true);
        });
    });

    actions.appendChild(edit);
    actions.appendChild(remove);

    body.appendChild(head);
    body.appendChild(comment);
    body.appendChild(actions);

    row.appendChild(thumb);
    row.appendChild(body);
    list.appendChild(row);
  }

  fetch("/api/admin/me", { headers: { accept: "application/json" } })
    .then(function (response) {
      if (!response.ok) {
        return response.json().then(function (data) {
          throw new Error(data.error || "Failed to load posts.");
        });
      }

      return response.json();
    })
    .then(function (data) {
      var items = Array.isArray(data.items) ? data.items : [];

      if (!items.length) {
        empty.hidden = false;
        return;
      }

      items.forEach(renderItem);
    })
    .catch(function (error) {
      showMessage(error.message || "Failed to load posts.", true);
    });
})();
