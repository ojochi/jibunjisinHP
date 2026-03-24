CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  comment TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'manual',
  source_post_id TEXT,
  source_permalink TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS post_images (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  image_key TEXT NOT NULL,
  image_url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_posts_created_at
  ON posts(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_post_images_post_id
  ON post_images(post_id);
