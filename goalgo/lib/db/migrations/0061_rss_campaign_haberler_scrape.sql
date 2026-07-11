ALTER TABLE rss_campaigns
  ADD COLUMN IF NOT EXISTS haberler_filter_by_tags boolean NOT NULL DEFAULT false;
