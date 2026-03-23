(function () {
  var items = Array.isArray(window.newsItems) ? window.newsItems : [];
  var list = document.getElementById("news-list");
  var empty = document.getElementById("news-empty");

  if (!list || !empty) {
    return;
  }

  if (items.length === 0) {
    empty.hidden = false;
    return;
  }

  items.forEach(function (item) {
    var entry = document.createElement("li");
    entry.className = "notice-item";

    var date = document.createElement("div");
    date.className = "notice-date";
    date.textContent = item.date || "";

    var text = document.createElement("p");
    text.className = "notice-text";
    text.textContent = item.text || "";

    entry.appendChild(date);
    entry.appendChild(text);
    list.appendChild(entry);
  });
})();
