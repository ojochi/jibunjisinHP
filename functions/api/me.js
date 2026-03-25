import { json, serverError } from "../_lib/selfies.js";

export async function onRequestGet(context) {
  try {
    const { results } = await context.env.DB.prepare(
      `SELECT
        p.id,
        p.created_at,
        i.id AS image_id,
        i.image_url
      FROM posts p
      LEFT JOIN post_images i
        ON i.post_id = p.id
       AND i.sort_order = 1
      ORDER BY p.created_at DESC`
    ).all();

    return json({
      items: results
        .filter(function (row) {
          return Boolean(row.image_url);
        })
        .map(function (row) {
          return {
            id: row.id,
            createdAt: row.created_at,
            image: {
              id: row.image_id,
              imageUrl: row.image_url
            }
          };
        })
    });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}
