(function () {
  var grid = document.getElementById("me-grid");
  var empty = document.getElementById("me-empty");

  if (!grid || !empty) {
    return;
  }

  fetch("/api/me", { headers: { accept: "application/json" } })
    .then(function (response) {
      if (!response.ok) {
        throw new Error("Failed to load posts.");
      }

      return response.json();
    })
    .then(function (data) {
      var items = Array.isArray(data.items) ? data.items : [];

      if (items.length === 0) {
        empty.hidden = false;
        return;
      }

      items.forEach(function (item) {
        var article = document.createElement("article");
        article.className = "gallery-card";

        if (item.image && item.image.imageUrl) {
          var image = document.createElement("img");
          image.src = item.image.imageUrl;
          image.alt = "Self portrait";
          image.loading = "lazy";
          article.appendChild(image);
        }
        grid.appendChild(article);
      });
    })
    .catch(function (error) {
      empty.hidden = false;
      empty.textContent = error.message || "Failed to load posts.";
    });
})();
