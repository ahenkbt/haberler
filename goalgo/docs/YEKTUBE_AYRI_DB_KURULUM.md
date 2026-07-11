# Yektube için ayrı veritabanı kurulumu

Yektube (video kaynakları, videolar, kullanıcı abonelikleri, izleme geçmişi, oynatma listeleri) artık **Yekpare ana Postgres** (`DATABASE_URL`) yerine isteğe bağlı **ayrı bir Postgres** üzerinde çalışabilir.

Haber cluster’ına (`NEWS_DATABASE_URL`) benzer bir model kullanılır; Yektube verisi haber DB’sinden de ayrılır.

---

## Tablolar (Yektube DB)

| Tablo | Açıklama |
|-------|----------|
| `video_sources` | Kanal / playlist kaynakları |
| `videos` | Video meta |
| `yektube_member_subscriptions` | Üye kanal abonelikleri |
| `yektube_watch_history` | İzleme geçmişi |
| `yektube_playlists` | Kullanıcı listeleri |
| `yektube_playlist_items` | Liste videoları |
| `yektube_member_prefs` | Bildirim / gizlilik tercihleri |

**Ana DB’de kalır:** `site_members`, `panel_admin_users`, `site_settings` (YouTube API anahtarı vb.).

---

## Adım 1 — Railway’de yeni PostgreSQL

1. Goalgo projesinde **+ New → Database → PostgreSQL**
2. Servis adı örneği: `postgres-yektube`

---

## Adım 2 — API servisine bağla

**Goalgo API → Variables:**

| Değişken | Değer |
|----------|--------|
| `YEKTUBE_DATABASE_URL` | `${{postgres-yektube.DATABASE_URL}}` |
| `YEKTUBE_DB_READ` | `yektube` |
| `YEKTUBE_DB_WRITE` | `yektube` (veya geçişte `dual`) |

`SKIP_YEKTUBE_DB_MIGRATE` ve `SKIP_YEKTUBE_DATA_MIGRATE` **tanımlı olmamalı** — aksi halde `postgres-yektube` şeması eksik kalır ve admin kaynak ekleme «Sunucu hatası» verir.

`YEKTUBE_DATABASE_URL` tanımlandığında ve yukarıdaki bayraklar yoksa varsayılan okuma/yazma zaten `yektube` olur.

---

## Adım 3 — Deploy

Deploy sırasında otomatik:

1. `[yektube-db-migrate] tamam` — şema oluşturulur
2. `[yektube-data-migrate] tamam` — ana (veya haber) DB’deki mevcut video verisi kopyalanır

Loglarda bu satırları arayın. API açılışında:

```
[yektube-db] YEKTUBE_DATABASE_URL=tanımlı read=yektube write=yektube
[yektube-db] okuma hedefi=yektube aktif_kaynak=… aktif_video=…
```

---

## Sorun giderme (acil)

### Videolar görünmüyor / tablolar yok

**En sık neden:** `YEKTUBE_DB_READ=yektube` ve `YEKTUBE_DB_WRITE=yektube` ayarlandı ama **`YEKTUBE_DATABASE_URL` eksik**.

| Kontrol | Beklenen |
|---------|----------|
| Railway API → Variables | `YEKTUBE_DATABASE_URL=${{postgres-yektube.DATABASE_URL}}` (referans) |
| Deploy log | `[yektube-db-migrate] tamam` |
| Deploy log | `[yektube-data-migrate] tamam` ve `video_sources: N satır` |
| API log (Server listening sonrası) | `aktif_video` > 0 |

**Geçici kurtarma (hemen videoları geri getir):**

```
YEKTUBE_DB_READ=main
```

Kayıtlar hâlâ ana veya haber DB'deyse feed anında döner. Sonra şema + veri kopyası tamamlanınca tekrar `YEKTUBE_DB_READ=yektube` yapın.

**Şema oluşmadıysa** (Railway shell veya redeploy):

```bash
pnpm run db:migrate:yektube
pnpm run db:migrate:yektube-data
```

`SKIP_YEKTUBE_*` bayraklarının **tanımlı olmadığından** emin olun.

---

## Geçiş modları (isteğe bağlı)

| Değişken | Değer | Anlamı |
|----------|--------|--------|
| `YEKTUBE_DB_READ` | `main` | Eski DB’den oku (geçiş öncesi) |
| `YEKTUBE_DB_READ` | `yektube` | Yektube DB’den oku (varsayılan, URL varsa) |
| `YEKTUBE_DB_WRITE` | `dual` | Ana DB + Yektube DB’ye birlikte yaz |
| `YEKTUBE_DB_WRITE` | `yektube` | Yalnızca Yektube DB (varsayılan, URL varsa) |

**Önerilen geçiş:** `YEKTUBE_DB_WRITE=dual`, `YEKTUBE_DB_READ=main` → veri kopyalandıktan sonra `YEKTUBE_DB_READ=yektube`.

---

## Yerel geliştirme

`goalgo/artifacts/api-server/.env`:

```env
DATABASE_URL=postgresql://...
YEKTUBE_DATABASE_URL=postgresql://localhost:5432/yektube
```

```powershell
cd goalgo/artifacts/api-server
pnpm run db:migrate:yektube
pnpm run db:migrate:yektube-data
pnpm dev
```

`YEKTUBE_DATABASE_URL` yoksa Yektube eskisi gibi **ana DB** kullanır (geriye uyumlu).

---

## Atlatma (acil)

| Değişken | Etki |
|----------|------|
| `SKIP_YEKTUBE_DB_MIGRATE=1` | Şema migrasyonu atlanır |
| `SKIP_YEKTUBE_DATA_MIGRATE=1` | Veri kopyası atlanır (API yine açılır) |
| `FORCE_YEKTUBE_DATA_MIGRATE=1` | Hedefte veri olsa bile tam kopyayı zorla |

**Deploy / healthcheck:** `start-production.mjs` artık migrasyon sırasında `/api/healthz` için **200** döner; `yektube-data-migrate` API dinlemeye başladıktan **sonra arka planda** çalışır. Hedefte kaynak DB ile ~%90+ video varsa veri migrasyonu otomatik atlanır — her deploy’da 191k satır upsert edilmez.

---

## Yektube Studio admin girişi

Studio girişi **Yekpare yönetici hesabı** ile yapılır; ayrı Yektube şifresi yoktur.

- API `.env` / Railway: `ADMIN_PANEL_USERNAMES`, `ADMIN_PANEL_PASSWORD`
- İlk kurulumda `panel_admin_users` boşsa env ile otomatik tohumlanır
- Üye girişi (`/kutuphane`): `site_members` — normal Yekpare e-posta/şifre
