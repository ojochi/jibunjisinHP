(function () {
  var grid = document.getElementById("me-grid");
  var empty = document.getElementById("me-empty");
  var pagination = document.getElementById("me-pagination");

  if (!grid || !empty || !pagination) {
    return;
  }

  var url = new URL(window.location.href);
  var pageParam = Number(url.searchParams.get("page") || "1");
  var requestedPage = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;

  fetch("/api/me?page=" + requestedPage, { headers: { accept: "application/json" } })
    .then(function (response) {
      if (!response.ok) {
        throw new Error("Failed to load posts.");
      }

      return response.json();
    })
    .then(function (data) {
      var items = Array.isArray(data.items) ? data.items : [];
      var paging = data.pagination || {};
      var currentPage = Number(paging.page) || 1;
      var totalPages = Number(paging.totalPages) || 1;

      if (items.length === 0) {
        empty.hidden = false;
        return;
      }

      items.forEach(function (item) {
        if (!item.image || !item.image.imageUrl) {
          return;
        }

        var article = document.createElement("article");
        article.className = "gallery-card";

        var image = document.createElement("img");
        image.src = item.image.imageUrl;
        image.alt = "Self portrait";
        image.loading = "lazy";
        article.appendChild(image);

        grid.appendChild(article);
      });

      renderPagination(currentPage, totalPages);
    })
    .catch(function (error) {
      empty.hidden = false;
      empty.textContent = error.message || "Failed to load posts.";
    });

  function renderPagination(currentPage, totalPages) {
    pagination.innerHTML = "";

    if (totalPages <= 1) {
      pagination.hidden = true;
      return;
    }

    pagination.hidden = false;

    appendLink("‹", currentPage - 1, currentPage <= 1, false, "前のページ");

    var startPage = Math.max(1, currentPage - 2);
    var endPage = Math.min(totalPages, currentPage + 2);

    if (startPage > 1) {
      appendLink("1", 1, false, currentPage === 1, "1ページ");
      if (startPage > 2) {
        appendGap();
      }
    }

    for (var pageNumber = startPage; pageNumber <= endPage; pageNumber += 1) {
      appendLink(
        String(pageNumber),
        pageNumber,
        false,
        pageNumber === currentPage,
        pageNumber + "ページ"
      );
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        appendGap();
      }
      appendLink(
        String(totalPages),
        totalPages,
        false,
        currentPage === totalPages,
        totalPages + "ページ"
      );
    }

    appendLink("›", currentPage + 1, currentPage >= totalPages, false, "次のページ");
  }

  function appendLink(label, page, disabled, current, ariaLabel) {
    if (disabled || current) {
      var span = document.createElement("span");
      span.className = "pagination-item" + (current ? " current" : " disabled");
      span.textContent = label;
      pagination.appendChild(span);
      return;
    }

    var link = document.createElement("a");
    link.className = "pagination-item";
    link.href = page === 1 ? "/me" : "/me?page=" + page;
    link.textContent = label;
    link.setAttribute("aria-label", ariaLabel || label);
    pagination.appendChild(link);
  }

  function appendGap() {
    var span = document.createElement("span");
    span.className = "pagination-gap";
    span.textContent = "...";
    pagination.appendChild(span);
  }
})();
