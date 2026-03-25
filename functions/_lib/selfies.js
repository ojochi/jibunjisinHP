const ALLOWED_MIME_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp"
};

const MAX_COMMENT_LENGTH = 140;

export function adminAccessErrorResponse(request, message, status = 403) {
  const pathname = new URL(request.url).pathname;
  if (pathname.startsWith("/api/")) {
    return json({ error: message }, status);
  }

  return new Response(message, {
    status,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

export function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

export function badRequest(message) {
  return json({ error: message }, 400);
}

export function notFound(message = "Not found") {
  return json({ error: message }, 404);
}

export function serverError(message = "Internal server error") {
  return json({ error: message }, 500);
}

export function nowIso() {
  return new Date().toISOString();
}

export function validateCommonFields(fields) {
  const comment = typeof fields.comment === "string" ? fields.comment.trim() : "";

  if (!comment) {
    return { error: "comment is required." };
  }

  if (comment.length > MAX_COMMENT_LENGTH) {
    return { error: "comment must be 140 characters or fewer." };
  }

  return {
    value: {
      comment
    }
  };
}

export async function readMultipartSelfieRequest(request, env, options) {
  const formData = await request.formData();
  const common = validateCommonFields({
    comment: formData.get("comment")
  });

  if (common.error) {
    return { error: common.error };
  }

  const image = formData.get("image");
  const imageResult = await validateImageFile(image, env, options.requireImage);
  if (imageResult.error) {
    return { error: imageResult.error };
  }

  return {
    value: {
      ...common.value,
      image: imageResult.value
    }
  };
}

async function validateImageFile(file, env, requireImage) {
  if (!(file instanceof File) || file.size === 0) {
    if (requireImage) {
      return { error: "image is required." };
    }

    return { value: null };
  }

  const maxUploadBytes = Number(env.MAX_UPLOAD_BYTES || "8388608");
  if (!Number.isFinite(maxUploadBytes) || maxUploadBytes <= 0) {
    return { error: "MAX_UPLOAD_BYTES is invalid." };
  }

  if (!ALLOWED_MIME_TYPES[file.type]) {
    return { error: "image must be jpg, jpeg, png, or webp." };
  }

  if (file.size > maxUploadBytes) {
    return { error: "image is too large." };
  }

  return {
    value: {
      file,
      extension: ALLOWED_MIME_TYPES[file.type]
    }
  };
}

export function buildImageUrl(imageKey) {
  return "/media/me/" + imageKey;
}

export async function saveImageToBucket(bucket, imageUpload) {
  const imageId = crypto.randomUUID();
  const imageKey = imageId + "." + imageUpload.extension;

  await bucket.put(imageKey, await imageUpload.file.arrayBuffer(), {
    httpMetadata: {
      contentType: imageUpload.file.type
    }
  });

  return {
    id: imageId,
    key: imageKey,
    url: buildImageUrl(imageKey)
  };
}

export function isSupportedImageKey(imageKey) {
  return /^[a-f0-9-]+\.(jpg|png|webp)$/i.test(imageKey);
}

export async function getPostById(db, id) {
  const post = await db
    .prepare(
      `SELECT
        p.id,
        p.comment,
        p.source_type,
        p.source_post_id,
        p.source_permalink,
        p.created_at,
        p.updated_at,
        i.id AS image_id,
        i.image_key,
        i.image_url
      FROM posts p
      LEFT JOIN post_images i
        ON i.post_id = p.id
       AND i.sort_order = 1
      WHERE p.id = ?`
    )
    .bind(id)
    .first();

  if (!post) {
    return null;
  }

  return mapPost(post);
}

export function mapPost(row) {
  return {
    id: row.id,
    createdAt: row.created_at,
    comment: row.comment,
    sourceType: row.source_type,
    sourcePostId: row.source_post_id,
    sourcePermalink: row.source_permalink,
    updatedAt: row.updated_at,
    image: row.image_key
      ? {
          id: row.image_id,
          imageKey: row.image_key,
          imageUrl: row.image_url
        }
      : null
  };
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
