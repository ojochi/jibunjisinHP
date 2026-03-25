(function () {
  var button = document.getElementById("logout-button");
  if (!button) {
    return;
  }

  button.addEventListener("click", function () {
    fetch("/api/admin/logout", {
      method: "POST"
    }).finally(function () {
      window.location.href = "/admin/me";
    });
  });
})();
