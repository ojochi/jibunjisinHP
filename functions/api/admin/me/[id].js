import {
  badRequest,
  getPostById,
  json,
  notFound,
  nowIso,
  readMultipartSelfieRequest,
  saveImageToBucket,
  serverError
} from "../../../_lib/selfies.js";

export async function onRequestGet(context) {
  try {
    const post = await getPostById(context.env.DB, context.params.id);
    if (!post) {
      return notFound();
    }

    return json({ item: post });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

export async function onRequestPut(context) {
  try {
    const existing = await getPostById(context.env.DB, context.params.id);
    if (!existing) {
      return notFound();
    }

    const parsed = await readMultipartSelfieRequest(context.request, context.env, {
      requireImage: false
    });

    if (parsed.error) {
      return badRequest(parsed.error);
    }

    const now = nowIso();
    await context.env.DB.prepare(
      `UPDATE posts
          SET comment = ?,
              updated_at = ?
        WHERE id = ?`
    )
      .bind(parsed.value.comment, now, existing.id)
      .run();

    if (parsed.value.image) {
      const image = await saveImageToBucket(context.env.SELFIES_BUCKET, parsed.value.image);

      if (existing.image && existing.image.imageKey) {
        await context.env.SELFIES_BUCKET.delete(existing.image.imageKey);
      }

      await context.env.DB.prepare("DELETE FROM post_images WHERE post_id = ?").bind(existing.id).run();
      await context.env.DB.prepare(
        `INSERT INTO post_images (
          id,
          post_id,
          image_key,
          image_url,
          sort_order,
          created_at
        ) VALUES (?, ?, ?, ?, 1, ?)`
      )
        .bind(crypto.randomUUID(), existing.id, image.key, image.url, now)
        .run();
    }

    const post = await getPostById(context.env.DB, existing.id);
    return json({ item: post });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

export async function onRequestDelete(context) {
  try {
    const existing = await getPostById(context.env.DB, context.params.id);
    if (!existing) {
      return notFound();
    }

    if (existing.image && existing.image.imageKey) {
      await context.env.SELFIES_BUCKET.delete(existing.image.imageKey);
    }

    await context.env.DB.prepare("DELETE FROM post_images WHERE post_id = ?").bind(existing.id).run();
    await context.env.DB.prepare("DELETE FROM posts WHERE id = ?").bind(existing.id).run();

    return json({ ok: true });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}
