(function () {
  var grid = document.getElementById("me-grid");
  var empty = document.getElementById("me-empty");
  var pagination = document.getElementById("me-pagination");

  if (!grid || !empty || !pagination) {
    return;
  }

  var url = new URL(window.location.href);
  var pageParam = Number(url.searchParams.get("page") || "1");
  var currentPage = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;

  fetch("/api/me?page=" + currentPage, { headers: { accept: "application/json" } })
    .then(function (response) {
      if (!response.ok) {
        throw new Error("Failed to load posts.");
      }

      return response.json();
    })
    .then(function (data) {
      var items = Array.isArray(data.items) ? data.items : [];
      var paging = data.pagination || {};

      currentPage = Number(paging.page) || 1;

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

      renderPagination(
        currentPage,
        Number(paging.totalPages) || 1
      );
    })
    .catch(function (error) {
      empty.hidden = false;
      empty.textContent = error.message || "Failed to load posts.";
    });

  function renderPagination(page, totalPages) {
    if (totalPages <= 1) {
      pagination.hidden = true;
      return;
    }

    pagination.hidden = false;
    pagination.innerHTML = "";

    appendLink("Prev", page - 1, page <= 1);

    var startPage = Math.max(1, page - 2);
    var endPage = Math.min(totalPages, page + 2);

    if (startPage > 1) {
      appendLink("1", 1, false, page === 1);
      if (startPage > 2) {
        appendGap();
      }
    }

    for (var pageNumber = startPage; pageNumber <= endPage; pageNumber += 1) {
      appendLink(String(pageNumber), pageNumber, false, pageNumber === page);
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        appendGap();
      }
      appendLink(String(totalPages), totalPages, false, page === totalPages);
    }

    appendLink("Next", page + 1, page >= totalPages);
  }

  function appendLink(label, page, disabled, current) {
    if (disabled) {
      var span = document.createElement("span");
      span.className = "pagination-item disabled";
      span.textContent = label;
      pagination.appendChild(span);
      return;
    }

    if (current) {
      var currentSpan = document.createElement("span");
      currentSpan.className = "pagination-item current";
      currentSpan.textContent = label;
      pagination.appendChild(currentSpan);
      return;
    }

    var link = document.createElement("a");
    link.className = "pagination-item";
    link.href = page === 1 ? "/me" : "/me?page=" + page;
    link.textContent = label;
    pagination.appendChild(link);
  }

  function appendGap() {
    var span = document.createElement("span");
    span.className = "pagination-gap";
    span.textContent = "...";
    pagination.appendChild(span);
  }
})();
