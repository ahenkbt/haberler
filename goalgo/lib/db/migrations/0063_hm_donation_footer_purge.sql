-- Alt bağış modülünü kaldır; eski manşet altı bağış HTML'ini temizle.
UPDATE hm_news_sites
SET
  layout_json = (
    (layout_json::jsonb)
    #- '{hmCorporateDonation,supportBand,text}'
    #- '{hmCorporateDonation,description}'
    || jsonb_build_object(
      'hmCorporateHomeModuleOrder',
      COALESCE(
        (
          SELECT jsonb_agg(to_jsonb(elem))
          FROM jsonb_array_elements_text(
            COALESCE((layout_json::jsonb)->'hmCorporateHomeModuleOrder', '[]'::jsonb)
          ) AS elem
          WHERE elem <> 'donationFooter'
        ),
        COALESCE((layout_json::jsonb)->'hmCorporateHomeModuleOrder', '[]'::jsonb)
      )
    )
  )::text,
  updated_at = now()
WHERE layout_json IS NOT NULL
  AND btrim(layout_json) <> ''
  AND (
    (layout_json::jsonb)->'hmCorporateHomeModuleOrder' ? 'donationFooter'
    OR (layout_json::jsonb)->>'hmMansetBelowAdHtml' ~* 'vkv-donation-(footer|amounts)|BAĞIŞ\s*YAP'
  );

UPDATE hm_news_sites
SET
  layout_json = ((layout_json::jsonb) #- '{hmMansetBelowAdHtml}')::text,
  updated_at = now()
WHERE layout_json IS NOT NULL
  AND btrim(layout_json) <> ''
  AND (layout_json::jsonb)->>'hmMansetBelowAdHtml' ~* 'vkv-donation-(footer|amounts)|BAĞIŞ\s*YAP|₺\s*500';
