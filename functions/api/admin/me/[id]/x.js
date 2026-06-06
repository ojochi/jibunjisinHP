import { getPostById, json, notFound, serverError } from "../../../../_lib/selfies.js";
import { publishSelfieToX } from "../../../../_lib/x.js";

export async function onRequestPost(context) {
  try {
    const post = await getPostById(context.env.DB, context.params.id);
    if (!post || !post.image || !post.image.imageKey) {
      return notFound();
    }

    const object = await context.env.SELFIES_BUCKET.get(post.image.imageKey);
    if (!object) {
      return notFound("Image not found");
    }

    const contentType = object.httpMetadata && object.httpMetadata.contentType;
    const image = new File([await object.arrayBuffer()], post.image.imageKey, {
      type: contentType || "image/jpeg"
    });
    const xPost = await publishSelfieToX(context.env, post, image);

    if (xPost.status === "skipped") {
      return json({ error: xPost.reason, missing: xPost.missing }, 503);
    }

    return json({ xPost });
  } catch (error) {
    console.error(error);
    return serverError(error.message || "X posting failed.");
  }
}
