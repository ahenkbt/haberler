-- Vatan theme for VKD / vatankahramanlari.org
UPDATE hm_news_sites
SET
  layout_json = jsonb_set(
    COALESCE(layout_json::jsonb, '{}'::jsonb),
    '{hmVitrinTheme}',
    '"vatan"'::jsonb,
    true
  )::text,
  updated_at = now()
WHERE slug = 'vkd';
