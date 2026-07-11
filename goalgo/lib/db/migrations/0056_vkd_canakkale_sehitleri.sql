CREATE TABLE IF NOT EXISTS vkd_canakkale_sehitleri (
  id serial PRIMARY KEY,
  serial_no integer NOT NULL,
  name text NOT NULL,
  father_name text NOT NULL DEFAULT '',
  birth_year integer,
  nickname text NOT NULL DEFAULT '',
  province text NOT NULL DEFAULT '',
  district text NOT NULL DEFAULT '',
  bucak text NOT NULL DEFAULT '',
  village text NOT NULL DEFAULT '',
  branch_class text NOT NULL DEFAULT '',
  rank text NOT NULL DEFAULT '',
  unit_text text NOT NULL DEFAULT '',
  martyrdom_place text NOT NULL DEFAULT '',
  martyrdom_date text NOT NULL DEFAULT '',
  search_text text NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS vkd_canakkale_sehitleri_serial_idx ON vkd_canakkale_sehitleri (serial_no);
CREATE INDEX IF NOT EXISTS vkd_canakkale_sehitleri_province_idx ON vkd_canakkale_sehitleri (province);
CREATE INDEX IF NOT EXISTS vkd_canakkale_sehitleri_district_idx ON vkd_canakkale_sehitleri (province, district);
CREATE INDEX IF NOT EXISTS vkd_canakkale_sehitleri_search_idx ON vkd_canakkale_sehitleri (search_text);

CREATE TABLE IF NOT EXISTS vkd_data_sync_markers (
  key text PRIMARY KEY,
  version integer NOT NULL DEFAULT 0,
  record_count integer NOT NULL DEFAULT 0,
  updated_at text NOT NULL DEFAULT ''
);
