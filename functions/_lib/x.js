const X_MEDIA_UPLOAD_URL = "https://upload.twitter.com/1.1/media/upload.json";
const X_CREATE_POST_URL = "https://api.x.com/2/tweets";

const REQUIRED_SECRET_NAMES = [
  "X_API_KEY",
  "X_API_SECRET",
  "X_ACCESS_TOKEN",
  "X_ACCESS_TOKEN_SECRET"
];

export function getXPostConfigStatus(env) {
  const missing = REQUIRED_SECRET_NAMES.filter((name) => !hasUsableSecret(env[name]));
  return {
    configured: missing.length === 0,
    missing
  };
}

function hasUsableSecret(value) {
  if (!value) {
    return false;
  }

  const normalized = String(value).trim();
  return normalized !== "" && !normalized.startsWith("replace-with-");
}

export async function publishSelfieToX(env, post, imageFile) {
  const config = getXPostConfigStatus(env);
  if (!config.configured) {
    return {
      status: "skipped",
      reason: "X posting is not configured.",
      missing: config.missing
    };
  }

  const media = await uploadImageToX(env, imageFile);
  const text = buildPostText(env, post);
  const xPost = await createXPost(env, text, media.mediaId);

  return {
    status: "posted",
    id: xPost.id,
    url: buildXPostUrl(env, xPost.id)
  };
}

function buildPostText(env, post) {
  const pieces = [post.comment];
  const publicUrl = buildPublicGalleryUrl(env);
  if (publicUrl) {
    pieces.push(publicUrl);
  }

  return pieces.join("\n").slice(0, 280);
}

function buildPublicGalleryUrl(env) {
  if (!env.PUBLIC_SITE_URL) {
    return "";
  }

  try {
    return new URL("/me", env.PUBLIC_SITE_URL).toString();
  } catch {
    return "";
  }
}

function buildXPostUrl(env, postId) {
  if (!postId) {
    return "";
  }

  const username = (env.X_USERNAME || "").trim().replace(/^@/, "");
  if (!username) {
    return "https://x.com/i/web/status/" + postId;
  }

  return "https://x.com/" + encodeURIComponent(username) + "/status/" + postId;
}

async function uploadImageToX(env, imageFile) {
  const body = new FormData();
  body.set("media", imageFile, imageFile.name || "selfie.jpg");
  body.set("media_category", "tweet_image");

  const response = await fetch(X_MEDIA_UPLOAD_URL, {
    method: "POST",
    headers: {
      authorization: await buildOAuthHeader(env, "POST", X_MEDIA_UPLOAD_URL)
    },
    body
  });

  const payload = await readJsonResponse(response);
  if (!response.ok) {
    throw new Error("X media upload failed: " + getXErrorMessage(payload));
  }

  const mediaId = payload.media_id_string || (payload.media_id ? String(payload.media_id) : "");
  if (!mediaId) {
    throw new Error("X media upload failed: missing media id.");
  }

  return { mediaId };
}

async function createXPost(env, text, mediaId) {
  const body = {
    text,
    media: {
      media_ids: [mediaId]
    }
  };

  const response = await fetch(X_CREATE_POST_URL, {
    method: "POST",
    headers: {
      authorization: await buildOAuthHeader(env, "POST", X_CREATE_POST_URL),
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });

  const payload = await readJsonResponse(response);
  if (!response.ok) {
    throw new Error("X post failed: " + getXErrorMessage(payload));
  }

  const id = payload && payload.data && payload.data.id;
  if (!id) {
    throw new Error("X post failed: missing post id.");
  }

  return { id };
}

async function readJsonResponse(response) {
  const text = await response.text();
  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

function getXErrorMessage(payload) {
  if (!payload || typeof payload !== "object") {
    return "Unknown error";
  }

  if (Array.isArray(payload.errors) && payload.errors.length) {
    return payload.errors.map(formatXError).join("; ");
  }

  if (payload.detail) {
    return payload.detail;
  }

  if (payload.title) {
    return payload.title;
  }

  if (payload.message) {
    return payload.message;
  }

  return "Unknown error";
}

function formatXError(error) {
  if (!error || typeof error !== "object") {
    return String(error);
  }

  return error.message || error.detail || error.title || JSON.stringify(error);
}

async function buildOAuthHeader(env, method, url) {
  const oauthParams = {
    oauth_consumer_key: env.X_API_KEY,
    oauth_nonce: crypto.randomUUID().replaceAll("-", ""),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: String(Math.floor(Date.now() / 1000)),
    oauth_token: env.X_ACCESS_TOKEN,
    oauth_version: "1.0"
  };

  oauthParams.oauth_signature = await signOAuthRequest(env, method, url, oauthParams);

  return (
    "OAuth " +
    Object.keys(oauthParams)
      .sort()
      .map((key) => encodeOAuth(key) + '="' + encodeOAuth(oauthParams[key]) + '"')
      .join(", ")
  );
}

async function signOAuthRequest(env, method, url, oauthParams) {
  const parsedUrl = new URL(url);
  const signatureParams = [];

  for (const [key, value] of parsedUrl.searchParams.entries()) {
    signatureParams.push([key, value]);
  }

  Object.entries(oauthParams).forEach(([key, value]) => {
    signatureParams.push([key, value]);
  });

  signatureParams.sort(([leftKey, leftValue], [rightKey, rightValue]) => {
    const encodedLeft = encodeOAuth(leftKey) + "=" + encodeOAuth(leftValue);
    const encodedRight = encodeOAuth(rightKey) + "=" + encodeOAuth(rightValue);
    return encodedLeft.localeCompare(encodedRight);
  });

  const normalizedParams = signatureParams
    .map(([key, value]) => encodeOAuth(key) + "=" + encodeOAuth(value))
    .join("&");

  const normalizedUrl = parsedUrl.origin + parsedUrl.pathname;
  const signatureBase = [
    method.toUpperCase(),
    encodeOAuth(normalizedUrl),
    encodeOAuth(normalizedParams)
  ].join("&");

  const signingKey = encodeOAuth(env.X_API_SECRET) + "&" + encodeOAuth(env.X_ACCESS_TOKEN_SECRET);
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(signingKey),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signatureBase));

  return bytesToBase64(new Uint8Array(signature));
}

function encodeOAuth(value) {
  return encodeURIComponent(String(value))
    .replaceAll("!", "%21")
    .replaceAll("'", "%27")
    .replaceAll("(", "%28")
    .replaceAll(")", "%29")
    .replaceAll("*", "%2A");
}

function bytesToBase64(bytes) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary);
}
