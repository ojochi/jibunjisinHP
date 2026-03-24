const CERTS_CACHE_TTL_MS = 5 * 60 * 1000;

let certsCache = {
  expiresAt: 0,
  keys: []
};

function extractJwt(request) {
  return request.headers.get("Cf-Access-Jwt-Assertion") || "";
}

function base64UrlDecode(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/").replace(/\s/g, "");
  return new Uint8Array(
    Array.from(atob(normalized)).map(function (character) {
      return character.charCodeAt(0);
    })
  );
}

function asciiToUint8Array(value) {
  const chars = [];
  for (let index = 0; index < value.length; index += 1) {
    chars.push(value.charCodeAt(index));
  }
  return new Uint8Array(chars);
}

async function importSigningKey(jwk) {
  return crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"]
  );
}

async function getCachedKeys(domain) {
  const now = Date.now();
  if (certsCache.expiresAt > now && certsCache.keys.length) {
    return certsCache.keys;
  }

  const response = await fetch(new URL("/cdn-cgi/access/certs", domain).toString(), {
    cf: {
      cacheTtl: 300,
      cacheEverything: true
    }
  });

  if (!response.ok) {
    throw new Error("Cloudflare Access signing keys could not be fetched.");
  }

  const data = await response.json();
  const keys = Array.isArray(data.keys) ? data.keys : [];

  certsCache = {
    expiresAt: now + CERTS_CACHE_TTL_MS,
    keys
  };

  return keys;
}

async function getSigningKey(domain, kid) {
  const keys = await getCachedKeys(domain);

  const jwk = keys.find(function (candidate) {
    return candidate.kid === kid;
  });

  if (!jwk || jwk.kty !== "RSA" || jwk.alg !== "RS256") {
    throw new Error("Cloudflare Access signing key could not be resolved.");
  }

  return importSigningKey(jwk);
}

export async function validateAccessJwt(request, env) {
  const jwt = extractJwt(request);
  const parts = jwt.split(".");
  if (parts.length !== 3) {
    throw new Error("Missing Cloudflare Access JWT.");
  }

  const decoder = new TextDecoder("utf-8");
  const header = JSON.parse(decoder.decode(base64UrlDecode(parts[0])));
  const payload = JSON.parse(decoder.decode(base64UrlDecode(parts[1])));

  if (header.alg !== "RS256") {
    throw new Error("Unsupported Cloudflare Access JWT algorithm.");
  }

  const signingKey = await getSigningKey(env.ACCESS_TEAM_DOMAIN, header.kid);
  const verified = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    signingKey,
    base64UrlDecode(parts[2]),
    asciiToUint8Array(parts[0] + "." + parts[1])
  );

  if (!verified) {
    throw new Error("Cloudflare Access JWT verification failed.");
  }

  const now = Date.now() / 1000;
  const issuer = new URL("/cdn-cgi/access/certs", env.ACCESS_TEAM_DOMAIN).origin;
  const audList = Array.isArray(payload.aud) ? payload.aud : [payload.aud];

  if (payload.iss !== issuer) {
    throw new Error("Cloudflare Access JWT issuer mismatch.");
  }

  if (!audList.includes(env.ACCESS_AUD)) {
    throw new Error("Cloudflare Access JWT audience mismatch.");
  }

  if (payload.exp && Math.floor(now) >= payload.exp) {
    throw new Error("Cloudflare Access JWT expired.");
  }

  if (payload.nbf && Math.ceil(now) < payload.nbf) {
    throw new Error("Cloudflare Access JWT not yet valid.");
  }

  return payload;
}
