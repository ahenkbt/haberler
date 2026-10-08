CREATE TABLE IF NOT EXISTS hm_story_dup_clusters (
  cluster_id bigint NOT NULL, public_slug text NOT NULL, kind text NOT NULL, ref_id bigint NOT NULL, site_id integer,
  source text, title text, published_at timestamptz, computed_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS hm_story_dup_clusters_slug ON hm_story_dup_clusters (public_slug);
CREATE INDEX IF NOT EXISTS hm_story_dup_clusters_cid ON hm_story_dup_clusters (cluster_id);
CREATE TABLE IF NOT EXISTS hm_story_dup_hidden (
  site_id integer NOT NULL, public_slug text NOT NULL, cluster_id bigint NOT NULL, kept_slug text NOT NULL,
  reason text, computed_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (site_id, public_slug));
CREATE TABLE IF NOT EXISTS hm_story_dup_verdicts (
  pair_key text PRIMARY KEY, same boolean NOT NULL, decided_by text, a_title text, b_title text,
  decided_at timestamptz NOT NULL DEFAULT now());
COMMENT ON TABLE hm_story_dup_hidden IS 'storydup job (2026-10-08): per-site list suppression of duplicate story variants; nothing deleted. Theme storySql excludes these slugs from lists only.';
GRANT SELECT, INSERT, UPDATE, DELETE ON hm_story_dup_clusters, hm_story_dup_hidden, hm_story_dup_verdicts TO php_theme_rss_writer;
GRANT SELECT ON hm_story_dup_clusters, hm_story_dup_hidden TO php_theme_ro;
GRANT SELECT ON hm_story_dup_clusters, hm_story_dup_hidden TO php_theme_ai_editor;
GRANT SELECT (id, slug, site_id, owner_site_id, category_id, created_at, title, spot, image_url, status, rss_source_url, is_editor_manual) ON news TO php_theme_rss_writer;
GRANT SELECT (id, site_id, published_at, title, orig_title, spot, image_url, category_slug, source_item_id, status) ON hm_ai_editor_articles TO php_theme_rss_writer;
GRANT INSERT, UPDATE ON hm_site_override_rev TO php_theme_rss_writer;
