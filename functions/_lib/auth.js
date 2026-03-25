const SESSION_COOKIE_NAME = "admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14;

function textEncoder() {
  return new TextEncoder();
}

function toBase64Url(input) {
  const value = typeof input === "string" ? input : String.fromCharCode.apply(null, input);
  return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "===".slice((normalized.length + 3) % 4);
  return atob(padded);
}

function hexToBytes(hex) {
  const result = [];
  for (let index = 0; index < hex.length; index += 2) {
    result.push(parseInt(hex.slice(index, index + 2), 16));
  }
  return new Uint8Array(result);
}

function timingSafeEqual(left, right) {
  if (left.length !== right.length) {
    return false;
  }

  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return diff === 0;
}

function parseCookies(request) {
  const raw = request.headers.get("cookie") || "";
  return raw.split(/;\s*/).reduce(function (acc, part) {
    if (!part) {
      return acc;
    }

    const index = part.indexOf("=");
    if (index === -1) {
      return acc;
    }

    const key = part.slice(0, index);
    const value = part.slice(index + 1);
    acc[key] = value;
    return acc;
  }, {});
}

async function importHmacKey(secret) {
  return crypto.subtle.importKey(
    "raw",
    textEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

async function signValue(secret, value) {
  const key = await importHmacKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, textEncoder().encode(value));
  const bytes = new Uint8Array(signature);
  return Array.from(bytes)
    .map(function (byte) {
      return byte.toString(16).padStart(2, "0");
    })
    .join("");
}

export function getSessionConfig(env) {
  if (!env.ADMIN_PASSWORD || !env.SESSION_SECRET) {
    return {
      error: "Admin auth is not fully configured. Set ADMIN_PASSWORD and SESSION_SECRET."
    };
  }

  return null;
}

export async function createSessionCookie(env) {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const payload = JSON.stringify({ exp: expiresAt });
  const encodedPayload = toBase64Url(payload);
  const signature = await signValue(env.SESSION_SECRET, encodedPayload);
  const cookieValue = encodedPayload + "." + signature;

  return (
    SESSION_COOKIE_NAME +
    "=" +
    cookieValue +
    "; Max-Age=" +
    SESSION_TTL_SECONDS +
    "; Path=/; HttpOnly; Secure; SameSite=Lax"
  );
}

export function createLogoutCookie() {
  return (
    SESSION_COOKIE_NAME +
    "=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax"
  );
}

export async function isAuthenticated(request, env) {
  const configError = getSessionConfig(env);
  if (configError) {
    return false;
  }

  const cookies = parseCookies(request);
  const raw = cookies[SESSION_COOKIE_NAME];
  if (!raw) {
    return false;
  }

  const parts = raw.split(".");
  if (parts.length !== 2) {
    return false;
  }

  const payload = parts[0];
  const signature = parts[1];
  const expected = await signValue(env.SESSION_SECRET, payload);
  if (!timingSafeEqual(signature, expected)) {
    return false;
  }

  try {
    const session = JSON.parse(fromBase64Url(payload));
    if (!session.exp || Math.floor(Date.now() / 1000) >= session.exp) {
      return false;
    }
  } catch {
    return false;
  }

  return true;
}

export async function verifyPassword(password, env) {
  if (!env.ADMIN_PASSWORD) {
    return false;
  }

  return timingSafeEqual(password || "", env.ADMIN_PASSWORD);
}

export function unauthorizedJson(message) {
  return new Response(JSON.stringify({ error: message }, null, 2), {
    status: 401,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

export function redirectToLogin(request) {
  return Response.redirect(new URL("/admin/me", request.url).toString(), 302);
}
