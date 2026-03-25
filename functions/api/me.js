import { json, serverError } from "../_lib/selfies.js";

export async function onRequestGet(context) {
  try {
    const url = new URL(context.request.url);
    const pageParam = Number(url.searchParams.get("page") || "1");
    const pageSize = 100;
    const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;

    const countRow = await context.env.DB.prepare(
      `SELECT COUNT(*) AS count
      FROM posts p
      LEFT JOIN post_images i
        ON i.post_id = p.id
       AND i.sort_order = 1
      WHERE i.image_url IS NOT NULL`
    ).first();

    const totalItems = Number(countRow && countRow.count ? countRow.count : 0);
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const safePage = Math.min(page, totalPages);
    const safeOffset = (safePage - 1) * pageSize;

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
      WHERE i.image_url IS NOT NULL
      ORDER BY p.created_at DESC`
        + `
      LIMIT ? OFFSET ?`
    )
      .bind(pageSize, safeOffset)
      .all();

    return json({
      items: results
        .map(function (row) {
          return {
            id: row.id,
            createdAt: row.created_at,
            image: {
              id: row.image_id,
              imageUrl: row.image_url
            }
          };
        }),
      pagination: {
        page: safePage,
        pageSize,
        totalItems,
        totalPages
      }
    });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}
