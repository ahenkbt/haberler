# Bulutta kurulum (GitHub + Railway + Vercel)

Bilgisayarınızda Postgres veya `pnpm` çalıştırmanız **gerekmez**. Her şey bulutta.

## Mimari (özet)


| Nerede      | Ne iş yapar                                                                                                                  |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **GitHub**  | Kod deposu; push edince Railway / Vercel tetiklenir.                                                                         |
| **Railway** | **İki ayrı servis:** (A) Goalgo API + Postgres, (B) Yekpare AI Call (AgentLabs) + **ayrı** Postgres. |
| **Vercel**  | **Ön yüz** (AhenkPress sitesi); `/api` → Goalgo API; `AGENTLABS_URL` → AgentLabs (vekil). |


---

## Railway’de 2 servis modeli (Goalgo + Yekpare AI Call)

**Evet — Node.js + PostgreSQL Railway’de çalışır.** Goalgo API zaten Railway’de; **kampanyaların başlaması** için AgentLabs’in de **ayrı bir Railway servisi** (ve **ayrı Postgres**) olarak ayakta olması gerekir. Tek Railway servisine iki uygulamayı sıkıştirmeyin.

| Servis | Root Directory | Ne | Postgres |
| ------ | -------------- | -- | -------- |
| **A — Goalgo API** | `goalgo` | Haber, harita, admin, abonelik kapısı | Bu servise linkli DB |
| **B — Yekpare AI Call** | `goalgo/ai-call-center` | AgentLabs (kampanya, Twilio, ElevenLabs) | **Ayrı** Postgres (B’ye link) |

**Vercel** yalnızca statik/SSR ön yüzdür; `RAILWAY_API_ORIGIN` → Servis A, `AGENTLABS_URL` → Servis B’nin public URL’si (sonda `/` yok).

Dosyalar:

| Dosya | Konum |
| ----- | ----- |
| Goalgo API | `goalgo/Dockerfile`, `goalgo/railway.toml` |
| AgentLabs | `goalgo/ai-call-center/Dockerfile`, `goalgo/ai-call-center/railway.toml` |
| Eklenti kopyası + git hazırlık | `goalgo/scripts/sync-plugins.ps1`, `git-add-ai-call-center.ps1` |

---

## Railway (API — Servis A)

1. **Yeni proje** veya mevcut projede **GitHub repo** bağlayın.
2. **Root Directory**: Repo kökü `goalgo-yazilim` gibi üst klasördeyse `**goalgo`** yazın (içinde `Dockerfile` ve `railway.toml` olan klasör).
3. **PostgreSQL** ekleyin (Railway “New” → Database → PostgreSQL). Proje ile **link**leyin; Railway çoğu zaman `DATABASE_URL` değişkenini **otomatik** doldurur.
4. **Variables** (ortam değişkenleri):
  - `SESSION_SECRET` → en az 16 karakter, rastgele bir metin (üretici kullanabilirsiniz).
  - `DATABASE_URL` → Postgres eklendiyse genelde hazır gelir; yoksa Postgres servisinin “Connect” bilgisinden kopyalayın.
  - `**SKIP_DB_MIGRATE` — Railway’de oluşturmayın.** (Kod yalnızca değer tam olarak `"1"` ise migrasyonu atlar; variable yoksa migrasyon **her zaman** çalışır.) Acil durumda geçici kapatmak için eklerseniz isim: `SKIP_DB_MIGRATE`, değer: `1`; iş bitince silin.
   **“Zooming-sparkle” gibi yalnızca `DATABASE_URL` + `SESSION_SECRET` görünen servis:** API’nin açılması için bu ikisi (ve Railway’in verdiği `PORT` vb. sistem değişkenleri) **yeterlidir**. `RAILWAY_API_ORIGIN` **Railway’e eklenmez**; ön yüzün bulunduğu **Vercel** Production ortamında tanımlanır (`/api` vekili orayı kullanır).
   **İkinci bir Railway projesinde on iki değişken varken burada iki taneyse:** “Eksik” değildir — sadece şu an **o özellikler kapalı veya sınırlı** demektir. Aynı davranışı istiyorsanız **zooming-sparkle** `goalgo` servisine de (değerleri güvenli şekilde yeniden üretip) şunları ekleyebilirsiniz: `CORS_ALLOWED_ORIGINS` (production’da izinli origin listesi), `GOOGLE_PLACES_API_KEY` / `GOOGLE_MAPS_API_KEY` / `GOOGLE_MAPS_SERVER_KEY` (harita ve yer araması), `HM_EDITOR_JWT_SECRET` (haber merkezi editör JWT; yoksa oturum anahtarına düşülür), `ADMIN_PANEL_USERNAMES` + `ADMIN_PANEL_PASSWORD`, `ADMIN_MAINTENANCE_SECRET`, `STK_POS_ENCRYPTION_KEY`, ödeme/e-posta için dokümanda geçen diğer anahtarlar. Hepsi API kodunda **opsiyonel**dir; yoksa ilgili uçlar boş döner veya özellik devre dışı kalır, deploy’un “çalışması” için zorunlu değildir.
5. **Deploy** tamamlanınca Railway size bir URL verir (örn. `https://xxxx.up.railway.app`).
6. **Sağlık kontrolü**: Tarayıcıda `https://SIZIN-RAILWAY-ADRESINIZ/api/healthz` açılmalı.

Migrasyon: `**goalgo/railway.toml`** içinde `start:with-migrate` kullanılır; API dinlemeye başlamadan önce `db-migrate` tamamlanır. Railway panelinde **Custom Start Command** boş bırakılmalı veya aynı komut yazılmalı; doluysa panel, `railway.toml` satırını ezer. Acil: `SKIP_DB_MIGRATE=1` yalnızca migrate script’inde.

Yalnız **Docker imajını** kendi sunucunuzda çalıştırıyorsanız (Railway yok): ilk kurulumda bir kez `pnpm --filter @workspace/api-server run db:migrate`, sonra `pnpm --filter @workspace/api-server run start` — veya tek komut: `pnpm --filter @workspace/api-server run start:with-migrate`.

### Haber / logo / banner görselleri (önemli)

API yüklemeleri `**/api/media/uploads/...`** üzerinden sunulur; dosyalar konteyner içinde `**data/media-uploads**` altına yazılır. Railway’de bu disk **deploy ile sıfırlanabilir** — yükleme yapıp sonra görselin kaybolması çoğunlukla bundandır.

**Kalıcı çözüm:** Railway’de `goalgo` servisinize **Volume** ekleyin. **Mount path** mümkünse tam olarak şu olsun: `**/app/data/media-uploads`** (`Dockerfile` içindeki `WORKDIR /app` ile uyumlu; eski kod da dosyaları buraya yazıyordu). Başka bir yola mount ederseniz (`/data`, `/mnt/...`) Railway `RAILWAY_VOLUME_MOUNT_PATH` oraya işaret eder; API artık **o boş diske** bakar — daha önce `/app/data/media-uploads` altına yazılmış dosyalar **görünmez** (silinmiş gibi). Eski dosyalar hâlâ bir yedekteyse bu volume’a **kopyalanmalı**dır.


| Yöntem         | Ne yapmalı                                                                                                                              |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Önerilen**   | Volume mount: `**/app/data/media-uploads`**. `MEDIA_UPLOAD_ROOT` **eklemeyin** (Railway `RAILWAY_VOLUME_MOUNT_PATH` kullanılır).        |
| **Alternatif** | Mount örn. `/mnt/media-uploads` ise `MEDIA_UPLOAD_ROOT` ile **aynı tam yolu** verin; aksi halde yazma bir yere, okuma başka yere gider. |


Deploy sonrası API **Deploy Logs** içinde `Medya yükleme dizini` satırına bakın: `mediaRoot`, `MEDIA_UPLOAD_ROOT`, `RAILWAY_VOLUME_MOUNT_PATH` birlikte loglanır. Uyarı çıkarsa iki yolu eşitleyin veya `MEDIA_UPLOAD_ROOT`’u silip yeniden deploy edin.

**GET okuma yedeği:** `GET /api/media/uploads/…` için dosya birincil medya kökünde yoksa API, aynı isimle `**/app/data/media-uploads`** (Docker `WORKDIR` altındaki eski varsayılan) yoluna da bakar — volume mount farklı olsa bile silinmemiş eski dosyalar varsa tekrar servis edilir. Yeni yüklemeler yine birincil köke (`getMediaUploadRoot()`) yazılır.

**Kod / volume notu:** `getMediaUploadRoot()` önce `MEDIA_UPLOAD_ROOT`, sonra `RAILWAY_VOLUME_MOUNT_PATH` kullanır. Volume boş ve eski dosyalar yalnızca geçici katmanda kaldıysa (deploy sonrası silindiyse) bu yedek de dosyayı bulamaz; o durumda yedekten kopyalama veya yeniden yükleme gerekir.

**Üretim koruması:** API, Railway’de **volume veya S3/R2 yoksa** açılışta durur (geçici diskte kayıp önlenir). Acil: `SKIP_MEDIA_STORAGE_CHECK=1`.

Deploy tamamlandıktan sonra hızlı doğrulama için:

```bash
cd goalgo
WEB_ORIGIN=https://yekpare.net API_ORIGIN=https://RAILWAY-PUBLIC-URL CALL_ORIGIN=https://call.yekpare.net pnpm run deploy:smoke
```

Ayrıntı: `docs/DEPLOY_SONRASI_KONTROL.md`.

**Cloudflare R2 / S3 (isteğe bağlı, volume yerine veya yanında):**

| Değişken | Açıklama |
| -------- | -------- |
| `S3_BUCKET` | Bucket adı |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | R2 API token |
| `S3_ENDPOINT` | R2: `https://<account_id>.r2.cloudflarestorage.com` |
| `S3_PUBLIC_BASE_URL` | Herkese açık URL kökü (örn. `https://pub-….r2.dev`) — tanımlıysa GET yönlendirilir |
| `S3_REGION` | R2 için `auto` (varsayılan) |

### Medya kaybolduysa (yekpare.net `/api/media/uploads/…` 404)

1. **Dosya volume’da mı?** Repo kökünden PowerShell: `cd goalgo` → `.\scripts\recover-media-volume.ps1`  
   Canlı sayım: `railway run --service goalgo sh -c "find /mnt/media-uploads -type f | wc -l"`  
   Eski yol: `railway run --service goalgo sh -c "find /app/data/media-uploads -type f | wc -l"`
2. **Yedek Railway projesi** (`goalgo-2024-05-12`, volume `goalgo-volume`): panelde volume dosya sayısını kontrol edin; varsa `tar` ile arşivleyip canlı mount’a geri kopyalayın (script çıktısındaki adımlar).
3. **API teşhis / kısmi onarım** (yönetici oturumu): `GET /api/media/missing-uploads` — kırık yerel referanslar. Harici RSS görselleri için: `POST /api/media/repair-external-images` body `{ "limit": 50 }` (yalnızca `http(s)://` `image_url`).
4. Volume’da dosya **yoksa** ve haber görseli yalnızca `/api/media/uploads/…` ise otomatik kurtarma mümkün değildir; yedekten geri yükleme veya manuel görsel gerekir.

### “Haber siteleri (HM)” sonrası sürekli Build failed / 502

Bunun tek bir nedeni yok; sık görülenler:

1. `**SESSION_SECRET` yok veya 16 karakterden kısa** → API `app` yüklenirken çöker; logda artık açık Türkçe hata mesajı görünür. Railway → Variables → `SESSION_SECRET` ekleyin veya düzeltin.
2. **Railway Deploy → Custom Start Command** eski `pnpm ... start` ile kalmış → `railway.toml` içindeki `start:with-migrate` uygulanmıyor. Kutuyu **boşaltın** veya dokümandaki tam komutu yapıştırın.
3. **Daha fazla kod + Chromium imajı** → bellek sınırına dayanma; Railway’de servis **RAM**’ini yükseltin veya geçici olarak `AI_RSS_SCHEDULER=0` deneyin.
4. **Railway altyapısı** (CREATE_CONTAINER vb.) → kod dışı; destek veya yeni servis.
5. **Railway Deploy → Custom Start Command** içinde paket adı `**@workspace/api-server`** olmalı; yanlışlıkla `**@workspaces**` (çoğul) yazılırsa `pnpm` paketi bulamaz ve deploy çöker. Şüphe varsa komutu silin; `railway.toml` içindeki doğru satır kullanılsın.

## Dockerfile nerede? (GitHub’da tam yol)

Repoda **zaten var**; sizin oluşturmanız gerekmez.


| Dosya             | GitHub’da tam konum (repo kökü `goalgo-yazilim` varsayımıyla) |
| ----------------- | ------------------------------------------------------------- |
| **Dockerfile**    | `goalgo/Dockerfile`                                           |
| **Railway ayarı** | `goalgo/railway.toml` → `dockerfilePath = "Dockerfile"`       |


**Railway’de “Root Directory” = `goalgo` yazdığınızda**, Railway bu klasörü **build kökü** sayar ve oradaki `Dockerfile` dosyasını okur. Üst klasörde (`goalgo-yazilim` kökünde) `Dockerfile` aramaz.

### Dockerfile satır satır (ne iş yapıyor?)

1. `**FROM node:22-bookworm-slim`** — İmaj içinde Node.js 22 çalışır.
2. `**WORKDIR /app**` — Tüm komutlar `/app` klasöründe.
3. `**apt-get` + chromium** — Sunucuda PDF/ekran görüntüsü gibi işler için tarayıcı motoru (Chromium) kurulur.
4. `**pnpm` kurulumu** — Paket yöneticisi.
5. `**COPY package.json …` + `COPY artifacts`, `lib`, …** — Monorepo dosyaları imaja kopyalanır (kod buradan gelir).
6. `**pnpm install`** — Bağımlılıklar yüklenir.
7. `**pnpm --filter @workspace/api-server run build**` — **Sadece API** derlenir (ön yüz bu Docker imajında üretilmez; ön yüz Vercel’de).
8. `**EXPOSE 3000`** — API’nin dinlediği port (Railway genelde buna yönlendirir).
9. `**CMD … start:with-migrate**` — Drizzle migrasyonu tamamlandıktan sonra API açılır. Yerel tek seferlik şema: `pnpm --filter @workspace/api-server run db:migrate`.

**Özet:** Dockerfile = “Railway’de çalışacak API kutusu nasıl yapılacak” tarifidir. Vercel bunu kullanmaz; yalnızca Railway (bu projede) kullanır.

### Dockerfile yoksa ne olurdu?

Bu repoda **var**; ek iş yok. Başka bir projede yoksa Railway “Nixpacks” vb. ile tahmin etmeye çalışır; bu repoda **tasarım gereği `railway.toml` Dockerfile kullan demiş** — o yüzden `goalgo` klasöründe `Dockerfile` bulunması şart.

---

## Vercel (ön yüz)

1. Projeyi Vercel’e **Import** edin (aynı GitHub repo).
2. Kök dizin / build ayarları genelde repodaki `vercel.json` ile uyumludur (`goalgo` altına `cd` eden komutlar kök `vercel.json`’da).
3. `**/api` vekili:** Repo kökünde ve `**goalgo/middleware.js`** içinde Edge vekil vardır (Vercel’de **Root Directory = `goalgo`** ise yalnız `goalgo/` altı paketlenir). Dosya `**.js**` olmalı — `.ts` workspace `tsc` ile Request/fetch için derleme hatası verir. `**RAILWAY_API_ORIGIN**` Production env’de tanımlı olmalı.
4. **Haber merkezi marka alanı (örn. suhaberajansi.com):** `middleware.js` yalnızca **kök adres `/`** isteğini, **aynı hostta** vitrin yoluna (varsayılan `**/tr/su`**) **308** ile yönlendirir; böylece `https://suhaberajansi.com/tr/su` doğrudan haber sitesi olarak açılmaya devam eder, `https://suhaberajansi.com/` ise vitrine gider. İsteğe bağlı Vercel env: `**HM_NEWS_CENTER_BRAND_HOSTS`** (virgülle; boş string = bu yönlendirme kapalı), `**HM_NEWS_CENTER_BRAND_HOME_PATH**` (örn. `/tr/su`). Tüm kök trafiği bilinçli olarak **yekpare.net** üzerinde tek kanon toplamak isterseniz: `**HM_NEWS_CENTER_ROOT_REDIRECT_URL`** = `https://yekpare.net/tr/su` (yalnızca `/` için).
5. İsteğe bağlı Vercel env: `VITE_API_BASE_URL` — Railway gibi ayrı API kökü kullanıyorsanız tanımlı olabilir; istemci `**VITE_API_CROSS_ORIGIN` açık değilse** API çağrılarını her zaman **o anda açık olan sayfa kökündeki** `/api` vekiline (göreli yol) yollar — böylece `xxxx.com/tr/slug` gibi **tüm özel HM alanları** için `VITE_PORTAL_HOSTS` ile host tek tek eklemeniz gerekmez (CORS / “Failed to fetch” önlenir). **Logo ve yazar avatarı** gibi `<img src>` adresleri de aynı koşulda `/api/media/...` olarak **aynı hosttaki vekil** üzerinden yüklenir (doğrudan `*.railway.app` adresi özel alanda sık kırılır). `**VITE_PORTAL_HOSTS`** isteğe bağlıdır: medya çözümlemesinde ek portal benzeri hostlar için kullanılır. API kökü hiç yokken ve host yekpare/localhost dışındaysa geriye dönük olarak kanonik portal `/api` kullanılır.

### Yekpare AI Call (AgentLabs v5 — Servis B)

Arka planda **ayrı Node.js + PostgreSQL** (`goalgo/ai-call-center`). Ön yüzde **iframe yok**: tam uygulama `https://yekpare.net/call-center-app/...` üzerinden Vercel Edge vekili ile açılabilir; **önerilen** kurulum AgentLabs’i doğrudan Railway public URL’sinde çalıştırmaktır (`AGENTLABS_URL`).

| Adres (Vercel) | Ne |
| -------------- | -- |
| `/ai-cagri-merkezi` | Tanıtım ve abonelik talebi |
| `/admin/yekpare-ai-call` | Yekpare yönetim kabuğu |
| `/call-center-app` | AgentLabs SPA vekili (isteğe bağlı; `VITE_BASE_PATH` gerekir) |
| `/call-center-api` | AgentLabs API vekili |

**Abonelik kapısı:** `/call-center-app` ve `/call-center-api` yalnızca aktif `call_center_*` aboneliği + yönetici oturumu ile açılır (`GET /api/call-center/workspace-gate`).

#### Adım adım: Railway’de AgentLabs (Servis B)

1. **Proje:** Railway’de mevcut Goalgo projesine **yeni servis** ekleyin (veya ayrı proje). GitHub repo aynı kalabilir.
2. **Root Directory:** `goalgo/ai-call-center` (içinde `Dockerfile` + `railway.toml`).
3. **PostgreSQL:** **New → Database → PostgreSQL** ekleyin; yalnızca **AgentLabs servisi (B)** ile **link**leyin. Goalgo API’nin Postgres’i ile **paylaşmayın**.
4. **Deploy (ilk kez veya eklenti güncellemesi):** Railway yalnızca **git’teki** dosyaları kullanır. Yerelde:
   ```powershell
   cd goalgo
   .\scripts\sync-plugins.ps1
   .\scripts\git-add-ai-call-center.ps1
   git commit -m "feat(ai-call-center): AgentLabs ve eklentiler Railway icin"
   git push
   ```
   Ardından Railway **grand-flow** servisinde **Redeploy** (veya push ile otomatik deploy). İmaj `AgentLabs-Package/AgentLabs-v5.3.8/plugins/` içindeki dört eklentiyi derler; ayrı zip gerekmez.
5. **Variables (Servis B):**

| Değişken | Değer |
| -------- | ----- |
| `DATABASE_URL` | Postgres link sonrası otomatik |
| `SESSION_SECRET` | `openssl rand -base64 48` (iki ayrı üretin) |
| `JWT_SECRET` | `openssl rand -base64 48` |
| `APP_URL` | Servis B public URL, örn. `https://yekpare-call-production.up.railway.app` |
| `NODE_ENV` | `production` |
| `VITE_APP_NAME` | `Yekpare AI Call` |
| `VITE_DEFAULT_LOCALE` | `tr` — varsayılan arayüz dili (Türkçe; eksik çeviriler İngilizce'ye düşer). **Build zamanı** değişkenidir; ekledikten veya değiştirdikten sonra **Redeploy** gerekir. |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` | Twilio konsol |
| `ELEVENLABS_API_KEY` | ElevenLabs (panelden de eklenebilir) |

`PORT` Railway tarafından verilir; elle yazmayın. **Custom Start Command** boş kalsın (`railway.toml` → `sh scripts/railway-start.sh`).

6. **Sağlık:** `https://SERVIS-B-URL/api/health` → 200.
7. **İlk kurulum:** Tarayıcıda `https://SERVIS-B-URL/` → Setup Wizard → admin hesabı.
8. **Eklentiler:** Kaynak klasörler `ai-call-center/Messaging`, `SIP-Trunk`, `Teams`, `Rest-API` altındadır. Yerelde `.\scripts\sync-plugins.ps1` → `AgentLabs-Package/.../plugins/` güncellenir. **Railway** için bu `plugins/` klasörünün repoda olması gerekir (`git-add-ai-call-center.ps1`); aksi halde Docker build `plugins/... not found` ile düşer.

**Önerilen:** Çalışma alanını doğrudan `APP_URL` üzerinden açın (menü: **Çalışma alanını aç**). Vercel vekili (`VITE_BASE_PATH=/call-center-app/`) isteğe bağlıdır.

**Türkçe arayüz:** Railway Servis B'de `VITE_DEFAULT_LOCALE=tr` tanımlayın ve yeniden deploy edin. Kurulum sihirbazından sonra platform dilleri eksikse admin → **Languages** üzerinden seed çalıştırın veya `npx tsx server/seed-platform-languages.ts --force` (container içinde). Mevcut kullanıcılar tarayıcıda kayıtlı dil tercihini (`localStorage`) korur.

#### Servis A (Goalgo API) — Yekpare AI Call (yerel / native mod)

**Varsayılan:** Kod `USE_NATIVE_AI_CALL` tanımlı değilken **yerel modu açık** kabul eder (`true`). Railway’de **bu değişkeni eklemeniz gerekmez** — panelden `/admin/yekpare-ai-call` yolları ve `/api/ai-call/*` uçları zaten yerel modda çalışır.

| Değişken | Zorunlu? | Açıklama |
| -------- | -------- | -------- |
| `USE_NATIVE_AI_CALL` | **Hayır** (varsayılan `true`) | Yalnızca eski AgentLabs vekiline dönmek için `false` yazın |
| `AGENTLABS_URL` | Yalnızca legacy | `USE_NATIVE_AI_CALL=false` iken Servis B kök URL (sonda `/` yok) |
| `AGENTLABS_API_KEY` | Legacy | Servis JWT veya API anahtarı |
| `AGENTLABS_SERVICE_EMAIL` / `AGENTLABS_SERVICE_PASSWORD` | Legacy | Alternatif otomatik oturum |
| `AGENTLABS_HEALTH_PATH` | Legacy | Varsayılan `/api/health` |

Doğrulama (deploy sonrası, tarayıcı veya curl):

- `GET https://SIZIN-RAILWAY-URL/api/call-center/public/status` → `"native": true` olmalı
- `GET https://SIZIN-RAILWAY-URL/api/ai-call/health` → yönetici oturumu gerekir; genel teşhis için yukarıdaki public status yeterli

Ayrıntı: `docs/YEKPARE_CALL_CENTER.md`

Panel: **Yekpare AI Call → Bağlantıyı test et**; aboneliği **Abonelik** sekmesinden etkinleştirin.

#### Vercel (ön yüz)

| Değişken | Açıklama |
| -------- | -------- |
| `RAILWAY_API_ORIGIN` | Servis A public URL |
| `AGENTLABS_URL` | Servis B public URL (Servis A ile **aynı**) |

#### İlk kampanya (Twilio + ElevenLabs)

1. AgentLabs admin → **Settings → Twilio**: Account SID, Auth Token, **Test Connection**.
2. **Settings → ElevenLabs Pool**: API anahtarı ekleyin.
3. **Phone Numbers**: Twilio’dan numara satın alın / bağlayın.
4. Twilio numara webhook’ları (Voice URL): `https://SERVIS-B-URL/api/webhooks/twilio/voice` (Status: `.../status`).
5. **Agents** → asistan oluşturun (ElevenLabs sesi seçin).
6. **Campaigns** → CSV yükleyin → **Start**. Takılı kalırsa: kredi, webhook erişimi, log (Railway Deploy Logs).

#### Eklenti kaynak klasörleri (repo)

| Kaynak (geliştirme) | Docker / Railway (`plugins/`) |
| ------------------- | ------------------------------ |
| `ai-call-center/Messaging` (veya `.../messaging`) | `messaging` |
| `ai-call-center/SIP-Trunk` (veya `.../sip-engine`) | `sip-engine` |
| `ai-call-center/Teams/team-management` | `team-management` |
| `ai-call-center/Rest-API` (veya `.../rest-api`) | `rest-api` |

Senkron: `goalgo\scripts\sync-plugins.ps1` → hedef: `AgentLabs-Package/AgentLabs-v5.3.8/plugins/`. Railway build bu hedefi kullanır; üst klasörlerin (`Messaging/` vb.) ayrıca git’te olması şart değildir.

### Tam kesinti (yekpare.net: haberler, haber siteleri, admin hepsi yanıtsız)

Aşağıdakilerden biri bile yanlışsa ön yüz açılsa bile **tüm veri ve oturum** çöker.


| Sıra | Kontrol                                                                                    | Ne yapılır                                                                                                                                                           |
| ---- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Railway API deploy logunda `[db-migrate] DATABASE_URL tanımlı değil` veya sürekli `exit 1` | Postgres servisini API servisiyle **link**leyin; değişken adı tam olarak `**DATABASE_URL`** olmalı (Türkçe veya tırnaklı isimler çalışmaz). Değer boş bırakılmamalı. |
| 2    | `https://SIZIN-RAILWAY-URL/api/healthz` tarayıcıda açılmıyor / 502                         | Önce (1); ardından `SESSION_SECRET` (≥16 karakter). `SKIP_DB_MIGRATE=1` kalıcı çözüm değildir.                                                                       |
| 3    | Railway URL sağlıklı ama siteden `/api` hâlâ hata                                          | Vercel **Production** env `**RAILWAY_API_ORIGIN`**, Railway’deki **güncel genel API kökü** ile aynı olmalı (`https://….up.railway.app`). Sonra **Redeploy**.         |


Üretimde portal (varsayılan host) açıldığında, API kapalıysa kırmızı bir **bağlantı uyarı şeridi** gösterilir (`ApiConnectivityBanner`); bu yalnızca teşhis içindir, Railway/Vercel ortamını düzeltmeden kendiliğinden iyileşmez.

### Ana sayfa “işletme yok” + yönetim paneline girilemiyor

1. **API ayakta mı:** Tarayıcıda `https://…up.railway.app/api/healthz` ve `…/api/map/homepage-businesses` — ikincisi **200** ve `success: true` olmalı. **500** ve `failed query` içinde `map_businesses` / `vendors` geçiyorsa çoğunlukla **Postgres’te Drizzle’ın seçtiği kolonlar eksik** (sık örnek: `vendors.linked_map_business_id`, `map_businesses.google_places_extras`). Güncel API kodunu deploy edin; süreç başında `ensureMapVendorColumnPatches` bunları `IF NOT EXISTS` ile ekler. **Deploy beklemeden:** Railway Postgres “Query” ile aşağıdaki `ALTER` bloklarını çalıştırabilirsiniz:

```sql
ALTER TABLE map_businesses ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE map_businesses ADD COLUMN IF NOT EXISTS import_source TEXT;
ALTER TABLE map_businesses ADD COLUMN IF NOT EXISTS google_places_extras JSONB;
ALTER TABLE map_businesses ADD COLUMN IF NOT EXISTS scraped_photos JSONB;
ALTER TABLE map_businesses ADD COLUMN IF NOT EXISTS scraped_reviews JSONB;
ALTER TABLE map_businesses ADD COLUMN IF NOT EXISTS scraped_at TIMESTAMP;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS linked_map_business_id TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS google_place_id TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS google_import_kind TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS catalog_contact_gap BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS catalog_menu_gap BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS membership_tier TEXT NOT NULL DEFAULT 'gold';
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS about_html TEXT;
```

### Railway Postgres’te bu `ALTER` SQL’i nasıl çalıştırılır? (adım adım)

Bu işlem, veritabanı tablolarına **eksik sütunları bir kerelik ekler**; kod deploy’u beklemeden `/api/map/homepage-businesses` hatasını giderebilir.

1. [railway.app](https://railway.app) hesabınızla giriş yapın.
2. **zooming-sparkle** (veya API’nin bağlı olduğu) projeyi açın.
3. Solda veya şemada **Postgres** (veritabanı) kutusuna tıklayın — yeşil “Online” olan veritabanı servisi.
4. Üstte veya menüde **“Data”**, **“Query”** veya **“SQL”** sekmesini arayın (Railway arayüzü sürüme göre “Query” veya postgres içinde “Connect” yanında sorgu editörü olabilir).
5. Açılan metin kutusuna, yukarıdaki **tüm** `ALTER TABLE …` satırlarını **tek seferde** yapıştırın (BEGIN/COMMIT gerekmez).
6. **Run** / **Execute** düğmesine basın. Hata yoksa “success” benzeri bir onay görünür; `IF NOT EXISTS` olduğu için aynı komutu ikinci kez çalıştırmak genelde zararsızdır.
7. Tarayıcıda tekrar deneyin: `https://SIZIN-RAILWAY-URL/api/map/homepage-businesses` — JSON’da `"success": true` olmalı.

**Not:** Bazı hesaplarda Postgres’e doğrudan sorgu sekmesi kapalıysa, bilgisayarınıza **TablePlus**, **DBeaver** veya `psql` kurup Railway Postgres’in **“Connect” / “Public network”** sekmesinde verilen bağlantı dizesiyle bağlanıp aynı SQL’i orada da çalıştırabilirsiniz.

1. **Liste yine boş ama API 200:** Ana sayfa vitrininde satırlar çoğunlukla `map_businesses` + aktif `vendors` bağlantısı (`linked_map_business_id`) ile gelir. Veritabanında gerçekten kayıt yoksa boş normaldir; veri **başka bir Postgres** yedeğindeyse, Railway’deki `DATABASE_URL` o sunucuyu göstermiyor olabilir — doğru Postgres’i API servisine bağlayın.
2. **Panel girişi:** `POST /api/members/admin-panel-session` Railway’deki kullanıcıyı doğrular. **Railway → `goalgo` servisi → Variables** içinde en azından şunlar olmalı:
  - `**ADMIN_PANEL_USERNAMES`** — virgülle ayrılmış kullanıcı adı veya e-posta (örn. `admin,yonetici@site.com`).
  - `**ADMIN_PANEL_PASSWORD**` — girişte yazacağınız düz metin şifre (üretimde güçlü seçin).
   `panel_admin_users` tablosu **boşsa**, API ilk uygun istekte bu env ile bcrypt hash’li kayıt **tohumlar**. Tabloda zaten kullanıcı varsa **önce veritabanındaki şifre** denenir; env yalnızca eşleşen kullanıcı yoksa **yedek** olarak kullanılır — o yüzden eski DB’de farklı şifre kalmışsa env’deki şifre işe yaramaz. Kullanıcı adı: env’de e-posta yazdıysanız girişte de **tam e-posta**; kullanıcı adı yazdıysanız **aynı metin** (büyük/küçük harf duyarsız). Değişkenleri kaydettikten sonra servisi **yeniden deploy** edin.
3. **Vercel:** Admin kullanıcı adı/şifresi Vercel’e eklenmez. Giriş sayfası doğrudan API’ye POST atar; `ADMIN_PANEL_USERNAMES` / `ADMIN_PANEL_PASSWORD` yalnızca Railway API servisinde bulunmalıdır.

---

## Sorun giderme (nesnel)

- **GitHub `main` güncel ama Railway eski commit’te (ör. `/api/career/apply` 404):** Tarayıcıda `https://SIZIN-RAILWAY-URL/api/healthz` açın; `deploy.railwayGitSha` değeri GitHub `main` ile uyuşmuyorsa API yeniden deploy edilmemiştir. **Hızlı çözüm:** Railway → Goalgo servisi → **Deploy → Redeploy** (GitHub bağlıysa “Deploy latest commit”). **Kalıcı çözüm:** GitHub Actions secret’ları ekleyin (`RAILWAY_TOKEN`, `RAILWAY_SERVICE_ID`; isteğe bağlı `RAILWAY_PUBLIC_URL`) — `.github/workflows/railway-production.yml` her `main` push’unda `goalgo/` klasörünü Railway’e gönderir. Project token: Railway → Project Settings → Tokens.
- **`USE_NATIVE_AI_CALL=true` Railway'de eklenmiyor / kaydedince panelden atılıyor:** Bu değişken **zorunlu değildir** — kod varsayılan olarak yerel modu (`true`) kullanır. Eklemeye gerek yok; mevcut deploy ile `GET /api/call-center/public/status` içinde `"native": true` görürseniz işlem tamamdır. Yine de eklemek istiyorsanız:
  1. **Variables → Raw Editor** açın; satır olarak `USE_NATIVE_AI_CALL=true` yazın (tırnak yok; tek tek alanlarda isim `USE_NATIVE_AI_CALL`, değer `true` — `USE_NATIVE_AI_CALL=true` ifadesini yalnızca **isim** alanına yazmayın).
  2. **Railway CLI:** `railway link` → `railway variables set USE_NATIVE_AI_CALL=true --service goalgo` (servis adınız farklıysa değiştirin).
  3. **“No GitHub installation found”** uyarısı: GitHub bağlantısı yoksa değişken kaydı deploy tetiklemez veya deploy başarısız görünür — **Deploy → Redeploy** ile elle yeniden başlatın veya GitHub'ı Settings → Integrations altından bağlayın.
  4. Değişken kaydından sonra deploy **Failed** oluyorsa sorun genelde değişkenden değil, `SESSION_SECRET`, `DATABASE_URL`, medya volume/S3 veya migrate hatasındandır — **Deploy Logs** içinde `[db-migrate]` ve `Medya yükleme dizini` satırlarına bakın.
- **Deploy sırasında 502 / “Application failed to respond”:** Eski sürüm migrasyon bitene kadar dinlemiyordu; artık migrasyon `preDeployCommand` ile ayrıldı. Railway'de son deploy ayarlarında `preDeployCommand` ve `startCommand`'ın `railway.toml` ile geldiğini doğrulayın. Panelde eski “start içinde migrate” override'ı varsa kaldırın.
- **Haber siteleri / API hata:** Railway deploy logunda `[db-migrate] tamam` satırı yoksa veya Postgres bağlantı hatası varsa: `DATABASE_URL` yanlış veya Postgres servisi linkli değil. `SKIP_DB_MIGRATE=1` tanımlıysa logda `migrasyon atlandı` uyarısı görünür — o zaman değişkeni silin ve yeniden deploy edin.
- **Ön yüz `/api` çalışmıyor:** Vercel’de `**RAILWAY_API_ORIGIN`** (Production) Railway’deki güncel public API kökü ile aynı mı kontrol edin; `middleware.js` vekili bu değişkene bakar. Eksikse 502 ve üstte kırmızı uyarı çıkar.
- **Köşe yazarı “şifremi unuttum” e-postası gitmiyor:** Railway deploy logunda `[db-migrate] tamam` görünmeli; `0037` migrasyonu `authors` tablosuna sıfırlama kolonlarını ekler. Ayrıca `SMTP_`* ortam değişkenleri veya yönetim panelinden SMTP tanımlı olmalıdır.
- **Blog / `/kategori/blog` boş:** `0038` migrasyonu yoksa veya daha önce hiç “blog” slug’lı kategori oluşturulmadıysa liste boş kalır; migrasyon `blog` kategorisini idempotent ekler.
- **İletişim mesajında haber sitesi görünmüyor:** `0039` migrasyonu `site_contact_messages` tablosuna `hm_site_id` / `hm_site_slug` ekler; API ilk istekte de kolonları `ALTER IF NOT EXISTS` ile tamamlayabilir.

---

## PC’de `.env` dosyası

Yalnızca **yerelde** API çalıştırmak isterseniz kullanılır. Saf bulut kullanıyorsanız **zorunlu değildir**.