import { isSupportedImageKey } from "../../_lib/selfies.js";

export async function onRequestGet(context) {
  if (!isSupportedImageKey(context.params.key)) {
    return new Response("Not found", { status: 404 });
  }

  const object = await context.env.SELFIES_BUCKET.get(context.params.key);
  if (!object) {
    return new Response("Not found", { status: 404 });
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "public, max-age=31536000, immutable");

  return new Response(object.body, {
    headers
  });
}
