import {
  badRequest,
  getPostById,
  json,
  mapPost,
  nowIso,
  readMultipartSelfieRequest,
  saveImageToBucket,
  serverError
} from "../../../_lib/selfies.js";

export async function onRequestGet(context) {
  try {
    const { results } = await context.env.DB.prepare(
      `SELECT
        p.id,
        p.created_at,
        p.comment,
        p.source_type,
        p.source_post_id,
        p.source_permalink,
        p.updated_at,
        i.id AS image_id,
        i.image_key,
        i.image_url
      FROM posts p
      LEFT JOIN post_images i
        ON i.post_id = p.id
       AND i.sort_order = 1
      ORDER BY p.created_at DESC`
    ).all();

    return json({
      items: results.map(mapPost)
    });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

export async function onRequestPost(context) {
  try {
    const parsed = await readMultipartSelfieRequest(context.request, context.env, {
      requireImage: true
    });

    if (parsed.error) {
      return badRequest(parsed.error);
    }

    const now = nowIso();
    const postId = crypto.randomUUID();
    const image = await saveImageToBucket(context.env.SELFIES_BUCKET, parsed.value.image);

    await context.env.DB.prepare(
      `INSERT INTO posts (
        id,
        created_at,
        comment,
        source_type,
        source_post_id,
        source_permalink,
        updated_at
      ) VALUES (?, ?, ?, 'manual', NULL, NULL, ?)`
    )
      .bind(postId, now, parsed.value.comment, now)
      .run();

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
      .bind(crypto.randomUUID(), postId, image.key, image.url, now)
      .run();

    const post = await getPostById(context.env.DB, postId);
    return json({ item: post }, 201);
  } catch (error) {
    console.error(error);
    return serverError();
  }
}
