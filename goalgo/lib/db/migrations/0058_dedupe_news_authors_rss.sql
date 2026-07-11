-- Tekrarlayan yazar/haber/makale kayıtlarını exact-normalized eşleşmelerde birleştirir.
-- Canonical kayıt korunur; bağlı haber/makale author_id referansları canonical id'ye taşınır.

WITH ranked AS (
  SELECT
    id,
    first_value(id) OVER (
      PARTITION BY coalesce(hm_site_id, 0), lower(regexp_replace(btrim(name), '\s+', ' ', 'g'))
      ORDER BY (avatar_url IS NOT NULL) DESC, (bio IS NOT NULL) DESC, id ASC
    ) AS keep_id
  FROM authors
  WHERE btrim(coalesce(name, '')) <> ''
)
UPDATE hm_makaleler m
SET author_id = r.keep_id
FROM ranked r
WHERE m.author_id = r.id AND r.id <> r.keep_id;

WITH ranked AS (
  SELECT
    id,
    first_value(id) OVER (
      PARTITION BY coalesce(hm_site_id, 0), lower(regexp_replace(btrim(name), '\s+', ' ', 'g'))
      ORDER BY (avatar_url IS NOT NULL) DESC, (bio IS NOT NULL) DESC, id ASC
    ) AS keep_id
  FROM authors
  WHERE btrim(coalesce(name, '')) <> ''
)
UPDATE news n
SET author_id = r.keep_id
FROM ranked r
WHERE n.author_id = r.id AND r.id <> r.keep_id;

WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY coalesce(hm_site_id, 0), lower(regexp_replace(btrim(name), '\s+', ' ', 'g'))
      ORDER BY (avatar_url IS NOT NULL) DESC, (bio IS NOT NULL) DESC, id ASC
    ) AS rn
  FROM authors
  WHERE btrim(coalesce(name, '')) <> ''
)
DELETE FROM authors a
USING ranked r
WHERE a.id = r.id AND r.rn > 1;

WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY coalesce(site_id, 0), rss_source_url
      ORDER BY created_at ASC, id ASC
    ) AS rn
  FROM news
  WHERE rss_source_url IS NOT NULL AND btrim(rss_source_url) <> ''
)
DELETE FROM news n
USING ranked r
WHERE n.id = r.id AND r.rn > 1;

WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY coalesce(site_id, 0), lower(regexp_replace(btrim(title), '\s+', ' ', 'g'))
      ORDER BY created_at ASC, id ASC
    ) AS rn
  FROM news
  WHERE btrim(coalesce(title, '')) <> ''
)
DELETE FROM news n
USING ranked r
WHERE n.id = r.id AND r.rn > 1;

WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY site_id, external_key
      ORDER BY created_at ASC, id ASC
    ) AS rn
  FROM hm_makaleler
  WHERE external_key IS NOT NULL AND btrim(external_key) <> ''
)
DELETE FROM hm_makaleler m
USING ranked r
WHERE m.id = r.id AND r.rn > 1;

WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY site_id, coalesce(author_id, 0), lower(regexp_replace(btrim(title), '\s+', ' ', 'g'))
      ORDER BY created_at ASC, id ASC
    ) AS rn
  FROM hm_makaleler
  WHERE btrim(coalesce(title, '')) <> ''
)
DELETE FROM hm_makaleler m
USING ranked r
WHERE m.id = r.id AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS authors_hm_site_normalized_name_unique
  ON authors (coalesce(hm_site_id, 0), lower(regexp_replace(btrim(name), '\s+', ' ', 'g')))
  WHERE btrim(coalesce(name, '')) <> '';

DROP INDEX IF EXISTS news_rss_source_site_idx;
CREATE UNIQUE INDEX IF NOT EXISTS news_rss_source_site_unique
  ON news (coalesce(site_id, 0), rss_source_url)
  WHERE rss_source_url IS NOT NULL AND btrim(rss_source_url) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS hm_makaleler_site_external_key_unique
  ON hm_makaleler (site_id, external_key)
  WHERE external_key IS NOT NULL AND btrim(external_key) <> '';
