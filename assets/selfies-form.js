(function () {
  var form = document.getElementById("selfie-form");
  var message = document.getElementById("form-message");
  var preview = document.getElementById("image-preview");
  var commentCount = document.getElementById("comment-count");

  if (!form || !message) {
    return;
  }

  var mode = window.__SELFIE_FORM_MODE || "new";
  var postId = window.__SELFIE_POST_ID || "";
  var imageInput = form.elements.image;
  var commentInput = form.elements.comment;
  var deleteButton = document.getElementById("delete-button");

  function showMessage(text, isError) {
    message.hidden = false;
    message.textContent = text;
    message.className = isError ? "message error" : "message";
  }

  function setPreview(src, alt) {
    if (!preview) {
      return;
    }

    if (!src) {
      preview.hidden = true;
      preview.removeAttribute("src");
      return;
    }

    preview.src = src;
    preview.alt = alt || "";
    preview.hidden = false;
  }

  function updateCommentCount() {
    if (commentCount) {
      commentCount.textContent = String(commentInput.value.length);
    }
  }

  updateCommentCount();
  commentInput.addEventListener("input", updateCommentCount);

  imageInput.addEventListener("change", function () {
    var file = imageInput.files && imageInput.files[0];
    if (!file) {
      return;
    }

    var url = URL.createObjectURL(file);
    setPreview(url, commentInput.value || "Selected image");
  });

  function compressImage(file) {
    var mimeType = file.type === "image/png" ? "image/png" : "image/jpeg";
    var quality = mimeType === "image/png" ? undefined : 0.86;

    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onerror = function () {
        reject(new Error("Failed to read image."));
      };

      reader.onload = function () {
        var image = new Image();
        image.onerror = function () {
          reject(new Error("Failed to load image."));
        };
        image.onload = function () {
          var maxSide = 1600;
          var width = image.width;
          var height = image.height;
          var longest = Math.max(width, height);

          if (longest > maxSide) {
            var scale = maxSide / longest;
            width = Math.round(width * scale);
            height = Math.round(height * scale);
          }

          var canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;

          var context = canvas.getContext("2d");
          context.drawImage(image, 0, 0, width, height);

          canvas.toBlob(
            function (blob) {
              if (!blob) {
                reject(new Error("Failed to compress image."));
                return;
              }

              var extension = mimeType === "image/png" ? "png" : "jpg";
              resolve(new File([blob], "upload." + extension, { type: mimeType }));
            },
            mimeType,
            quality
          );
        };
        image.src = reader.result;
      };

      reader.readAsDataURL(file);
    });
  }

  function loadExistingPost() {
    if (mode !== "edit" || !postId) {
      return Promise.resolve();
    }

    return fetch("/api/admin/me/" + postId, { headers: { accept: "application/json" } })
      .then(function (response) {
        if (!response.ok) {
          return response.json().then(function (data) {
            throw new Error(data.error || "Failed to load post.");
          });
        }

        return response.json();
      })
      .then(function (data) {
        var item = data.item;
        commentInput.value = item.comment || "";
        updateCommentCount();

        if (item.image && item.image.imageUrl) {
          setPreview(item.image.imageUrl, item.comment || "Current image");
        }
      })
      .catch(function (error) {
        showMessage(error.message || "Failed to load post.", true);
      });
  }

  form.addEventListener("submit", async function (event) {
    event.preventDefault();

    var body = new FormData();
    body.set("comment", commentInput.value);

    if (imageInput.files && imageInput.files[0]) {
      try {
        body.set("image", await compressImage(imageInput.files[0]));
      } catch (error) {
        showMessage(error.message || "Image processing failed.", true);
        return;
      }
    }

    var url = mode === "edit" ? "/api/admin/me/" + postId : "/api/admin/me";
    var method = mode === "edit" ? "PUT" : "POST";

    fetch(url, {
      method: method,
      body: body
    })
      .then(function (response) {
        if (!response.ok) {
          return response.json().then(function (data) {
            throw new Error(data.error || "Save failed.");
          });
        }

        return response.json();
      })
      .then(function (data) {
        var item = data.item;
        showMessage(mode === "edit" ? "Post updated." : "Post created.", false);

        if (mode === "new" && item && item.id) {
          window.location.href = "/admin/me/" + item.id + "/edit";
        }
      })
      .catch(function (error) {
        showMessage(error.message || "Save failed.", true);
      });
  });

  if (deleteButton && postId) {
    deleteButton.addEventListener("click", function () {
      var confirmed = window.confirm("Delete this post?");
      if (!confirmed) {
        return;
      }

      fetch("/api/admin/me/" + postId, { method: "DELETE" })
        .then(function (response) {
          if (!response.ok) {
            return response.json().then(function (data) {
              throw new Error(data.error || "Delete failed.");
            });
          }

          window.location.href = "/admin/me";
        })
        .catch(function (error) {
          showMessage(error.message || "Delete failed.", true);
        });
    });
  }

  loadExistingPost();
})();
