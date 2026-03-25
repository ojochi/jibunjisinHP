(function () {
  var form = document.getElementById("admin-login-form");
  var message = document.getElementById("login-message");

  if (!form || !message) {
    return;
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    var password = form.elements.password.value;
    fetch("/api/admin/login", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({ password: password })
    })
      .then(function (response) {
        if (!response.ok) {
          return response.json().then(function (data) {
            throw new Error(data.error || "Login failed.");
          });
        }

        window.location.href = "/admin/me";
      })
      .catch(function (error) {
        message.hidden = false;
        message.className = "message error";
        message.textContent = error.message || "Login failed.";
      });
  });
})();
