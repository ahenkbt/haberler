# GitHub, Railway, Vercel — ne yapacağım? (adım adım)

Bu rehber **Aiaddin PHP (Businesso / Laravel + MySQL)** hattını hedefler. Ürün anayasası: **PostgreSQL yok**, **Yekpare bağlantısı yok** — bkz. `haber-merkezi/docs/AIADDIN_YOL_HARITASI.md`.

**Kısa cevap:**  
- **GitHub:** Kod burada; Railway/Vercel burayı kaynak alır.  
- **Railway:** **MySQL + Laravel (PHP)** uygulamasını burada çalıştırırsınız.  
- **Vercel:** **Laravel çalıştırmaz.** Yalnızca **statik HTML/JS vitrin** (veya ayrı bir frontend build çıktısı) koyacaksanız kullanın; Aiaddin’in asıl motoru **Railway’deki PHP**’dir.

---

## GitHub: iki ayrı repo (karıştırmayın)

| Uzak repo | Açıklama |
|-----------|----------|
| **`ahenkbt/goalgo`** | Monorepo (Yekpare vb.). Buraya `git push` **Aiaddin Railway deploy’unu güncellemez**; `aiaddin` GitHub’da `goalgo` kökünün içinde **ayrı bir repo olarak durmaz**. |
| **`ahenkbt/aiaddin`** | Aiaddin’in **tek başına** GitHub projesi: `https://github.com/ahenkbt/aiaddin`. **Railway’i bu repoya bağlayın**; üretim kodu buradan gelsin. |

**Yerel düzen (öneri):** İsterseniz geliştirmeyi `goalgo-yazilim\aiaddin\` altında yapın; **`ahenkbt/aiaddin`’e göndermek** için ayrı bir klasörde yalnız bu repoyu açın (`git remote -v` → `github.com/ahenkbt/aiaddin.git`). Örnek: `C:\Users\ahenk\Downloads\aiaddin-repo-publish` — `robocopy` ile `goalgo-yazilim\aiaddin` → bu klasör, ardından **yalnız burada** `git push origin main`.  
**Yapmayın:** `goalgo-yazilim` **kökünde** `origin` hâlâ `goalgo` iken push atıp “Aiaddin güncellendi” varsaymak.

---

## A0) Ayrı GitHub reposu: `github.com/ahenkbt/aiaddin` (boş repo + ilk push)

Monorepo (`goalgo`) ile **aynı klasörü paylaşmadan** yalnız Aiaddin dosyalarını bu repoda tutmak için:

1. GitHub’da **Private** `aiaddin` reposunu oluşturun (yaptınız): `https://github.com/ahenkbt/aiaddin`.
2. Ana geliştirme hâlâ `goalgo-yazilim` içindeki `aiaddin/` klasöründe kalabilir; **GitHub’a sadece bu ağacı** itmek için aşağıdakilerden birini kullanın.

### Seçenek A — Tek seferlik kopya + push (en anlaşılır)

PowerShell (yolları kendi kullanıcı adınıza göre düzeltin):

```powershell
$src = "C:\Users\ahenk\Downloads\goalgo-yazilim\aiaddin"
$dst = "C:\Users\ahenk\Downloads\aiaddin-repo-publish"
Remove-Item $dst -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path $dst | Out-Null
robocopy $src $dst /E /XD .git /NFL /NDL /NJH /NJS
Set-Location $dst
git init
git config user.name "GITHUB_KULLANICI_ADINIZ"
git config user.email "GITHUB_NOREPLY_EMAILINIZ"
git add -A
git commit -m "Initial commit: Aiaddin"
git branch -M main
git remote add origin https://github.com/ahenkbt/aiaddin.git
git push -u origin main
```

`git push` sırasında GitHub **kimlik doğrulaması** ister (tarayıcı, Personal Access Token veya Git Credential Manager). İşlem bitince GitHub sayfasında dosyalar görünür.

**Sonraki güncellemeler:** `goalgo-yazilim\aiaddin` içinde yaptığınız değişiklikleri tekrar `robocopy` ile bu klasöre alıp `git add` / `commit` / `push` yapabilirsiniz; veya ileride `git subtree split` ile otomasyon (ileri seviye).

### Seçenek B — Railway bu repoyu kullanır

`ahenkbt/aiaddin` için **Root Directory boş**; build repo kökündeki `Dockerfile` ile yapılır.

---

## A) GitHub (önce bunlar)

1. **Repoyu GitHub’a itin**  
   Yerelde: `git remote -v` ile uzak adresin `github.com/...` olduğundan emin olun → `git push origin main` (veya kullandığınız dal).

2. **Gizli bilgiyi repoya koymayın**  
   `.env`, `CRON_SECRET`, veritabanı şifresi, `APP_KEY` **asla commit edilmez**. Sadece `.env.example` repoda kalır.

3. **Railway / Vercel bağlantısı**  
   - **Railway (Aiaddin Laravel):** Project → **Connect Repo** → **`ahenkbt/aiaddin`** ( **`ahenkbt/goalgo` değil** ).  
   - **Vercel:** New Project → **Import** → kullanacağınız repo (çoğu zaman vitrin için ayrı kök/klasör).

4. **Dal politikası (isteğe bağlı)**  
   Settings → Branches: `main` korumalı, PR zorunlu — ekip büyüdükçe.

---

## B) Railway — Aiaddin Laravel + MySQL (asıl sunucu)

Monorepoda Laravel uygulaması: **`laravel-businesso/`**.  
**GitHub `ahenkbt/aiaddin` reposunda:** Repo kökünde `Dockerfile` + `railway.toml` vardır → Railway’de **Root Directory boş bırakın** (repo kökü).  
**Sadece `laravel-businesso` klasörünü kök seçtiyseniz:** O klasördeki `Dockerfile` kullanılır (eski yol).

### B1) Yeni Railway projesi

1. [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**.  
2. **`ahenkbt/aiaddin`** repoyu seçin.  
3. Servis **Settings → Root Directory:**  
   - **`ahenkbt/aiaddin` için:** alanı **boş** bırakın (kök `Dockerfile` kullanılsın).  
   - Monorepo içinden alt klasör deploy ediyorsanız: `aiaddin/laravel-businesso` yazın.

### B2) MySQL ekleme

1. Aynı projede **New** → **Database** → **MySQL**.  
2. MySQL servisinde **Variables** sekmesinden `MYSQLHOST`, `MYSQLPORT`, `MYSQLUSER`, `MYSQLPASSWORD`, `MYSQLDATABASE` değerlerini not edin (veya Railway’in verdiği **Reference** ile Laravel servisine bağlayın).

### B3) Railway “Variables” — ne işe yarar, ne ekleyeceğim? (detaylı)

> **Tek cümle:** Variables, Laravel’in sunucuda okuduğu **ayar listesi**dir (tıpkı bilgisayarınızdaki `.env` dosyası gibi). Buraya yazdığınız her şey **GitHub’a gitmez**; sadece Railway’de kalır.

> **`APP_URL` ile `WEBSITE_HOST` farkı (çoğu kişinin takıldığı yer):**  
> Railway size şöyle bir adres verir: `https://benim-app.up.railway.app`  
> - `APP_URL` kutusuna **tam adresi** yazarsınız: `https://benim-app.up.railway.app` (`https` dahil).  
> - `WEBSITE_HOST` kutusuna **sadece ortadaki ismi** yazarsınız: `benim-app.up.railway.app` (`https://` yok, sonda `/` yok).  
> Laravel’in route’ları (`web.php`) gelen isteğin **Host** başlığına göre bu değerlerle eşleşir.  
> **Özel alan** (ör. `benim.com`) kullanıyorsanız: Tarayıcıda çoğunlukla hangi adresi açacaksanız **`APP_URL` onu göstersin** (`https://benim.com`). `WEBSITE_HOST` hâlâ Railway adresi kalabilir; kod `APP_URL` host’u da tanır. İkisini aynı host yapmak da doğrudur (`WEBSITE_HOST=benim.com`, `APP_URL=https://benim.com`).

**Kafayı netleştirelim**

- **Railway’in otomatik `DATABASE_URL` değişkeni:** MySQL’e bağlantı eklediyseniz Railway bazen **`DATABASE_URL`** üretir. Laravel bu değişkeni **`DB_HOST` / `DB_USERNAME` vb. üzerine yazabilir**. Elle `DB_*` kullanıyorsanız `DATABASE_URL`’i **silin** veya güncel repodaki `config/database.php` (DB alanları dolu iken URL yok sayılır) deploy edilmiş olsun.
- **Dockerfile / `railway.toml` değişikliği** (build nasıl yapılır): Bunlar **Railway Variables ile eklenmez.** Sunucuda “PHP uzantısı kur, composer çalıştır” gibi işleri Dockerfile yapar.  
- **Variables** (ortam değişkenleri): Laravel’in çalışırken okuduğu **şifre, adres, anahtar** bilgileridir. Bunları **siz Railway arayüzüne yazarsınız**; kod içine ve GitHub’a koymazsınız.

**“Variable Reference” ne demek?**  
Railway’de iki kutu varmış gibi düşünün: biri **MySQL** servisinde `MYSQLHOST`, diğeri **Laravel** servisinde `DB_HOST`. Reference = “`DB_HOST` yazarken değeri elle kopyalama; MySQL’deki `MYSQLHOST` değişince burası da otomatik güncellensin” bağlantısı. Arayüzde değer alanında bazen **“Variable”** / **“Reference”** ikonu çıkar; tıklayıp MySQL’den `MYSQLHOST` seçersiniz. Çıkmazsa: MySQL servisinin **Variables** sekmesindeki `MYSQLHOST` değerini kopyalayıp Laravel’deki `DB_HOST`’a yapıştırmanız da olur (aynı işin manuel hali).

**Nereye tıklayacaksınız?**

1. Railway’de sol tarafta **aiaddin** servisinize tıklayın (Laravel uygulaması olan kart).  
2. Üstte **Variables** sekmesine geçin (`Deployments` / `Metrics` / `Settings` yanında).  
3. **“New Variable”** veya **“RAW Editor”** ile aşağıdaki isimleri **tek tek** ekleyin. Her satırda **Name** = sol sütun, **Value** = sağ sütun.

**Sıra önerisi (önce domain, sonra uygulama, sonra veritabanı)**

| Adım | Variable adı (tam yazın) | Değer nereden gelir? |
|------|---------------------------|----------------------|
| 0 | (Önce public URL) | **Settings** sekmesine gidin → **Networking** → **Generate Domain**. Çıkan adres örn. `https://aiaddin-production-xxxx.up.railway.app` — bunu kopyalayın. Sonra tekrar **Variables**’a dönün. |
| 1 | `APP_URL` | Generate Domain ile çıkan adresin **tamamı**, `https://` ile. Örn. `https://aiaddin-production-xxxx.up.railway.app` |
| 2 | `WEBSITE_HOST` | Aynı adresin **sadece host kısmı** (protokol ve `/` yok). Örn. `aiaddin-production-xxxx.up.railway.app` |
| 3 | `APP_ENV` | `production` |
| 4 | `APP_DEBUG` | `false` |
| 5 | `APP_KEY` | Laravel’in şifreleme anahtarı. **Nasıl üretilir:** PHP kurulu bilgisayarda `laravel-businesso` klasörüne gidin, `copy .env.example .env` yapın, `php artisan key:generate` çalıştırın; oluşan `.env` içindeki `APP_KEY=base64:...` satırını **komple** kopyalayıp Railway’deki `APP_KEY` değerine yapıştırın. (`key:generate --show` sadece anahtarı ekrana yazdırır; aynı mantık.) |
| 6 | `DB_CONNECTION` | `mysql` |
| 7 | `DB_HOST` | Veritabanının **bilgisayar adı** (IP veya host metni). MySQL servisinin Variables’ında `MYSQLHOST` yazar; onu kopyalayın **veya** Railway’in verdiği Reference ile bağlayın (yukarıdaki kutu açıklaması). |
| 8 | `DB_PORT` | Genelde `3306` veya MySQL’in verdiği port. |
| 9 | `DB_DATABASE` | MySQL’deki veritabanı adı (Railway’de çoğu zaman `MYSQLDATABASE` ile aynı mantık). |
| 10 | `DB_USERNAME` | MySQL kullanıcı adı. |
| 11 | `DB_PASSWORD` | MySQL şifresi. |
| 12 | `CRON_SECRET` | Klavyeden rastgele uzun bir metin veya şifre üretici ile **en az 32 karakter**; kimseyle paylaşmayın. Cron URL’lerine bu değeri header olarak vereceksiniz. |
| 13 | `SESSION_SECURE_COOKIE` | Public URL `https://` ise `true` yazın. |
| 14 | `LOG_CHANNEL` | (İsteğe bağlı) `stderr` — hatalar Railway **Deploy Logs**’da daha görünür olur. |
| 15 | `AIADDIN_AUTO_DATABASE` | (İsteğe bağlı) Boş bırakın veya `true` — container açılışında boş DB’ye `database.sql` import + `storage/installed`. Sihirbazı **kullanmak** istiyorsanız `false` yazın. |

**MySQL’i Laravel servisine “bağlama” kısayolu**

- Projede **ayrı bir MySQL** servisi varsa: Laravel’in `DB_HOST`, `DB_USER` vb. değerleri, MySQL servisindeki `MYSQLHOST`, `MYSQLUSER` ile **aynı bilgi** olmalı. Elle kopyalayabilir veya Railway’in **Reference** özelliğiyle “MySQL’deki kutuyu buraya bağla” diyebilirsiniz; ikisi de doğru yoldur.

**Özet cümle**

- **Build düzeltmesi** (Docker) için **yeni variable açmanız gerekmez.**  
- **Uygulamanın çalışması** için yukarıdaki tabloyu **bir kez** doldurmanız gerekir; eksik kalırsa beyaz ekran, 500, veritabanı hatası veya cron’un 503 vermesi görürsünüz.

**Aynı listenin kısa özeti:**

| Değişken | Örnek / not |
|----------|-------------|
| `APP_ENV` | `production` |
| `APP_DEBUG` | `false` |
| `APP_KEY` | `base64:...` (`key:generate --show`) |
| `APP_URL` | `https://....up.railway.app` |
| `WEBSITE_HOST` | `....up.railway.app` (sadece host) |
| `DB_CONNECTION` | `mysql` |
| `DB_HOST` / `DB_PORT` / `DB_DATABASE` / `DB_USERNAME` / `DB_PASSWORD` | MySQL servisinden |
| `CRON_SECRET` | Uzun gizli dize |
| `SESSION_SECURE_COOKIE` | HTTPS ise `true` |
| `LOG_CHANNEL` | İsteğe bağlı: `stderr` |
| `AIADDIN_AUTO_DATABASE` | İsteğe bağlı: `true` / `false` (otomatik SQL import; bkz. `config/aiaddin.php`) |

### B4) İlk deploy ve veritabanı (Businesso)

1. **Deploy** tamamlanınca Railway loglarına bakın: build hatası var mı.  
2. **Otomatik kurulum (önerilen — `/install` yok):** Container ilk ayağa kalkarken `docker-entrypoint.sh` çalışır: MySQL’e bağlanabiliyorsa ve veritabanında **hiç tablo yoksa** `public/installer/database.sql` import edilir, ardından `storage/installed` oluşturulur (web sihirbazı atlanır). **Kapatmak için** Railway Variable: `AIADDIN_AUTO_DATABASE=false` veya `0`. Davranış özeti: `config/aiaddin.php`. **İlk import uzun sürebilir**; healthcheck süresi `railway.toml` içinde yükseltildi.  
3. **Manuel:** İsterseniz yine `https://.../install/` sihirbazını kullanabilir veya SQL’i elle import edebilirsiniz.  
4. Sağlık kontrolü: `https://.../healthz` → `OK`.

### B5) Cron (Railway veya dış scheduler)

Üretimde süreli iş için harici cron (ör. **cron-job.org**, GitHub Actions `schedule`, veya sunucu cron) kullanın:

```text
GET https://SIZIN_APP_URL/subcheck
Header: X-Cron-Secret: <CRON_SECRET>
```

`check-payment` için aynı header ile `GET .../check-payment`.

---

## C) Vercel — ne zaman, ne yapılır?

| Yapılır | Yapılmaz |
|---------|----------|
| **Statik site:** `haber-merkezi/public` gibi bir klasörde sadece HTML/CSS/JS vitrin varsa, Vercel’de **Root Directory** o klasör, `vercel.json` ile build komutları minimal olabilir. | **Laravel / PHP uygulaması** Vercel’in klasik serverless modelinde **tam çalıştırılmaz**; Aiaddin motoru için Railway kullanın. |

### C1) Vercel’de statik vitrin (isteğe bağlı)

1. Vercel → **Add New** → **Project** → GitHub reposu.  
2. **Root Directory:** örn. `haber-merkezi` (içinde `vercel.json` + `public/` olan yapı).  
3. **Framework Preset:** Other veya Static.  
4. **Domains:** `aiaddin.net` ekleyin; DNS’te Vercel’in verdiği kayıtları girin.  
5. **Environment Variables:** Statik sitede genelde API tabanı gerekirse `VITE_...` veya public config — **gizli anahtarları** yalnız sunucu tarafında tutun; statik build’e admin sırrı koymayın.

**Özet:** Vercel = sadece **tanıtım / vitrin** istiyorsanız. **Üyelik, ödeme, admin, MySQL** = **Railway (Laravel)**.

---

## D) Özet tablo

| Platform | Sizin işiniz |
|----------|----------------|
| **GitHub** | Kodu itin; `.env` yok; Railway/Vercel repo erişimi verin. |
| **Railway** | MySQL + Laravel; **`ahenkbt/aiaddin` için Root Directory boş**; `APP_KEY`, `DB_*`, `CRON_SECRET`, `WEBSITE_HOST`; migrate; cron header. |
| **Vercel** | İsteğe bağlı statik vitrin; Laravel buraya taşınmaz. |

---

## E) Sorun giderme

| Belirti | Kontrol |
|---------|---------|
| Build: `database/seeds` / `database/factories` yok | Repoda bu klasörler commitli olmalı; Dockerfile’da **önce** kaynak kopyalanıp **sonra** `composer install` çalışmalı (güncel `Dockerfile` böyle). |
| 503 cron | `CRON_SECRET` boş veya header yanlış |
| 500 Laravel | `APP_KEY`, `DB_*`, log (`LOG_CHANNEL=stderr`) |
| Build başarılı, `/` veya ana sayfa **500** | Veritabanı boş / tablolar yok. **İlk kurulum:** tarayıcıda `https://RAILWAY_URL/install/` sihirbazını bitirin (`WEBSITE_HOST` ile aynı host’ta açın) **veya** `laravel-businesso/public/installer/database.sql` dosyasını MySQL’e import edin, ardından kurulum bitince oluşan `storage/installed` dosyası olmalı. |
| **`/install` 500**, DB henüz boşken | Kurulum ekranı `vendor.installer.*` Blade’lerini ister; repoda yoksa view hatası. **Docker:** güncel `Dockerfile` `rachidlaasri/laravel-installer` içinden `Views` + `public/installer` asset’lerini kopyalar. **Yerel:** `php artisan vendor:publish --provider="RachidLaasri\\LaravelInstaller\\Providers\\LaravelInstallerServiceProvider" --tag=laravelinstaller --force` |
| Build başarılı, healthcheck “service unavailable” | Eski: `AppServiceProvider` içinde `exit` — güncel kod `HttpResponseException` ile yönlendirir; healthcheck yolu `/healthz` kalsın. |
| 500, DATABASE_URL yok, DB_* doğru | Çoğunlukla **boş veya yarım DB** + `storage/installed` (`BS::first()` null). **Deploy log:** `SQL import finished` var mı? Yoksa `DB_PASSWORD` / `DB_DATABASE` yanlış veya MySQL yenilendi. Çözüm: MySQL’i temizleyip **redeploy**; güncel `docker-entrypoint` boş tabloda `storage/installed` siler ve yeniden import dener. |

| 500, Variables doğru görünüyor | **Deploy Logs** (stderr) stack trace arayın; imajda `LOG_CHANNEL=stderr` varsayılan. **Teşhis:** Variables’a `AIADDIN_DIAG_SECRET` = uzun rastgele dize ekleyin; yerelden veya `curl -H "X-Aiaddin-Diag: GİZLİ" "https://.../healthz"` → JSON’da `db`, `languages_count`, `basic_settings_count` görünür. |

Daha fazla güvenlik ve Businesso notları: `aiaddin/laravel-businesso/docs/BUSINESSO_GUVENLIK.md`.
