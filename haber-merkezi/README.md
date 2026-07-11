# Haber Merkezi (çoklu haber sitesi kontrol planı)

Yekpare / Goalgo **PostgreSQL’inden ayrı** çalışan servis. Tüm site kayıtları ve (ileride) haber içeriği buranın veritabanında tutulur; **yekpare.net** yalnızca bu API’yi çağırarak site listesi / ayar güncellemesi yapar.

**Üretim:** Aşağıdaki bulut adımları esas alınır; yerel çalıştırma isteğe bağlıdır.

**Ana vitrin domain (hedef):** [aiaddin.net](https://aiaddin.net/) — Vercel’e `haber-merkezi` köküyle bağlayın. Ayrıntılı faz listesi: [`docs/AIADDIN_YOL_HARITASI.md`](docs/AIADDIN_YOL_HARITASI.md).

---

## Bulut: GitHub + Railway + Vercel

### GitHub

1. Kod bu repoda **`haber-merkezi/`** alt klasöründe (veya isterseniz bu klasörü **yeni bir repo** köküne `git subtree split` / kopya ile taşıyın).
2. `main` dalına push edildiğinde Railway / Vercel tetiklenir (bağlantıyı siz kurarsınız).

### Railway (API + Postgres — zorunlu)

1. Railway → **New Project** → **Deploy from GitHub** → repoyu seçin.
2. **Root Directory:** `haber-merkezi` (içinde `Dockerfile` ve `railway.toml` olan klasör).
3. **PostgreSQL** ekleyin ve bu API servisiyle **link**leyin → `DATABASE_URL` çoğu zaman otomatik gelir.
4. **Variables:**
   - `OPERATOR_API_KEYS` → örn. `yekpare:çok-uzun-rastgele-gizli` (Yekpare sunucusunun bu API’ye Bearer ile erişmesi için).
   - `DATABASE_URL` → Postgres linkinden (yoksa elle).
   - `NODE_ENV` → `production`.
   - `PORT` → Railway genelde otomatik verir; vermezse `3100` kullanılabilir (uygulama `process.env.PORT` okur).
5. **Deploy** sonrası tarayıcıda: `https://<railway-host>/healthz` → `{"ok":true,...}`.
6. Panelde **Custom Start Command** boş bırakın veya `railway.toml` ile aynı `pnpm run start:with-migrate` kalsın (çakışan override deploy’u kırabilir).

Docker imajı açılışta **`scripts/db-migrate.mjs`** ile `drizzle/` migrasyonlarını uygular, ardından API’yi başlatır.

### Vercel (Aiaddin.net vitrin + ileride yönetim)

Bu paket şu an **REST API = Railway** üzerindedir. **Vercel** yalnızca:

- **Aiaddin** vitrin sayfası (`public/index.html` + `public/css/aiaddin.css`), veya
- ileride eklenecek **yönetim paneli (Vite)**  

için kullanılır; API trafiği Railway’de kalır.

1. Vercel → **Add New Project** → aynı GitHub repo.
2. **Root Directory:** `haber-merkezi`.
3. Framework: Other / veya otomatik; `vercel.json` içindeki `outputDirectory: "public"` kullanılır.
4. **Domains:** Production olarak **aiaddin.net** (ve isteğe bağlı `www`) ekleyin; DNS kayıtlarını Vercel’e yönlendirin.
5. Deploy sonrası `https://aiaddin.net` vitrin, API ise Railway URL’sinde kalır.

Yekpare’yi Haber Merkezi API’sine bağlarken **Vercel URL’si değil**, **Railway API kök URL’si** kullanılır.

---

## Yerel (isteğe bağlı)

```bash
cd haber-merkezi
cp .env.example .env
pnpm install
pnpm exec drizzle-kit migrate   # veya geliştirmede: drizzle-kit push
pnpm dev
```

Sağlık: `GET http://localhost:3100/healthz`

Operatör API (Yekpare’den çağrılacak): `Authorization: Bearer <gizli>`  
Ortam: `OPERATOR_API_KEYS=yekpare:uzun-rastgele-gizli` (virgülle birden fazla)

- `GET /v1/operator/sites` — kayıtlı siteler  
- `POST /v1/operator/sites` — `{ "slug", "displayName", "primaryDomain?", "settings?" }`  
- `PATCH /v1/operator/sites/:id` — kısmi güncelleme  

Üretimde `OPERATOR_API_KEYS` tanımlı değilse servis `503` döner (kasıtlı).

---

## Yol haritası (fazlar)

### Faz 0 — Tamam (bu repo iskeleti)

- Ayrı Node servisi, ayrı `DATABASE_URL`, Drizzle şema: `news_sites`, `operator_api_keys` (tablo ileride doldurulacak).
- `/healthz`, operatör korumalı `/v1/operator/sites` CRUD iskeleti.

### Faz 1 — Haber merkezi veri modeli

- `news`, `categories`, `authors`, `media_assets` tabloları (HM başına değil, merkezi; `site_id` FK).
- Medya dosyaları: ayrı volume veya nesne depolama; URL’ler bu servisten.
- Migrasyonlar `drizzle/` altında sürümlenir.

### Faz 2 — Yekpare entegrasyonu (okuma)

- Yekpare API veya ahenkpress: HM site meta’sını **cache** veya doğrudan Haber Merkezi’nden `GET` ile çeker.
- Özel alanlı vitrin: `VITE_HABER_MERKEZI_URL` + Bearer (sunucu tarafında proxy tercih edilir ki anahtar tarayıcıya düşmesin).

### Faz 3 — Yekpare’den yönetim (yazma)

- yekpare.net panelinde “Haber merkezi” ayarı: taban URL + sunucu tarafında saklanan **gizli anahtar** (Yekpare `DATABASE_URL` içinde değil; Yekpare env’de).
- Yekpare `api-server` içinde ince **proxy route**’lar: örn. `POST /api/haber-merkezi/...` → Haber Merkezi `POST /v1/operator/...` (Bearer ekler). Böylece tarayıcı anahtarı görmez.

### Faz 4 — Geçiş

- Mevcut Goalgo `hm_sites` (ve ilişkili) verileri **bir kerelik** script ile Haber Merkezi DB’ye aktarılır.
- Yeni site açılışları yalnız Haber Merkezi üzerinden; Yekpare’deki HM tabloları salt okunur veya kaldırılır (uzun vadeli migrasyon).

### Faz 5 — Dağıtım (özet)

- **Railway:** `haber-merkezi` kökü, `Dockerfile` + `railway.toml`, ayrı Postgres, `OPERATOR_API_KEYS`, ileride medya için volume.
- **Vercel:** İsteğe bağlı statik kök veya ileride yönetim UI (bkz. yukarıdaki “Bulut” bölümü).
- Yekpare env (proxy fazında): `HABER_MERKEZI_BASE_URL`, `HABER_MERKEZI_OPERATOR_SECRET`.

---

## Tasarım ilkesi

| Bileşen | Nerede yaşar |
|--------|----------------|
| Site tanımı, içerik, medya meta | **Haber Merkezi DB** |
| Portal oturumu, e-ticaret, harita vb. | Yekpare (Goalgo) DB |
| yekpare.net üzerinden “site ekle / domain güncelle” | Yekpare UI → Yekpare API → **Haber Merkezi API** |

Bu ayrım, “her yeni haber sitesi Yekpare şemasında tablo / karmaşa” riskini Haber Merkezi tarafında kontrollü büyümeye taşır.
