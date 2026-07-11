# Railway PostgreSQL yedekleme

Production veritabanı Railway üzerinde çalışıyorsa iki katmanlı yedekleme önerilir.

## 1. Railway otomatik snapshot (önerilen)

Railway Postgres servisinde **Backups** sekmesinden:

- Günlük otomatik snapshot'ları açın
- Retention süresini (7–30 gün) iş gereksinimine göre ayarlayın
- Restore işlemini yalnızca staging kopyasında test edin

Bu yol operasyon yükü en düşük seçenektir.

## 2. Haftalık `pg_dump` (ek güvence)

Railway **Connect → Public URL** veya private network üzerinden `DATABASE_URL` ile:

```bash
pg_dump "$DATABASE_URL" --format=custom --no-owner --file=goalgo-$(date +%Y%m%d).dump
```

Dosyayı şifreli object storage'a (S3, R2, vb.) yükleyin. Dump dosyalarını repoya commit etmeyin.

### GitHub Actions (opsiyonel, workflow_dispatch)

Haftalık cron yerine manuel tetikleme önerilir (secret yönetimi ve dump boyutu nedeniyle):

1. Repo secret: `PRODUCTION_DATABASE_URL`
2. Runner'da `postgresql-client` kurulu olmalı
3. Dump artifact veya S3 upload adımı ekleyin

Örnek cron ifadesi: `0 3 * * 0` (Pazar 03:00 UTC).

## Restore (custom format)

```bash
pg_restore --clean --if-exists --no-owner --dbname="$TARGET_DATABASE_URL" goalgo-YYYYMMDD.dump
```

**Uyarı:** `--clean` hedef DB'deki mevcut nesneleri siler. Restore'u her zaman staging'de doğrulayın.

## Kontrol listesi

- [ ] Railway backup açık ve retention tanımlı
- [ ] `DATABASE_URL` sadece secret store'da (Railway / GitHub Secrets)
- [ ] Ayda bir staging restore tatbikatı
- [ ] Migration journal (`lib/db/migrations/meta/_journal.json`) ile dump tarihi uyumu not edildi
