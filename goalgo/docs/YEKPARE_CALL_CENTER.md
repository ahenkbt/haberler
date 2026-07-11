# Yekpare Call Center — Yerel Kurulum

Yekpare.net üzerinde **AgentLabs / call.yekpare.net bağımlılığı olmadan** çalışan yerel çağrı merkezi altyapısı.

## İki ürün, tek platform

| Ürün | Admin yolu | API |
|------|-----------|-----|
| **AI Call Center** | `/admin/yekpare-ai-call/ayarlar`, `/asistanlar`, `/ai-kampanya` | `/api/ai-call/*` |
| **PBX Call Center** | `/admin/yekpare-ai-call/pbx`, `/canli`, `/hibrit` | `/api/pbx/*` |
| **Hibrit** | `/admin/yekpare-ai-call/hibrit` | AI → `/api/pbx/transfer-in` |

Temsilci portalı: **`/pbx`**

## Hızlı başlangıç (3 adım)

### 1. API anahtarlarını yapıştırın

1. `/admin/yekpare-ai-call/ayarlar` açın
2. OpenAI (`sk-…`) ve/veya Gemini (`AIza…`) anahtarını yapıştırın
3. **Bağlantıyı Test Et** ile doğrulayın
4. Varsayılan sağlayıcı ve modeli seçin → **Kaydet**

Anahtarlar Goalgo PostgreSQL'de **AES-256-GCM** ile şifrelenir (`PBX_JWT_SECRET` veya `SESSION_SECRET` türetilmiş anahtar).

### 2. SIP trunk ekleyin

1. `/admin/yekpare-ai-call/sip-trunk` açın
2. Trunk adı, SIP sunucusu (host), kullanıcı adı, şifre girin
3. Kaydedin — veriler `pbx_trunks` tablosunda saklanır (AI ve PBX ortak)

### 3. Kampanya başlatın

1. `/admin/yekpare-ai-call/asistanlar` — AI asistan oluşturun (sistem istemi, model)
2. `/admin/yekpare-ai-call/ai-kampanya` — kampanya + kişi listesi
3. **Başlat** — demo modda simülasyon; gerçek SIP Faz 2

Hibrit mod: kampanyada **Hibrit (AI → temsilci)** seçin, `/admin/yekpare-ai-call/hibrit` ayarlarını açın.

## Demo vs production

| | Demo mod | Production |
|---|----------|------------|
| API anahtarı | Gerekmez (simülasyon) | OpenAI ve/veya Gemini zorunlu |
| SIP trunk | Opsiyonel | Gerçek arama için gerekli (Faz 2) |
| Kampanya | Simüle transkript + log | Gerçek ses hattı |
| `demo_mode` | Ayarlar'da açık (varsayılan) | Kapatın |

Genel bakış sayfasından **Demo veri yükle** ile örnek asistan + kampanya oluşturabilirsiniz.

## Ortam değişkenleri

| Değişken | Varsayılan | Açıklama |
|----------|------------|----------|
| `USE_NATIVE_AI_CALL` | `true` (env yoksa da) | Railway’de **eklemeniz gerekmez**. `false` → AgentLabs vekili (legacy) |
| `PBX_JWT_SECRET` | dev fallback | API anahtarı şifreleme + PBX JWT |
| `SESSION_SECRET` | — | Şifreleme yedek anahtarı |
| `AGENTLABS_URL` | — | Yalnızca legacy modda |

## Veritabanı

Migration: `goalgo/lib/db/migrations/0092_ai_call_native.sql`

Tablolar: `ai_call_settings`, `ai_call_assistants`, `ai_call_campaigns`, `ai_call_contacts`, `ai_call_logs`, `ai_call_flows`

PBX tabloları: `pbx_*` (mevcut)

Runtime DDL: `ensureAiCallTables()` — migration olmadan da idempotent oluşturur.

## API özeti

### Ayarlar
- `GET/PUT /api/ai-call/admin/settings`
- `POST /api/ai-call/admin/settings/test-openai`
- `POST /api/ai-call/admin/settings/test-gemini`

### Asistanlar
- `GET/POST /api/ai-call/admin/assistants`
- `DELETE /api/ai-call/admin/assistants/:id`

### Kampanyalar
- `GET/POST /api/ai-call/admin/campaigns`
- `POST /api/ai-call/admin/campaigns/:id/start|stop`
- `GET /api/ai-call/admin/campaigns/:id/contacts`

### Diğer
- `GET /api/ai-call/admin/logs`
- `GET /api/ai-call/admin/status`
- `GET /api/ai-call/health`
- `POST /api/ai-call/admin/seed-demo`

## Admin URL'leri

| Sayfa | URL |
|-------|-----|
| Genel bakış | `/admin/yekpare-ai-call` |
| Ayarlar | `/admin/yekpare-ai-call/ayarlar` |
| AI Asistanlar | `/admin/yekpare-ai-call/asistanlar` |
| AI Kampanyalar | `/admin/yekpare-ai-call/ai-kampanya` |
| Arama kayıtları | `/admin/yekpare-ai-call/kayitlar` |
| SIP Trunk | `/admin/yekpare-ai-call/sip-trunk` |
| Hibrit Mod | `/admin/yekpare-ai-call/hibrit` |
| PBX özet | `/admin/yekpare-ai-call/pbx` |
| Temsilci portalı | `/pbx` |

## Legacy AgentLabs

`USE_NATIVE_AI_CALL=false` ile eski `/call-center-app` vekili ve `/api/call-center/proxy/*` kullanılabilir. Yeni kurulumlar için yerel mod önerilir.

Referans kod: `goalgo/ai-call-center/` (production bağımlılığı değildir).

## İlgili dokümanlar

- `goalgo/docs/PBX_KURULUM.md` — PBX + Asterisk gateway
- `goalgo/docs/PBX_YOL_HARITASI.md` — yol haritası
