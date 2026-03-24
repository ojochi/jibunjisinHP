import { json, mapPost, serverError } from "../_lib/selfies.js";

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
