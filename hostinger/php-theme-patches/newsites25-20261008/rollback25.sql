-- newsites25 personas rollback (hide, never delete)
UPDATE authors SET is_active=false, ai_writing_enabled=false WHERE hm_site_id IN (1147,1148,1149) AND ai_author;
