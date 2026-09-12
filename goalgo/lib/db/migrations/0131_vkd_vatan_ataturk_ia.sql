-- VKD Vatan: full-bleed dark heritage chrome (not contained news layout)
UPDATE hm_news_sites
SET
  layout_json = jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(
            COALESCE(layout_json::jsonb, '{}'::jsonb),
            '{hmVitrinTheme}',
            '"vatan"'::jsonb,
            true
          ),
          '{hmCorporateLayoutWidth}',
          '"full"'::jsonb,
          true
        ),
        '{hmHeaderChromeFullBleed}',
        'true'::jsonb,
        true
      ),
      '{hmChromeColorMode}',
      '"dark"'::jsonb,
      true
    ),
    '{hmLogoBarBackground}',
    '"#071422"'::jsonb,
    true
  )::text,
  updated_at = now()
WHERE slug = 'vkd';

UPDATE hm_news_sites
SET
  layout_json = jsonb_set(
    jsonb_set(
      COALESCE(layout_json::jsonb, '{}'::jsonb),
      '{hmNavBarBackground}',
      '"#0B1C33"'::jsonb,
      true
    ),
    '{hmCorporateMenuPrimaryOnly}',
    'false'::jsonb,
    true
  )::text,
  updated_at = now()
WHERE slug = 'vkd';
