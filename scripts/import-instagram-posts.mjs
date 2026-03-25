import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const rootDir = process.cwd();
const exportDir = path.join(rootDir, "your_instagram_activity", "media");
const sourceMediaDir = path.join(rootDir, "media");
const targetMediaDir = path.join(rootDir, "instagram-media");
const sqlOutputPath = path.join(rootDir, "scripts", "instagram-import.sql");
const reportPath = path.join(rootDir, "scripts", "instagram-import-report.json");

const imageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".heic"]);
const videoExtensions = new Set([".mp4"]);

function normalizeSlashes(value) {
  return value.replaceAll("\\", "/");
}

function escapeSql(value) {
  return String(value).replaceAll("'", "''");
}

function detectImageFormat(buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "jpg";
  }

  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return "png";
  }

  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString() === "RIFF" &&
    buffer.subarray(8, 12).toString() === "WEBP"
  ) {
    return "webp";
  }

  if (
    buffer.length >= 12 &&
    buffer.subarray(4, 8).toString() === "ftyp" &&
    (buffer.subarray(8, 12).toString().startsWith("heic") ||
      buffer.subarray(8, 12).toString().startsWith("mif1"))
  ) {
    return "heic";
  }

  return "";
}

async function readJson(fileName) {
  const raw = await fs.readFile(path.join(exportDir, fileName), "utf8");
  return JSON.parse(raw);
}

function collectItems(posts, archived) {
  const items = [];

  for (const entry of posts) {
    const medias = Array.isArray(entry.media) ? entry.media : [];
    for (const media of medias) {
      items.push({
        uri: media.uri || "",
        creationTimestamp: media.creation_timestamp || 0
      });
    }
  }

  for (const entry of archived.ig_archived_post_media || []) {
    const medias = Array.isArray(entry.media) ? entry.media : [];
    for (const media of medias) {
      items.push({
        uri: media.uri || "",
        creationTimestamp: media.creation_timestamp || entry.creation_timestamp || 0
      });
    }
  }

  return items;
}

async function ensureDir(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

async function relocateImage(uri) {
  const sourcePath = path.join(rootDir, ...uri.split("/"));
  const relativeWithinMedia = uri.slice("media/".length);
  const parsed = path.parse(relativeWithinMedia);
  const outputBase = path.join(targetMediaDir, parsed.dir, parsed.name);

  try {
    await fs.access(sourcePath);
  } catch {
    for (const ext of [".jpg", ".jpeg", ".png", ".webp"]) {
      const existingPath = outputBase + ext;
      try {
        await fs.access(existingPath);
        return normalizeSlashes(path.relative(rootDir, existingPath));
      } catch {}
    }
    return "";
  }

  const ext = parsed.ext.toLowerCase();
  if (ext !== ".heic") {
    const destinationPath = path.join(targetMediaDir, relativeWithinMedia);
    await ensureDir(destinationPath);
    await fs.rename(sourcePath, destinationPath);
    return normalizeSlashes(path.relative(rootDir, destinationPath));
  }

  const buffer = await fs.readFile(sourcePath);
  const detected = detectImageFormat(buffer);
  if (!detected || detected === "heic") {
    return "";
  }

  const destinationPath = outputBase + "." + detected;
  await ensureDir(destinationPath);
  await fs.writeFile(destinationPath, buffer);
  await fs.unlink(sourcePath);
  return normalizeSlashes(path.relative(rootDir, destinationPath));
}

function makeSql(rows) {
  const statements = [
    "PRAGMA foreign_keys = ON;",
    "DELETE FROM post_images WHERE post_id IN (SELECT id FROM posts WHERE source_type = 'instagram_import');",
    "DELETE FROM posts WHERE source_type = 'instagram_import';"
  ];

  for (const row of rows) {
    statements.push(
      `INSERT INTO posts (id, created_at, comment, source_type, source_post_id, source_permalink, updated_at) VALUES ('${escapeSql(
        row.postId
      )}', '${escapeSql(row.createdAt)}', '', 'instagram_import', '${escapeSql(
        row.sourcePostId
      )}', NULL, '${escapeSql(row.createdAt)}');`
    );
    statements.push(
      `INSERT INTO post_images (id, post_id, image_key, image_url, sort_order, created_at) VALUES ('${escapeSql(
        row.imageId
      )}', '${escapeSql(row.postId)}', '${escapeSql(row.imageKey)}', '${escapeSql(
        row.imageUrl
      )}', 1, '${escapeSql(row.createdAt)}');`
    );
  }

  return statements.join("\n");
}

async function main() {
  const posts = await readJson("posts_1.json");
  const archived = await readJson("archived_posts.json");
  const items = collectItems(posts, archived);
  const rows = [];
  const report = {
    totalEntries: items.length,
    importedImages: 0,
    skippedVideos: 0,
    skippedMissingUri: 0,
    skippedUnsupported: 0
  };

  for (const item of items) {
    if (!item.uri) {
      report.skippedMissingUri += 1;
      continue;
    }

    const ext = path.extname(item.uri).toLowerCase();
    if (videoExtensions.has(ext)) {
      report.skippedVideos += 1;
      continue;
    }

    if (!imageExtensions.has(ext)) {
      report.skippedUnsupported += 1;
      continue;
    }

    const finalRelativePath = await relocateImage(item.uri);
    if (!finalRelativePath) {
      report.skippedUnsupported += 1;
      continue;
    }

    const postId = crypto.randomUUID();
    const imageId = crypto.randomUUID();
    const createdAt = new Date(item.creationTimestamp * 1000).toISOString();

    rows.push({
      postId,
      imageId,
      createdAt,
      sourcePostId: item.uri,
      imageKey: finalRelativePath,
      imageUrl: "/" + normalizeSlashes(finalRelativePath)
    });
    report.importedImages += 1;
  }

  await fs.writeFile(sqlOutputPath, makeSql(rows), "utf8");
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify(report, null, 2));
}

main().catch(function (error) {
  console.error(error);
  process.exit(1);
});
