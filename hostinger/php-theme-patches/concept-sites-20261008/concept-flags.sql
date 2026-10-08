BEGIN;
CREATE TABLE IF NOT EXISTS hm_news_sites_bak_20261008_concept AS SELECT now() AS backed_up_at, s.* FROM hm_news_sites s WHERE false;
INSERT INTO hm_news_sites_bak_20261008_concept SELECT now(), s.* FROM hm_news_sites s
  WHERE s.id IN (232,233,236,237,1133,1134,1135,1136,1137,1138,1139,1140,1142,1143,1144);
WITH t(id, topic) AS (VALUES
  (232,'sehit-gazi'),(233,'savunma'),(236,'cevre'),(237,'saglik'),(1142,'teknoloji'),
  (1133,'bolge'),(1134,'bolge'),(1135,'bolge'),(1136,'bolge'),(1137,'bolge'),(1138,'bolge'),(1139,'bolge'),(1140,'bolge'),(1143,'bolge'),(1144,'bolge'))
UPDATE hm_news_sites s
   SET layout_json = (coalesce(nullif(s.layout_json,''),'{}')::jsonb || jsonb_build_object(
         'hmConceptSite', true, 'hmConceptTopic', t.topic,
         'hmNewsYsHoroscopeEnabled', false, 'hmNewsYsStandingsEnabled', false, 'hmNewsYsSportsHoroscopeEnabled', false))::text,
       updated_at = now()
  FROM t WHERE s.id = t.id
RETURNING s.id, s.slug, s.layout_json::jsonb->>'hmConceptTopic' AS topic;
INSERT INTO hm_site_override_rev(site_id, rev_at)
  SELECT id, now() FROM hm_news_sites WHERE id IN (232,233,236,237,1133,1134,1135,1136,1137,1138,1139,1140,1142,1143,1144)
  ON CONFLICT (site_id) DO UPDATE SET rev_at = excluded.rev_at;
COMMIT;
