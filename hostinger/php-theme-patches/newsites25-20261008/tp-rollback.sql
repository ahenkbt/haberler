BEGIN;
-- newsites25 rollback: deactivate (hide, never delete) the 3 sites
UPDATE hm_news_sites SET active = false, updated_at = now() WHERE slug IN ('memur','turkdunyasi','world') AND domain IN ('memur.gundemi.org','turkdunyasi.gundemi.org','world.fix.tc');
UPDATE hm_site_editors SET is_active = false WHERE email IN ('memur@gundemi.org','turkdunyasi@gundemi.org','world@fix.tc');
COMMIT;
