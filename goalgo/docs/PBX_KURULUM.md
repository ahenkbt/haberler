# PBX / Çağrı Merkezi — call.yekpare.net Entegrasyonu

Goalgo **PBX** modülü artık **AgentLabs** (`call.yekpare.net`) üzerinden çalışır. Ayrı Asterisk VPS veya `pbx-gateway` (AMI) gerekmez.

## Railway mimarisi

```
┌─────────────────────┐     ┌──────────────────────────┐     ┌─────────────────────┐
│  yekpare.net        │     │  goalgo (Railway)        │     │  desirable-cooperation│
│  Vercel + proxy     │────▶│  Yekpare API             │────▶│  call.yekpare.net   │
│  /admin/yekpare-ai- │     │  /api/call-center/proxy/*│     │  AgentLabs v5       │
│  call, /pbx         │     │  /api/pbx/*              │     │                     │
└─────────────────────┘     └────────────┬─────────────┘     └──────────┬──────────┘
                                         │                               │
                                         │ Goalgo Postgres               │ postgres-ai-call
                                         │ (site_settings, abonelik)     │ (AgentLabs DB)
                                         └───────────────────────────────┘
```

| Servis | Railway projesi | Alan adı | Veritabanı |
|--------|-----------------|----------|------------|
| Ana portal + API vekili | `goalgo` | yekpare.net | `Postgres` (Goalgo) |
| AgentLabs AI Call | `desirable-cooperation` | call.yekpare.net | `postgres-ai-call` |
| PBX verisi | — | — | **postgres-ai-call** (AgentLabs API üzerinden; doğrudan erişim yok) |

## Ortam değişkenleri

### goalgo (Yekpare API — Railway)

```env
AGENTLABS_URL=https://call.yekpare.net
AGENTLABS_API_KEY=eyJhbGciOiJIUzI1NiIs…
# veya otomatik oturum:
AGENTLABS_SERVICE_EMAIL=call-service@firma.com
AGENTLABS_SERVICE_PASSWORD=••••••••
AGENTLABS_HEALTH_PATH=/api/health
```

### Vercel (yekpare.net frontend proxy)

```env
AGENTLABS_URL=https://call.yekpare.net
RAILWAY_API_ORIGIN=https://goalgo-production.up.railway.app
```

### desirable-cooperation (AgentLabs)

```env
DATABASE_URL=postgresql://…@postgres-ai-call.railway.internal/…
# AgentLabs standart env — goalgo/ai-call-center dokümantasyonuna bakın
```

> **Not:** `PBX_GATEWAY_URL` ve `ASTERISK_AMI_*` artık kullanılmıyor. Eski `pbx-gateway` servisi kaldırılabilir.

## Admin paneli

Tüm PBX bölümleri **`/admin/yekpare-ai-call`** altında:

| Yol | Açıklama |
|-----|----------|
| `/admin/yekpare-ai-call/pbx` | Özet (Toplam Kayıt, Aktif/İptal/Susped kartları) |
| `/admin/yekpare-ai-call/canli` | Canlı izleme — Kuyruk + Agent tabloları |
| `/admin/yekpare-ai-call/sip-trunk` | SIP trunk (AgentLabs sip-engine) |
| `/admin/yekpare-ai-call/dahili` | Ekip üyeleri / dahililer |
| `/admin/yekpare-ai-call/kuyruk` | Kampanya kuyrukları |
| `/admin/yekpare-ai-call/kampanya` | Kampanya listesi |
| `/admin/yekpare-ai-call/ivr` | IVR / akış listesi |
| `/admin/yekpare-ai-call/ekip` | Ekip yönetimi (team-management) |

Eski `/admin/pbx/*` yolları otomatik yönlendirilir.

Tam AgentLabs UI: **`/call-center-app/app`** (Vercel vekili, abonelik gerekli).

## API vekili

| Yekpare API | Upstream (call.yekpare.net) |
|-------------|----------------------------|
| `GET /api/call-center/proxy/team/members` | `/api/team/members` |
| `GET /api/call-center/proxy/sip/trunks` | `/api/sip/trunks` |
| `GET /api/call-center/proxy/campaigns` | `/api/campaigns` |
| `GET /api/call-center/proxy/calls` | `/api/calls` |
| `GET /api/call-center/proxy/flow-automation/flows` | `/api/flow-automation/flows` |
| `GET /api/pbx/admin/live` | AgentLabs verilerini birleştirir |
| `POST /api/pbx/agent/login` | `/api/team/auth/login` (üretim) veya yerel demo |

## Temsilci portalı

| URL | Açıklama |
|-----|----------|
| `/pbx` | Temsilci girişi |
| `/pbx/panel` | Softphone + durum kontrolleri |
| `/call-center-app/team` | Tam AgentLabs temsilci çalışma alanı |

Durumlar: **Molada**, **Çağrı Bekliyor**, **Çağrı Alımı Kapalı**, **Aktif Çağrıda**

### Demo kimlik bilgileri (AgentLabs yokken)

| Kullanıcı | Şifre |
|-----------|-------|
| `ayse` | `agent123` |
| `mehmet` | `agent123` |
| `zeynep` | `agent123` |

Üretimde AgentLabs **Ekip** eklentisinde oluşturulan üye e-postası + şifre kullanılır.

## Yerel geliştirme

```bash
cd goalgo
pnpm install
pnpm run dev:api    # API — AGENTLABS_URL opsiyonel
pnpm run dev:web    # UI
```

AgentLabs olmadan demo mod otomatik açılır (`/api/pbx/admin/seed-demo` ile örnek veri).

## Çalışan vs placeholder

| Özellik | Durum |
|---------|--------|
| Admin canlı izleme (AgentLabs) | ✅ Kampanya/kuyruk/agent tabloları |
| SIP trunk listesi | ✅ AgentLabs sip-engine |
| Ekip / dahili | ✅ team-management |
| Kampanya listesi | ✅ AgentLabs campaigns |
| IVR listesi | ✅ flow-automation |
| Temsilci girişi (AgentLabs) | ✅ team/auth |
| Durum kontrolleri | ✅ Bellek içi presence (AgentLabs modu) |
| WebRTC softphone | ⏳ Placeholder — `/call-center-app/team` veya Faz 2 |
| Trunk/dahili CRUD yazma | ⏳ AgentLabs UI veya proxy genişletme |
| pbx-gateway / Asterisk AMI | ❌ Kaldırıldı / kullanılmıyor |

## Üretim deploy adımları

1. **postgres-ai-call** — AgentLabs migration'ları (`ai-call-center` deploy).
2. **desirable-cooperation** — `DATABASE_URL` → postgres-ai-call; eklentiler: SIP, Ekip, Mesajlaşma.
3. **goalgo API** — `AGENTLABS_URL=https://call.yekpare.net`, `AGENTLABS_API_KEY`.
4. **Vercel** — `AGENTLABS_URL`, `RAILWAY_API_ORIGIN`; `/call-center-app/*` vekili aktif.
5. **Abonelik** — `/admin/yekpare-ai-call` → Abonelik sekmesinden etkinleştirin.
6. **DNS** — `call.yekpare.net` → desirable-cooperation Railway servisi.

İlgili dokümanlar: `goalgo/docs/BULUT_KURULUM.md`, `goalgo/ai-call-center/`
