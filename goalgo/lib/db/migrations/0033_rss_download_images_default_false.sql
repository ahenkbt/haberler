-- RSS: kapak görselleri varsayılan olarak uzak URL (indirme kapalı).
ALTER TABLE rss_campaigns ALTER COLUMN download_images SET DEFAULT false;
