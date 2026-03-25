import fs from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const sqlPath = process.argv[2];

if (!sqlPath) {
  console.error("Usage: node scripts/apply-d1-sql-batches.mjs <sql-file>");
  process.exit(1);
}

const MAX_CHARS = 6000;

function splitStatements(sql) {
  return sql
    .split(/;\s*\n/)
    .map(function (statement) {
      return statement.trim();
    })
    .filter(Boolean)
    .map(function (statement) {
      return statement + ";";
    });
}

function stripTrailingSemicolon(value) {
  return value.replace(/;+\s*$/, "");
}

function extractValues(statements, tableName) {
  const prefix = `INSERT INTO ${tableName} `;

  return statements
    .filter(function (statement) {
      return statement.startsWith(prefix);
    })
    .map(function (statement) {
      const valuesIndex = statement.indexOf("VALUES ");
      if (valuesIndex === -1) {
        throw new Error(`Could not find VALUES clause for ${tableName}`);
      }

      const values = statement.slice(valuesIndex + "VALUES ".length).trim();
      if (!values.startsWith("(") || !/;+\s*$/.test(values)) {
        throw new Error(`Could not parse VALUES clause for ${tableName}`);
      }

      return stripTrailingSemicolon(values);
    });
}

function makeInsertChunks(prefix, valuesList) {
  const chunks = [];
  let currentValues = [];
  let currentLength = prefix.length + 1;

  for (const values of valuesList) {
    const separatorLength = currentValues.length ? 2 : 0;
    const nextLength = currentLength + separatorLength + values.length;

    if (currentValues.length && nextLength > MAX_CHARS) {
      chunks.push(prefix + currentValues.join(", ") + ";");
      currentValues = [values];
      currentLength = prefix.length + 1 + values.length;
      continue;
    }

    currentValues.push(values);
    currentLength = nextLength;
  }

  if (currentValues.length) {
    chunks.push(prefix + currentValues.join(", ") + ";");
  }

  return chunks;
}

function makeChunks(statements) {
  const chunks = [];

  const deleteImageStatement =
    "DELETE FROM post_images WHERE post_id IN (SELECT id FROM posts WHERE source_type = 'instagram_import');";
  const deletePostStatement = "DELETE FROM posts WHERE source_type = 'instagram_import';";

  chunks.push(deleteImageStatement);
  chunks.push(deletePostStatement);

  const postPrefix =
    "INSERT INTO posts (id, created_at, comment, source_type, source_post_id, source_permalink, updated_at) VALUES ";
  const imagePrefix =
    "INSERT INTO post_images (id, post_id, image_key, image_url, sort_order, created_at) VALUES ";

  const postValues = extractValues(statements, "posts");
  const imageValues = extractValues(statements, "post_images");

  chunks.push(...makeInsertChunks(postPrefix, postValues));
  chunks.push(...makeInsertChunks(imagePrefix, imageValues));

  return chunks.map(stripTrailingSemicolon).map(function (statement) {
    return statement + ";";
  });
}

async function runChunk(chunk, index, total) {
  console.log(`Applying batch ${index + 1}/${total}`);
  const { stdout, stderr } = await execFileAsync(
    "cmd.exe",
    ["/c", "npx", "wrangler", "d1", "execute", "DB", "--remote", "--command", chunk],
    {
      maxBuffer: 10 * 1024 * 1024
    }
  );

  if (stdout) {
    process.stdout.write(stdout);
  }

  if (stderr) {
    process.stderr.write(stderr);
  }
}

const sql = await fs.readFile(sqlPath, "utf8");
const statements = splitStatements(sql);
const chunks = makeChunks(statements);

for (let index = 0; index < chunks.length; index += 1) {
  await runChunk(chunks[index], index, chunks.length);
}
