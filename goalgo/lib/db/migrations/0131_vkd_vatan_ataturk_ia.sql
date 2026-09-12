-- VKD Vatan: Atatürk Köşesi + heritage modules stay on corporate-like layout
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
          '{hmCorporateMenuPrimaryOnly}',
          'false'::jsonb,
          true
        ),
        '{hmCorporateAtaturkCornerEnabled}',
        'true'::jsonb,
        true
      ),
      '{hmCorporateCulturePortalBandEnabled}',
      'true'::jsonb,
      true
    ),
    '{hmCorporateWarsSectionEnabled}',
    'true'::jsonb,
    true
  )::text,
  updated_at = now()
WHERE slug = 'vkd';

UPDATE hm_news_sites
SET
  layout_json = jsonb_set(
    COALESCE(layout_json::jsonb, '{}'::jsonb),
    '{hmCorporateNationalDaysSectionEnabled}',
    'true'::jsonb,
    true
  )::text,
  updated_at = now()
WHERE slug = 'vkd';
