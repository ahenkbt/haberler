# Yekpare.net — Canlıya Çıkış Yol Haritası

> **Hazırlanma:** 2 Temmuz 2026  
> **Kaynak:** Production readiness denetimi (mimari, güvenlik, veritabanı, performans, dikey işlevsellik, canlı smoke test)  
> **Mevcut durum:** ~%55 canlıya hazır — kontrollü soft launch mümkün; kusursuz production için P0–P2 tamamlanmalı  
> **İlgili:** [YEKPARE-SUPER-APP-ROADMAP.md](./YEKPARE-SUPER-APP-ROADMAP.md) · [DEPLOY_SONRASI_KONTROL.md](./DEPLOY_SONRASI_KONTROL.md)

---

## Özet tablo

| Faz | Süre | Hedef | Çıkış kriteri |
|-----|------|-------|---------------|
| **P0 — Güvenlik & DB** | 1–2 hafta | Canlı trafik güvenli | Kritik açıklar kapalı, migration journal senkron |
| **P1 — Stabilizasyon** | 2–4 hafta | Orta trafik dayanıklılığı | Pool/indeks/cron ayrımı, smoke test CI |
| **P2 — Ürün tamamlama** | 1–2 ay | Eksik dikeyler | Pazaryeri checkout, ulaşım Faz 3, mobil push |
| **P3 — Ölçek & kalite** | sürekli | Büyüme | Replica-safe worker, test coverage, monitoring |

---

## Mevcut canlı durum (Temmuz 2026)

| Servis | URL | Durum |
|--------|-----|-------|
| Frontend | https://yekpare.net | ✅ Netlify (GH Actions `netlify-production.yml`) |
| API | https://goalgo-y7ze.onrender.com | ✅ Render (GitHub hook veya dashboard Manual Deploy) |
| AI Call | https://call.yekpare.net | ✅ |
| Medya | S3 + volume | ✅ healthz doğrulandı |
| Sitemap | /sitemap.xml | ✅ (soğuk start ara sıra 500) |
| Transport admin | /api/transport/requests | ❌ 500 — P0 |

---

## Dikey modül durumu

| Modül | Hüküm | Canlıya açılabilir mi? |
|-------|-------|------------------------|
| Haber / HM / Yektube | Çalışır | ✅ Evet (performans izle) |
| Harita / Keşfet | Çalışır | ✅ Evet (geo indeks P1) |
| Yemek / market siparişi | Kısmen çalışır | ✅ Evet (manuel kurye ops) |
| Kurye paneli | Çalışır | ✅ Evet |
| Satıcı e-ticaret vitrini | Kısmen çalışır | ⚠️ Stok düşümü yok |
| Birleşik `/magaza` pazaryeri | İskelet / stub | ❌ Gizle veya tamamla |
| Eski `/odeme` shop | Sahte Stripe bypass | ❌ Düzeltmeden açma |
| Ulaşım / taksi | Kısmen çalışır | ⚠️ Eşleme/fiyat yok; 500 düzelt |
| Mobil API (JWT) | Kısmen hazır | ⚠️ Push/v1 yok |

---

## Cursor: model ve çalışma modu (hız + düşük hata)

Tek modele bağlı kalmayın; görev türüne göre model değiştirmek P0–P3 süresini kısaltır. **Not:** Aşağıdaki isimler yetenek sınıfına göredir; Cursor’daki güncel model adları değişebilir.

| Faz | Önerilen model sınıfı | Neden | Cursor modu |
|-----|----------------------|-------|-------------|
| **P0** Güvenlik, IDOR, migrate | **Claude Sonnet** (yüksek bağlam) | Auth middleware, Drizzle, büyük `map.ts`/`delivery.ts` dosyalarında bağlam kaybı az | **Composer** (Ctrl+I) — çoklu dosya |
| **P1** Pool, geo-index, cron/worker | **o1 / reasoning** | Mimari karar, deadlock/indeks trade-off, replica stratejisi | **Chat** (Ctrl+L) + `@Folders lib/db/migrations` |
| **P2** UI, stub→gerçek, test yazımı | **GPT-4o** veya **Sonnet** | Tekrarlayan test/boilerplate hızlı; UI akışları | Agent veya Composer |
| **P3** Load test, monitoring, refactor planı | **Reasoning** + **Sonnet** uygulama | Plan reasoning; patch Sonnet | Chat plan → Composer uygula |

### Projeye özel düzeltmeler (genel tavsiyelere göre)

- Stack **Next.js değil:** Express + Vite + **Drizzle** (`lib/db/migrations`, `_journal.json`) — Prisma/schema.prisma yok.
- P0’da Composer ile **aynı anda** hedefleyin: `transport.ts`, `customer.ts`, `partners.ts`, `delivery.ts`, `providers.ts`, `premium.ts`.
- `@Context`: `@Files` route dosyası + `@Folders goalgo/lib/db/migrations` + `admin-guard.ts` — elle kopyalamayın.

### Repo kuralları (otomatik bağlam)

Cursor kuralları eklendi:

- `goalgo/.cursor/rules/yekpare-stack.mdc` — stack, deploy, auth özeti (her oturum)
- `goalgo/.cursor/rules/api-security.mdc` — P0 güvenlik kuralları (`api-server` TS dosyaları)

### Hızlandıran 3 alışkanlık

1. **Composer + dar prompt:** “Sadece auth ekle; davranış değiştirme; test etmeden commit etme.”
2. **Faz başına yeni chat:** P0 güvenlik chat’i bitince P1 için temiz bağlam.
3. **Her P0 PR sonrası:** `pnpm run typecheck` + `deploy:smoke` (bkz. checklist aşağıda).

### Cloud Agent — PC kapalıyken sıralı otomatik düzeltme

- **Giriş noktası:** [../AGENTS.md](../AGENTS.md) (Cloud Agent repo açılışında okur)
- **Detaylı playbook:** [CLOUD-AGENT-OTOMATIK-TALIMAT.md](./CLOUD-AGENT-OTOMATIK-TALIMAT.md)
- **Kural:** Bir oturum = bir checklist maddesi = bir PR; merge sonrası sonraki madde
- **Ön koşul:** Dosyalar `main`'e push; Cursor Dashboard → Cloud Agents açık

---

## P0 — Canlı trafik öncesi zorunlu (1–2 hafta)

> **Hedef:** Güvenlik açıkları kapatılır, DB tutarlılığı sağlanır, transport 500 giderilir.

### P0.1 Güvenlik

- [x] **Migrate uçlarını kilitle** — `POST /api/transport/migrate`, `/customer/migrate`, `/partners/migrate` → `denyUnlessAdminMaintenance` veya kaldır  
  - Dosya: `transport.ts`, `customer.ts`, `partners.ts`
- [x] **Auth’suz delivery/premium CRUD kapat** — `DELETE /delivery/vendors/:id`, `PUT /premium/products/:id` vb.  
  - Dosya: `delivery.ts`, `premium.ts`
- [x] **Geliver webhook imza doğrulama** — HMAC/secret + parametrik SQL  
  - Dosya: `providers.ts` ~2266
- [x] **Sipariş IDOR düzelt** — `GET /delivery/orders/:orderNumber`, `by-phone`, `driver-location` → signed tracking token veya OTP  
  - Dosya: `delivery.ts` ~4614–4722
- [x] **SQL injection** — `GET /delivery/my-reservations` → Drizzle parametreli sorgu  
  - Dosya: `delivery.ts` ~5684
- [x] **Shop sipariş IDOR** — `GET /shop/orders/:id` auth zorunlu  
  - Dosya: `ecommerce.ts` / `shop-checkout.ts`
- [x] **Kök `.gitignore`** — `vendor-*.json`, `resp_*.json`, `tmp-*`, `n*.json` ekle
- [x] **Demo credential temizliği** — prod DB’de `GeliverDemo2026!`, `yekpare`, `agent123` rotate
- [x] **PBX_JWT_SECRET** prod’da zorunlu kıl (`pbx/auth.ts`)

### P0.2 Veritabanı

- [x] **Migration journal senkron** — 19 yetim dosyayı `_journal.json`’a al veya birleştir  
  - Özellikle: `0047–0060`, `0091`, `0092`, `0094`, çift `0061`/`0090`
- [x] **Canlı migration smoke** — `0027`, `0028`, transport tabloları var mı? (`pnpm --filter @workspace/api-server run db:smoke`)
- [x] **Transport 500 kök neden** — `transport_requests` tablosu + runtime DDL uyumu
- [x] **`seriIlanlarTable` kaldır** — Drizzle şemadan ölü tanım (`galleries.ts`)

### P0.3 Ürün / UX (canlıda kırık görünmesin)

- [x] **Birleşik pazaryeri stub gizle** — `/magaza/sepet`, `/magaza/odeme` banner’ları veya route kapat  
  - Dosya: `MagazaSepet.tsx`, `MagazaOdeme.tsx`
- [x] **`Checkout.tsx` Stripe bypass kaldır** — `stripeConfigured: false` → gerçek intent
- [ ] **Deploy smoke otomasyonu** — `pnpm run deploy:smoke` CI’da veya deploy sonrası checklist

**P0 çıkış kriteri:** Güvenlik taraması temiz, transport listesi 200, migration journal = disk, smoke test PASS.

---

## P1 — Stabilizasyon (2–4 hafta)

> **Hedef:** Orta trafikte yavaşlama/503 riski azaltılır; operasyon güvenilir hale gelir.

### P1.1 Performans / DB

- [x] **PG pool tuning** — `max`, `idleTimeoutMillis`, env ile yapılandır (`connection.ts`)
- [x] **Geo indeks** — `map_businesses(latitude, longitude)` composite veya GiST
- [x] **Sipariş indeksleri** — `delivery_orders(vendor_id, status)`, `order_number`, `customer_phone`
- [x] **Transport indeksleri** — `transport_requests(status, created_at)`
- [x] **Healthcheck DB ping** — `/api/healthz` içinde `SELECT 1`
- [x] **`/map/businesses/export` LIMIT** veya admin-only

### P1.2 Altyapı

- [x] **Cron/worker ayrımı** — RSS, IMAP, Keşfet scraper → ayrı Railway servis veya PostgreSQL advisory lock
- [x] **Replica güvenliği** — in-memory rate limit → Redis/Upstash (`UPSTASH_REDIS_REST_*` ile paylaşımlı store; yoksa MemoryStore)
- [x] **Graceful shutdown** — pool.end(), scheduler stop; Railway `drainingSeconds` ile uyum (25s vs 20s)
- [x] **pg_dump yedekleme** — haftalık cron veya Railway backup dokümante (`docs/RAILWAY-POSTGRES-BACKUP.md`)

### P1.3 Frontend

- [x] **Route-based code splitting** — `App.tsx` eager import → lazy (admin, Kesfet, Haritalar ayrı chunk)
- [x] **Haber sayfası API birleştirme** — `GET /api/news/page-bundle/:slug` (makale + ilgili + köşe + sidebar); `HaberDetay.tsx` tek çağrı
- [x] **Turizm/blog HTML sanitize** — `TurizmBlogPages.tsx`, `TurizmEtkinlikDetailPage.tsx`

### P1.4 Test / CI

- [x] **`test` script + vitest** — en az auth, webhook, delivery status transition
- [x] **Typecheck CI** — `pnpm run typecheck` PR gate
- [x] **Deploy smoke** — Netlify + Render post-deploy (`deploy-smoke.yml` workflow_dispatch)

**P1 çıkış kriteri:** 500 eşzamanlı vitrin isteği <2s p95; 2 replica cron çift çalışmıyor; ilk bundle <500KB gzip (hedef).

---

## P2 — Ürün tamamlama (1–2 ay)

> **Hedef:** MVP+ sonrası eksik dikeyler ve mobil hazırlık.

### P2.1 Teslimat / e-ticaret

- [x] **Stok düşümü** — sipariş oluşturmada `vendor_menu_items.stock` / `products.stock` azalt (`order-stock.ts`, delivery + shop checkout)
- [ ] **Otomatik kurye dispatch** (opsiyonel MVP+) — mesafe/bölge bazlı atama
- [x] **Birleşik pazaryeri checkout** — `POST /delivery/marketplace/checkout`; çok satıcılı sepet → mağaza başına `delivery_orders`
- [x] **PayTR teslimat webhook** — `paytr_webhook_events` audit + idempotency; başarıda `confirmed` + `payment_failed` kaydı
- [x] **Alışveriş mağazada blog** — `EcomSatici` → vendor blog API bağlantısı

### P2.2 Ulaşım (Faz 3 — roadmap hizası)

- [ ] **Dinamik ücret** — mesafe/zaman bazlı sunucu hesabı
- [ ] **Sağlayıcı eşleme** — konum/kapasite filtresi (ilk kabul değil)
- [ ] **Sürücü GPS** — transport canlı konum endpoint’i
- [ ] **Push notification** — FCM (teslimat + ulaşım); mevcut harita FCM altyapısını genelleştir
- [ ] **Belge doğrulama akışı** — sürücü/kurye onboarding

### P2.3 Mobil

- [ ] **API v1 prefix** — `/api/v1/delivery/*` stabil sözleşme
- [ ] **Mobil auth dokümantasyonu** — JWT Bearer, refresh stratejisi
- [ ] **Foreground GPS kurye SDK rehberi**

### P2.4 Operasyon / ürün

- [ ] **`/is-ortagi` dinamik fiyat** — admin USD + kur → vitrin TRY
- [ ] **İşletme bildirim geçmişi** — platform broadcast okunmuş/okunmamış panel sekmesi
- [ ] **Admin toplu mesaj audit log**

**P2 çıkış kriteri:** Mobil client uçtan uca sipariş + kurye + ulaşım talep akışı; pazaryeri stub yok.

---

## P3 — Ölçek & kalite (sürekli)

- [ ] **YouTube stream proxy → direct URL / CDN** — egress riski azalt
- [ ] **Harita modül parçalama** — `map.ts` (12K satır) alt router’lara böl
- [ ] **Monitoring** — Sentry/Datadog, PG slow query log, Railway metrics alert
- [ ] **Load test** — k6/Artillery: `/haberler`, `/kesfet`, `/delivery/vendors`
- [ ] **Güvenlik periyodik** — npm audit, dependency update, pentest
- [ ] **Yatay ölçekleme** — 2+ replica + worker + Redis state

---

## Haftalık uygulama planı (öneri)

### Hafta 1
| Gün | Odak | Çıktı |
|-----|------|-------|
| 1–2 | P0.1 migrate + CRUD auth | PR #security-migrate |
| 3 | P0.1 Geliver + sipariş IDOR | PR #security-webhook-idor |
| 4 | P0.2 migration journal | PR #db-journal-sync |
| 5 | P0.3 transport 500 + stub gizleme | Canlı smoke PASS |

### Hafta 2
| Gün | Odak | Çıktı |
|-----|------|-------|
| 1–2 | P1.1 pool + geo indeks migration | PR #perf-indexes |
| 3 | P1.2 cron advisory lock veya env flag | Tek replica cron |
| 4 | P1.3 frontend lazy routes (admin, Kesfet) | Vercel bundle küçülme |
| 5 | P1.4 vitest + smoke CI | GitHub Action yeşil |

### Hafta 3–4
- P2.1 stok düşümü + Checkout Stripe
- P2.2 ulaşım dinamik ücret taslağı
- Soft launch: yemek siparişi + haber + harita (pazaryeri kapalı)

---

## Canlıya çıkış modları

### Mod A — Soft launch (önerilen, P0 sonrası)
**Açık:** Ana sayfa, haber, harita, yemek/market siparişi, kurye paneli, işletme paneli  
**Kapalı/gizli:** Birleşik `/magaza`, eski `/odeme`, ulaşım (500 düzelene kadar)  
**Ops:** Manuel kurye atama, Stripe/PayTR yapılandırması zorunlu

### Mod B — Tam dikey launch (P2 sonrası)
Tüm modüller + mobil client + push

### Mod C — Sadece vitrin (acil)
Haber + harita + vitrin; sipariş formları “yakında”

---

## Smoke test checklist

```bash
cd goalgo
WEB_ORIGIN=https://yekpare.net \
API_ORIGIN=https://goalgo-production.up.railway.app \
CALL_ORIGIN=https://call.yekpare.net \
pnpm run deploy:smoke
```

Manuel:
- [ ] Admin giriş + session kalıcılığı
- [ ] Sipariş ver → takip → kurye GPS haritada
- [ ] `/kesfet` bbox < 3 sn
- [ ] `/haberler` < 5 sn
- [ ] Stripe test ödeme (teslimat + mağaza)
- [ ] IMAP senkron (admin posta)
- [ ] Sitemap 200

---

## Risk register (üst 10)

| # | Risk | Olasılık | Etki | Mitigasyon |
|---|------|----------|------|------------|
| 1 | Auth’suz migrate/CRUD exploit | Orta | Kritik | P0.1 |
| 2 | Sipariş PII sızıntısı (IDOR) | Yüksek | Kritik | P0.1 |
| 3 | Migration journal drift → eksik tablo | Yüksek | Kritik | P0.2 |
| 4 | PG pool exhaustion | Yüksek | Yüksek | P1.1 |
| 5 | Harita geo seq scan | Yüksek | Yüksek | P1.1 |
| 6 | Cron çift çalışma (2 replica) | Orta | Orta | P1.2 |
| 7 | YouTube proxy egress | Orta | Yüksek | P3 |
| 8 | Frontend mega-bundle LCP | Yüksek | Orta | P1.3 |
| 9 | Pazaryeri stub kullanıcı güven kaybı | Yüksek | Orta | P0.3 |
| 10 | DB yedek yok | Düşük | Kritik | P1.2 |

---

## Sorumluluk matrisi (öneri)

| Alan | Sorumlu | İlk teslim |
|------|---------|------------|
| Güvenlik P0 | Backend dev | Hafta 1 |
| DB migration | Backend + ops | Hafta 1 |
| Performans P1 | Backend dev | Hafta 2 |
| Frontend bundle | Frontend dev | Hafta 2 |
| Ulaşım Faz 3 | Full-stack | Hafta 3–6 |
| Mobil API sözleşmesi | Backend + mobil | Hafta 4 |
| Ops / backup | DevOps | Hafta 2 |

---

## İlerleme takibi

Bu dosyadaki `- [ ]` maddelerini tamamlandıkça `- [x]` işaretleyin. Her P fazı bitince:

1. `pnpm run deploy:smoke` PASS
2. Canlı regression (sipariş, haber, harita)
3. Bu dosyada “P0 tamamlandı — tarih” notu

---

*Son güncelleme: 2 Temmuz 2026 — Production readiness denetimi sentezi*
