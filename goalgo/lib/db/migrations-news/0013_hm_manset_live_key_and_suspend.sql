-- Journal when 1791153655496 is above 0135 (1791153654496). Drizzle skips a migration
-- whose when is not greater than the latest drizzle.__drizzle_migrations.created_at.
-- Live PHP reads hmNewsYsMansetLayout. The editor stored Mynet on hmYsMansetPreset only,
-- so the public class stayed ys-preset-nefes. Copy a known preset onto the live key.
-- hmPublicSuspended on Kırşehir shows the suspension sentence once a reader exists.
-- Idempotent. A bad layout_json row is skipped; other sites still update.
-- layout_json is text in schema; some databases store jsonb. Try text, then jsonb.
DO $manset_live$
DECLARE
  r record;
  v_layout jsonb;
  v_preset text;
  v_changed boolean;
  v_suspend boolean;
  v_host text;
BEGIN
  FOR r IN
    SELECT id, slug, domain, domain2, domain3, layout_json
    FROM hm_news_sites
  LOOP
    BEGIN
      v_changed := false;
      IF r.layout_json IS NULL OR btrim(r.layout_json::text) = '' THEN
        v_layout := '{}'::jsonb;
      ELSIF left(btrim(r.layout_json::text), 1) = '{' THEN
        v_layout := btrim(r.layout_json::text)::jsonb;
      ELSE
        CONTINUE;
      END IF;
      IF v_layout IS NULL OR jsonb_typeof(v_layout) IS DISTINCT FROM 'object' THEN
        CONTINUE;
      END IF;

      v_preset := lower(btrim(coalesce(v_layout->>'hmYsMansetPreset', '')));
      IF v_preset IN ('odatv', 'sabah', 'takvim', 'mynet', 'nefes')
         AND v_layout->>'hmNewsYsMansetLayout' IS DISTINCT FROM v_preset THEN
        v_layout := v_layout || jsonb_build_object('hmNewsYsMansetLayout', v_preset);
        v_changed := true;
      END IF;

      v_suspend := lower(btrim(coalesce(r.slug, ''))) IN ('kirsehirhaber', 'kh', 'kirsehir');
      IF NOT v_suspend THEN
        FOREACH v_host IN ARRAY ARRAY[r.domain, r.domain2, r.domain3]
        LOOP
          IF lower(btrim(coalesce(v_host, ''))) IN (
            'kirsehirhaber.org', 'www.kirsehirhaber.org',
            'kirsehri.com', 'www.kirsehri.com',
            'kirsehir.net', 'www.kirsehir.net'
          ) THEN
            v_suspend := true;
          END IF;
        END LOOP;
      END IF;
      IF v_suspend AND v_layout->>'hmPublicSuspended' IS DISTINCT FROM 'true' THEN
        v_layout := v_layout || jsonb_build_object('hmPublicSuspended', true);
        v_changed := true;
      END IF;

      IF v_changed THEN
        BEGIN
          UPDATE hm_news_sites
            SET layout_json = v_layout::text, updated_at = now()
            WHERE id = r.id;
        EXCEPTION WHEN others THEN
          UPDATE hm_news_sites
            SET layout_json = v_layout, updated_at = now()
            WHERE id = r.id;
        END;
      END IF;
    EXCEPTION WHEN others THEN
      RAISE WARNING '0136 manset/suspend site % skipped: %', r.id, SQLERRM;
    END;
  END LOOP;
END
$manset_live$;
