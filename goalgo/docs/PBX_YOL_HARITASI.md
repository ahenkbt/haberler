# PBX / Çağrı Merkezi Yol Haritası

> **Son güncelleme:** Haziran 2026  
> **Amaç:** Asterisk VPS olmadan yekpare.net altyapısında insan temsilcili Klasik PBX; `call.yekpare.net` (AgentLabs AI Call) ile birlikte çalışır, birbirini devre dışı bırakmaz.  
> **İlgili:** [PBX_KURULUM.md](./PBX_KURULUM.md) (kurulum ve API özeti)

---

## 1. call.yekpare.net — Mevcut Durum

> **Standalone PBX (Goalgo PG):** Faz 1 admin sayfaları (`PbxAgents`, `PbxCampaigns`, `PbxIvr`) bağımsız PBX çalışmasıyla tamamlandı — `/admin/pbx/temsilci`, `/admin/pbx/kampanya`, `/admin/pbx/ivr`. Bu sayfalar Goalgo PostgreSQL (`pbx_*`) ve `/api/pbx/*` üzerinden çalışır; `call.yekpare.net` (AgentLabs) ile aynı modül değildir. **Durum:** ✅ Faz 1 admin UI tamamlandı (Haziran 2026).

### Erişilebilir sayfalar

| URL | İçerik |
|-----|--------|
| `https://call.yekpare.net/` | Türkçe pazarlama landing (Yekpare AI Call Center) |
| `https://call.yekpare.net/login` | Giriş / Kayıt (e-posta + şifre) |
| `https://call.yekpare.net/app` | Oturum yoksa `/login` adresine yönlendirir |

### UI dili

- Landing ve login **Türkçe** (marka: “Yekpare AI Call Center”)
- Cookie banner ve bazı alt metinler **İngilizce** (“By continuing…”, “Cookie Preferences”)
- Railway’de `VITE_DEFAULT_LOCALE=tr` ile build edilmiş; eksik çeviriler İngilizce’ye düşer

### AgentLabs v5.3.8 — kutudan çıkan özellikler

**Önemli:** `call.yekpare.net` bir **AI çağrı merkezi** platformudur; **insan temsilci PBX değildir.**

| Modül | Özellik |
|-------|---------|
| AI Asistanlar | Natural / Flow / Incoming agent tipleri |
| Kampanyalar | CSV import, zamanlama, outbound/inbound |
| Akış oluşturucu | Görsel IVR-benzeri AI konuşma akışları |
| Telefon | Twilio numaraları, 100+ ülke |
| SIP Engine eklentisi | ElevenLabs SIP + OpenAI SIP (AI aramalar için) |
| Mesajlaşma | WhatsApp entegrasyonu |
| Ekip eklentisi | Rol tabanlı admin/ekip üyeleri (çağrı temsilcisi değil) |
| REST API | Harici entegrasyon |
| Analitik / CRM / Webhook | İzleme ve otomasyon |

**İnsan temsilci PBX’te olmayanlar:** dahili hesaplar, kuyruk ACD, agent durumları (Molada, Çağrı Bekliyor), canlı supervisor paneli, predictive dialer, tarayıcı softphone.

---

## 2. Kod Tabanı — Mimari

```
┌─────────────────────────────────────────────────────────────────┐
│  yekpare.net (Vercel — Ahenkpress)                              │
│  /admin/yekpare-ai-call  → AI Call admin kabuğu (TR)            │
│  /call-center-app/*      → AgentLabs SPA vekili (abonelik kapısı)│
│  /admin/pbx/*            → Klasik PBX admin (TR)                │
│  /pbx                    → Temsilci girişi                      │
│  /pbx/panel              → Temsilci paneli                      │
└──────────────┬──────────────────────────────┬───────────────────┘
               │ /api/* → Railway              │ AGENTLABS_URL vekili
               ▼                               ▼
┌──────────────────────────┐    ┌──────────────────────────────────┐
│  Goalgo API (Servis A)   │    │  call.yekpare.net (Servis B)     │
│  /api/call-center/*      │───▶│  AgentLabs v5.3.8                │
│  /api/pbx/*              │    │  postgres-ai-call (Railway PG)   │
│  pbx_* tabloları (PG)    │    │  Eklentiler: sip, messaging,     │
└──────────────┬───────────┘    │  team, rest-api                  │
               │ (Faz 2+)        └──────────────────────────────────┘
               ▼
┌──────────────────────────┐
│  pbx-gateway (Servis C)  │  ← SIP köprüsü / WebRTC (Asterisk YOK)
│  :3099                   │
└──────────────────────────┘
```

### Bileşen özeti

| Bileşen | Konum | Rol |
|---------|-------|-----|
| **Ahenkpress** | Vercel | Türkçe admin (`/admin/pbx/*`) + temsilci portalı (`/pbx`) |
| **api-server** | Railway Servis A | `/api/pbx/*` CRUD, agent JWT, canlı izleme (SSE), demo seed |
| **PostgreSQL** | Railway (Goalgo ana PG) | `pbx_*` tabloları — trunk, dahili, kuyruk, temsilci, kampanya, IVR, CDR |
| **pbx-gateway** | Railway Servis C (planlı) | SIP sinyalizasyon köprüsü + WebSocket softphone |
| **AgentLabs** | Railway Servis B | AI kampanya, SIP trunk (AI), akış editörü — `call.yekpare.net` |
| **agentlabs-bridge** | api-server | Opsiyonel: `AGENTLABS_*` tanımlıysa PBX verisini AgentLabs’tan okur |

### Önemli dosyalar

| Alan | Yol |
|------|-----|
| PBX migration | `goalgo/lib/db/migrations/0090_pbx_foundation.sql` |
| PBX API routes | `goalgo/artifacts/api-server/src/routes/pbx.ts` |
| PBX servis katmanı | `goalgo/artifacts/api-server/src/lib/pbx/` |
| Admin UI | `goalgo/artifacts/ahenkpress/src/pages/admin/pbx/` |
| Temsilci portalı | `goalgo/artifacts/ahenkpress/src/pages/agent/` |
| SIP köprüsü | `goalgo/artifacts/pbx-gateway/` |
| AgentLabs paketi | `goalgo/ai-call-center/AgentLabs-Package/AgentLabs-v5.3.8/` |
| AI Call admin kabuğu | `goalgo/artifacts/ahenkpress/src/pages/admin/yekpare-ai-call/` |

### Mevcut implementasyon durumu (Haziran 2026)

| Alan | Durum |
|------|--------|
| Postgres şema + CRUD API | ✅ |
| Admin: Trunk, Dahili, Kuyruk, Canlı İzleme, Genel Bakış | ✅ |
| Admin: Temsilci (`PbxAgents`), Kampanya (`PbxCampaigns`), IVR (`PbxIvr`) | ✅ (Faz 1 UI tamamlandı) |
| Temsilci giriş + durum paneli (`/pbx`) | ✅ demo mod |
| Gerçek SIP / ses / ACD | ❌ Faz 2–3 |
| IVR çalıştırma motoru | ❌ Faz 4 |
| AI ↔ PBX transfer köprüsü | 🚧 Faz 5 kısmi (Haziran 2026) |

---

## 3. Gap Analizi

| Kullanıcı İsteği | Mevcut | Gap |
|------------------|--------|-----|
| Türkçe admin + agent | ✓ Kısmen | KPI/rapor kartları, CDR ekranları eksik |
| SIP trunk yönetimi | ✓ CRUD (DB) | Gerçek trunk REGISTER / ses yok |
| Dahili hesaplar | ✓ CRUD | SIP register yok |
| Agent login `/pbx` | ✓ | JWT + demo seed; gerçek softphone Faz 2 |
| Manuel + kampanya kuyruğu | API + admin UI var | Dialer worker + gerçek kuyruk dağıtımı yok |
| Canlı izleme (Kuyruk / Agent) | ✓ UI + demo veri | Gerçek zamanlı gerçek çağrı yok |
| IVR | API + `flow_json` + admin UI | Çalıştırma motoru yok |
| Türk CC dashboard | Kısmen | SLA, abandon, AHT, CDR raporları eksik |
| call.yekpare.net entegrasyonu | `AGENTLABS_URL` vekili | PBX ↔ AgentLabs transfer köprüsü yok |
| Asterisk VPS yok | Mimari uygun | `pbx-gateway` Railway deploy edilmeli |

---

## 4. Mimari Karar — Asterisk YOK

**Asterisk, FreePBX ve Issabel kullanılmayacak.** Ses ve sinyalizasyon `pbx-gateway` SIP köprüsü üzerinden; durum ve yapılandırma Goalgo PostgreSQL (`pbx_*` tabloları) üzerinden yönetilir.

| Katman | Teknoloji | Konum |
|--------|-----------|-------|
| UI | Ahenkpress (mevcut) | Vercel |
| PBX API + state | `api-server` + `pbx_*` PG | Railway Servis A |
| AI Call | AgentLabs v5.3.8 | Railway Servis B (`call.yekpare.net`) |
| Ses / SIP | `pbx-gateway` (sip.js + RTP) | Railway Servis C |
| Trunk | SIP sağlayıcı (Netgsm, Twilio Elastic SIP vb.) | Harici |

**Veritabanı ayrımı korunur:**

- `postgres-ai-call` → AgentLabs (AI state; değiştirilmez)
- Goalgo ana PG → `pbx_*` tabloları (insan PBX state)

`pbx-gateway` içindeki `ami-client.ts` ve `ASTERISK_AMI_*` env değişkenleri **legacy / kullanılmıyor**; yeni geliştirmede referans alınmamalı.

---

## 5. Faz Planı

### Faz 0 — Dokümantasyon hizalama (1 hafta)

**Hedef:** Ekip ve deploy dokümanlarını gerçek koda uydurmak.

| # | Yapılacak | Çıktı |
|---|-----------|--------|
| 0.1 | `PBX_YOL_HARITASI.md` (bu belge) | Strateji referansı |
| 0.2 | `PBX_KURULUM.md` Asterisk’siz mimariye hizala | Kurulum doğruluğu |
| 0.3 | `.env.example` dosyalarında `PBX_BRIDGE_*`, `PBX_JWT_SECRET` netleştir | Deploy hatası azaltma |
| 0.4 | `api-server/.env.example` içindeki “Asterisk AMI” ifadesini kaldır | Yanlış yönlendirme önleme |

**Railway env:** Değişiklik yok  
**Bağımlılık:** Yok

---

### Faz 1 — PBX Admin UI tamamlama (2–3 hafta)

**Durum:** ✅ **Tamamlandı** (Haziran 2026)

**Hedef:** Türkçe admin panelinde eksik modüller.

| # | Yapılacak | Durum |
|---|-----------|--------|
| 1.1 | `PbxAgents.tsx` — temsilci CRUD, kuyruk atama | ✅ |
| 1.2 | `PbxCampaigns.tsx` — kampanya oluşturma, kişi listesi | ✅ |
| 1.3 | `PbxIvr.tsx` — IVR akış editörü (JSON / DTMF dallanma) | ✅ |
| 1.4 | `App.tsx` route’ları: `/admin/pbx/kampanya`, `/ivr`, `/temsilci` | ✅ |
| 1.5 | `PbxOverview` — KPI kartları (SLA, abandon, AHT) | 🚧 İyileştirme devam edebilir |

**Kalan iş (Faz 1+):** Kampanya CSV import UI, IVR görsel editör, gelişmiş dashboard metrikleri.

**Dosyalar:**

- `goalgo/artifacts/ahenkpress/src/pages/admin/pbx/Pbx*.tsx`
- `goalgo/artifacts/ahenkpress/src/lib/pbxApi.ts`
- `goalgo/artifacts/ahenkpress/src/App.tsx`

**Railway env (Servis A):**

```env
PBX_JWT_SECRET=<openssl rand -base64 48>
```

**Bağımlılık:** Faz 0

---

### Faz 2 — pbx-gateway Railway deploy + SIP köprüsü (3–4 hafta)

**Hedef:** Demo moddan çıkış; gerçek trunk + tarayıcı softphone.

| # | Yapılacak |
|---|-----------|
| 2.1 | `pbx-gateway` → Railway Servis C (`Dockerfile`, `railway.toml`) |
| 2.2 | `sip-bridge.ts`: sip.js WebRTC + SIP REGISTER |
| 2.3 | Trunk CRUD → gateway senkron (Postgres → gerçek kayıt) |
| 2.4 | `api-server` `agent/dial`, `agent/hangup` → gateway vekili |
| 2.5 | `AgentPanel.tsx` + `SoftphoneSkeleton.tsx` → gerçek sip.js |
| 2.6 | Üretimde `PBX_DEMO_MODE=false` |

**Dosyalar:**

- `goalgo/artifacts/pbx-gateway/`
- `goalgo/artifacts/api-server/src/lib/pbx/service.ts`
- `goalgo/artifacts/ahenkpress/src/pages/agent/SoftphoneSkeleton.tsx`

**Bağımlılık:** Faz 1, SIP sağlayıcı hesabı

**Risk:** Railway UDP/RTP kısıtları → Twilio Elastic SIP + WebRTC veya ayrı RTP proxy gerekebilir.

---

### Faz 3 — Kuyruk ACD + kampanya dialer (3–4 hafta)

**Hedef:** Otomatik kampanya kuyruğu + gerçek canlı izleme.

| # | Yapılacak |
|---|-----------|
| 3.1 | `pbx-gateway` içinde basit ACD: kuyruk → müsait agent → ring |
| 3.2 | Kampanya worker: `pbx_campaign_contacts` → sırayla originate |
| 3.3 | Canlı kuyruk/agent tabloları → gateway olayları (simüle değil) |
| 3.4 | SSE `/api/pbx/admin/live/stream` → gerçek event akışı |
| 3.5 | `pbx_call_logs` otomatik CDR yazımı |

**Dosyalar:**

- `goalgo/artifacts/pbx-gateway/src/acd/` (yeni)
- `goalgo/artifacts/api-server/src/lib/pbx/service.ts`
- `goalgo/artifacts/api-server/src/lib/pbx/realtime.ts`

**Bağımlılık:** Faz 2

---

### Faz 4 — IVR motoru (2–3 hafta)

**Hedef:** Gelen aramalarda DTMF menü.

| # | Yapılacak |
|---|-----------|
| 4.1 | `pbx_ivr_flows.flow_json` şeması: `play → gather → branch → queue\|agent\|hangup` |
| 4.2 | Gateway inbound handler: DID → IVR → kuyruk |
| 4.3 | Admin IVR editörünü (Faz 1) runtime’a bağla |
| 4.4 | MOH (bekleme müziği) trunk üzerinden |

**Bağımlılık:** Faz 3

---

### Faz 5 — AI Call ↔ PBX entegrasyonu (2–3 hafta)

**Durum:** 🚧 **Kısmi tamamlandı** (Haziran 2026) — webhook aktarım, admin hibrit ayarları, demo mod; gerçek ses köprüsü Faz 2–3’e bağlı.

**Hedef:** AgentLabs “canlı temsilciye aktar” → PBX kuyruğu.

| # | Yapılacak | Durum |
|---|-----------|--------|
| 5.1 | AgentLabs Flow **Transfer Node** → webhook → `/api/pbx/transfer-in` | ✅ API + demo mock |
| 5.2 | Global hibrit toggle + kampanya `routing_mode` | ✅ |
| 5.3 | AI kampanya ↔ PBX kuyruk eşlemesi admin UI | ✅ `/admin/yekpare-ai-call/hibrit` |
| 5.4 | Temsilci panelinde AI özeti + kabul | ✅ demo |
| 5.5 | Canlı izlemede **AI Aktarım** rozeti | ✅ |
| 5.6 | Ortak trunk meta senkron | ❌ |
| 5.7 | Birleşik dashboard widget (AI + insan metrikleri) | ❌ |

**Dosyalar:**

- `goalgo/lib/db/migrations/0091_pbx_hybrid.sql`
- `goalgo/artifacts/api-server/src/lib/pbx/hybrid.ts`
- `goalgo/artifacts/api-server/src/routes/pbx.ts`
- `goalgo/artifacts/ahenkpress/src/pages/admin/pbx/PbxHybrid.tsx`
- `goalgo/artifacts/ahenkpress/src/pages/agent/AgentPanel.tsx`

**Railway:** Mevcut `AGENTLABS_*` env’ler yeterli; webhook URL Goalgo API’ye işaret etmeli. İsteğe bağlı: `PBX_TRANSFER_WEBHOOK_SECRET`.

**Bağımlılık:** Faz 3 (gerçek ACD); demo modda Faz 5 test edilebilir.

#### Hibrit kurulum rehberi

1. **Admin:** `/admin/yekpare-ai-call/hibrit` → **Hibrit Mod** anahtarını açın.
2. **Varsayılan kuyruk:** Destek veya Satış kuyruğunu seçin.
3. **AI eşlemesi:** AgentLabs kampanya ID’sini PBX kuyruğu ile eşleyin; mod: *Hibrit (AI önce, sonra aktar)*.
4. **AgentLabs akışı:** Transfer / Webhook düğümünde URL:
   - `POST https://<RAILWAY-API>/api/pbx/transfer-in`
   - Gövde: `{ "call_id", "phone", "campaign_id", "summary", "context" }`
   - Başlık (opsiyonel): `X-PBX-Transfer-Secret: <secret>`
5. **Temsilci:** `/pbx` → giriş → panelde **AI'dan Aktarılan Arama** kartı.
6. **Demo test:** Hibrit sayfasında *Demo aktarım gönder* → Canlı İzleme + temsilci paneli.

**Yönlendirme modları:**

| Mod | Davranış |
|-----|----------|
| `ai_only` | Yalnızca AI; PBX aktarımı reddedilir |
| `human_only` | Doğrudan insan PBX (klasik) |
| `hybrid` | AI önce konuşur; transfer tetiklenince PBX kuyruğu |

---

### Faz 6 — Üretim sertleştirme (1–2 hafta)

**Hedef:** SLA, güvenlik, izleme.

| # | Yapılacak |
|---|-----------|
| 6.1 | Rate limit — agent login |
| 6.2 | Trunk şifreleri şifreli saklama (PG `pgcrypto`) |
| 6.3 | Health: `/api/pbx/public/status`, gateway `/api/health` |
| 6.4 | `deploy:smoke` script’ine PBX kontrolleri |
| 6.5 | Demo seed’i üretimde kapat (`demo_mode=false`) |

**Bağımlılık:** Faz 2–5 (paralel dokümantasyon Faz 0 ile birlikte)

---

## 6. Railway Ortam Değişkenleri

### Servis A — Goalgo API (Railway)

| Değişken | Zorunlu | Açıklama |
|----------|---------|----------|
| `DATABASE_URL` | ✓ | Goalgo PostgreSQL (`pbx_*` tabloları) |
| `PBX_JWT_SECRET` | ✓ | Temsilci JWT imzalama (min 16 karakter) |
| `AGENTLABS_URL` | AI entegrasyonu | `https://call.yekpare.net` |
| `AGENTLABS_API_KEY` | AI entegrasyonu | Servis hesabı JWT |
| `AGENTLABS_SERVICE_EMAIL` | Alternatif | E-posta + şifre ile oturum |
| `AGENTLABS_SERVICE_PASSWORD` | Alternatif | |
| `PBX_BRIDGE_URL` | Faz 2+ | `https://pbx-gateway.up.railway.app` |
| `PBX_BRIDGE_WS_URL` | Faz 2+ | `wss://pbx-gateway.up.railway.app/ws` |
| `PBX_TRANSFER_WEBHOOK_SECRET` | Faz 5 | AgentLabs → `/api/pbx/transfer-in` imza |
| `API_PUBLIC_URL` | Faz 5 | Webhook URL üretimi (ör. `https://api.yekpare.net`) |

### Servis B — AgentLabs / call.yekpare.net (Railway)

| Değişken | Zorunlu | Açıklama |
|----------|---------|----------|
| `DATABASE_URL` | ✓ | `postgres-ai-call` |
| `APP_URL` | ✓ | `https://call.yekpare.net` |
| `SESSION_SECRET` | ✓ | Oturum |
| `JWT_SECRET` | ✓ | API token |
| `VITE_DEFAULT_LOCALE` | Önerilen | `tr` |
| Twilio / ElevenLabs / OpenAI anahtarları | Özellik bazlı | AI arama motorları |

### Servis C — pbx-gateway (Railway, Faz 2+)

| Değişken | Zorunlu | Açıklama |
|----------|---------|----------|
| `PORT` | ✓ | `3099` |
| `PBX_JWT_SECRET` | ✓ | Servis A ile **aynı** secret |
| `API_SERVER_URL` | ✓ | Goalgo API kök URL |
| `PBX_DEMO_MODE` | ✓ | Üretimde `false` |
| `PBX_WS_PATH` | | `/ws` (varsayılan) |
| `PBX_SIP_TRUNK_HOST` | Faz 2+ | SIP sunucu |
| `PBX_SIP_TRUNK_USER` | Faz 2+ | Trunk kullanıcı |
| `PBX_SIP_TRUNK_PASS` | Faz 2+ | Trunk şifre |

### Vercel (yekpare.net)

| Değişken | Açıklama |
|----------|----------|
| `RAILWAY_API_ORIGIN` | Goalgo API vekili |
| `AGENTLABS_URL` | AI Call SPA vekili (`/call-center-app/*`) |

---

## 7. Öncelik Sırası

1. **Faz 2** — SIP köprüsü (bloklayıcı: ses olmadan PBX tamamlanmış sayılmaz)
2. **Faz 3** — Kuyruk + kampanya dialer (asıl çağrı merkezi değeri)
3. **Faz 4** — IVR motoru
4. **Faz 5** — AI Call ↔ PBX entegrasyonu
5. **Faz 6** — Üretim sertleştirme
6. **Faz 0** — Dokümantasyon (devam eden hizalama)

**Toplam tahmini süre (Faz 2–6):** 12–17 hafta (1 geliştirici)

---

## 8. Riskler ve Engeller

| Risk | Etki | Azaltma |
|------|------|---------|
| Railway UDP/RTP desteği | Gerçek ses çalışmaz | Twilio Programmable SIP + WebRTC; veya RTP proxy |
| Asterisk’siz ACD karmaşıklığı | Gecikme | `pbx-gateway` minimal scope; kanıtlanmış kütüphaneler (sip.js, drachtio) |
| İki ayrı DB | Veri tutarsızlığı | PBX state Goalgo PG; AI state AgentLabs PG; webhook ile senkron |
| Demo veri canlıda kalması | Yanlış metrik | `PBX_DEMO_MODE=false` + gerçek event pipeline |
| AgentLabs UI İngilizce kalıntıları | UX | `VITE_DEFAULT_LOCALE=tr` + çeviri seed |
| Legacy AMI kodu | Yanlış deploy beklentisi | Dokümantasyon + env temizliği (Faz 0) |

---

## 9. Demo / Test Planı

### Demo (hemen test edilebilir)

```bash
cd goalgo
pnpm install
pnpm run dev:api    # :3000
pnpm run dev:web    # Ahenkpress
# Opsiyonel: pnpm run dev:pbx  # :3099 SIP köprüsü demo
```

| Yüzey | URL | Kimlik bilgileri |
|-------|-----|------------------|
| Admin PBX | `https://yekpare.net/admin/pbx` | Yönetici oturumu + `comms` izni |
| Temsilci girişi | `https://yekpare.net/pbx` | `ayse` / `agent123` |
| Temsilci paneli | `/pbx/panel` | Giriş sonrası |
| AI Call | `https://call.yekpare.net/login` | AgentLabs hesabı |

**Ek demo temsilciler:** `mehmet` / `agent123` (102), `zeynep` / `agent123` (103)

### Faz 1 sonrası (mevcut)

- [x] Temsilci oluştur, kuyruğa ata (`/admin/pbx/temsilci`)
- [x] Kampanya oluştur (`/admin/pbx/kampanya`)
- [x] IVR akışı kaydet (`/admin/pbx/ivr`)

### Faz 2 sonrası

- [ ] Trunk kaydı başarılı (SIP OPTIONS 200)
- [ ] Agent tarayıcıdan gerçek arama yap
- [ ] CDR `pbx_call_logs` tablosuna düşüyor

### Faz 3 sonrası

- [ ] Kampanya otomatik sıra araması
- [ ] Canlı izleme gerçek bekleyen sayısı gösteriyor
- [ ] Agent Molada → kuyruktan çıkıyor

### Faz 5 sonrası (kısmi — demo)

- [x] Hibrit mod admin toggle (`/admin/yekpare-ai-call/hibrit`)
- [x] AI kampanya ↔ PBX kuyruk eşlemesi
- [x] Demo aktarım webhook (`POST /api/pbx/admin/transfer-in/mock`)
- [x] Temsilci panelinde AI özeti + kabul
- [x] Canlı izlemede **AI Aktarım** rozeti
- [ ] Gerçek AgentLabs transfer → sesli köprü (Faz 2–3)
- [ ] `call.yekpare.net` health + birleşik metrik widget

### Üretim smoke

```bash
WEB_ORIGIN=https://yekpare.net \
API_ORIGIN=https://RAILWAY-API \
CALL_ORIGIN=https://call.yekpare.net \
pnpm run deploy:smoke
```

---

## 10. Öneriler

1. **Asterisk yolunu terk edin** — Tüm ekip beklentisini `pbx-gateway` + PostgreSQL mimarisine çekin.
2. **Faz 2’ye odaklanın** — Admin UI hazır; ses köprüsü bir sonraki bloklayıcı adım.
3. **Faz 2 öncesi SIP sağlayıcı seçin** — Netgsm / Verimor / Twilio Elastic SIP; Railway RTP kısıtını erken test edin.
4. **AI ve insan PBX’i birleştirmeyin** — Ayrı modüller kalsın; Faz 5’te yalnızca transfer webhook ile köprüleyin.
5. **`call.yekpare.net` doğrudan kullanın** — AgentLabs workspace için `/call-center-app` vekili isteğe bağlı; `APP_URL` üzerinden açmak daha az karmaşık.

---

## İlgili dokümanlar

| Belge | İçerik |
|-------|--------|
| [PBX_KURULUM.md](./PBX_KURULUM.md) | Kurulum, env, API uç noktaları |
| [BULUT_KURULUM.md](./BULUT_KURULUM.md) | Genel Railway / Vercel deploy |
| `goalgo/artifacts/pbx-gateway/README.md` | SIP köprüsü hızlı başlangıç |
