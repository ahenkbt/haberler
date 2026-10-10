# Spor Gündemi kabuğu (spor.gundemi.org)

Site: `hm_news_sites` **id 1146**, slug `spor`, alan `spor.gundemi.org` (domain2 `spor.fix.tc`). `layout_json.hmCatTree` zaten `spor`. Bu paket yeni bir kategori açmaz; duran slug'lar görünür kalır: `spor`, `futbol`, `basketbol`, `voleybol`, `hentbol`, `gures`, `atletizm` ve sitede tanımlı diğer branşlar (`tenis`, `yuzme`, `motor-sporlari`, `dovus-sporlari`, `e-spor`, `amator-spor`, `engelli-sporlari`, `ozel-haber`).

Kabuk **yalnız** `layout_json.hmSpor = true` iken devreye girer. Bayrak yokken `App.php` hunk'ları `Spor::on()` içinde kalır; spor sitesi dahil herkes eski Yenişafak görünümünü sürdürür.

Palet ekonomi temasından (lacivert / krem / altın) ve portal kırmızısından ayrıdır: canlı saha yeşili, koyu antrasit, sarı vurgu.

## Canlı veri

| Ne | Kaynak | Yoksa |
|---|---|---|
| Süper Lig puan durumu | `https://site.api.espn.com/apis/v2/sports/soccer/tur.1/standings` | Tablo ve puan şeridi gizlenir |
| Skor ve fikstür | `https://site.api.espn.com/apis/site/v2/sports/soccer/tur.1/scoreboard?dates=YYYYMMDD` | Skor şeridi ve fikstür gizlenir |

Başlamamış maçta ESPN skor alanına `0` yazar; bu değer basılmaz. Tablo 8 geçerli satırdan kısaysa hiç gösterilmez. Önbellek 90 saniye taze, kaynak susunca son iyi veri **en fazla 6 saat**. Süre dolunca şerit kaybolur. Rastgele veya sabit yedek skor yok.

Aynı ESPN dizininde Türkiye basketbol veya voleybol ligi yok (çekirdek lig listesi tarandı). Bu branşlar haber bloğu olarak durur; skor uydurulmaz.

Ticari lisans notu: TheSportsDB ücretsiz katmanı yayımlanmış ürün için uygun değil, football-data.org ücretsiz planı ticari değil, Sportmonks ücretli, TFF sayfalarının ticari kullanımı yazılmadan serbest değil. Anahtarsız çalışan uç ESPN `tur.1`. ESPN site şartları içeriği ticari yeniden yayın için ayrı lisans istemez diye bir izin vermez; şeritte kaynak adı görünür, önbellek 6 saatle sınırlıdır, cevap yoksa blok yoktur. Lisans uygun görülmezse bayrağı kapatmak yeter, dosya silmeden eski temaya dönülür.

## Dosyalar

Canlı dizin, VPS `/docker/php-theme/` ve konteyner `/app/` ile aynıdır.

| Paket | VPS | Konteyner |
|---|---|---|
| `src/Spor.php` | `/docker/php-theme/src/Spor.php` | `/app/src/Spor.php` |
| `src/SporLive.php` | `/docker/php-theme/src/SporLive.php` | `/app/src/SporLive.php` |
| `templates/spor/*` | `/docker/php-theme/templates/spor/` | `/app/templates/spor/` |
| `public/brand/spor/*` | `/docker/php-theme/public/brand/spor/` | `/app/public/brand/spor/` |

Konteyner adı: `php-theme-yenisafak`. Yeniden oluşturulmaz.

## Kurulum

Paket bu repodan VPS'e alındıktan sonra (`$SRC` = `hostinger/php-theme-spor` yolu):

```bash
set -euo pipefail
SRC=/path/to/hostinger/php-theme-spor
DEST=/docker/php-theme
STAMP=spor-20261010
mkdir -p "$DEST/src" "$DEST/templates/spor" "$DEST/public/brand/spor" "$DEST/backups/$STAMP"

install -m 644 "$SRC/src/Spor.php" "$DEST/src/Spor.php"
install -m 644 "$SRC/src/SporLive.php" "$DEST/src/SporLive.php"
cp -a "$SRC/templates/spor/." "$DEST/templates/spor/"
cp -a "$SRC/public/brand/spor/." "$DEST/public/brand/spor/"

docker cp php-theme-yenisafak:/app/src/App.php "$DEST/backups/$STAMP/App.php.before"
cp "$DEST/backups/$STAMP/App.php.before" /tmp/App.spor.php
python3 "$SRC/patch_app_php.py" /tmp/App.spor.php
cp /tmp/App.spor.php "$DEST/backups/$STAMP/App.php.after"

docker cp "$DEST/src/Spor.php" php-theme-yenisafak:/app/src/Spor.php
docker cp "$DEST/src/SporLive.php" php-theme-yenisafak:/app/src/SporLive.php
docker cp "$DEST/templates/spor/." php-theme-yenisafak:/app/templates/spor/
docker cp "$DEST/public/brand/spor/." php-theme-yenisafak:/app/public/brand/spor/
docker cp /tmp/App.spor.php php-theme-yenisafak:/app/src/App.php

docker exec php-theme-yenisafak php -l /app/src/App.php
docker exec php-theme-yenisafak php -l /app/src/Spor.php
docker exec php-theme-yenisafak php -l /app/src/SporLive.php
docker exec php-theme-yenisafak sh -c 'for f in /app/templates/spor/*.php; do php -l "$f"; done'
```

`docker cp` dizin kopyasında hedef klasör yoksa önce `docker exec php-theme-yenisafak mkdir -p /app/templates/spor /app/public/brand/spor`.

Sınıf bulunamazsa (optimize composer classmap) ve ekonomi sınıfı `Eco` aynı şekilde yüklenmiyorsa:

```bash
docker exec php-theme-yenisafak sh -c 'cd /app && composer dump-autoload -o'
```

`Eco` dosya kopyasıyla açılıyorsa bu adım gerekmez. PSR-4 `Yenisafak\` → `src/` yeni dosyayı dump olmadan görür.

## layout_json bayrağı

`layout_json` metin kolondur. `hmCatTree` ve kategori listelerine dokunulmaz; yalnız `hmSpor` eklenir.

```sql
BEGIN;
UPDATE hm_news_sites
   SET layout_json = (coalesce(nullif(layout_json, ''), '{}')::jsonb
                      || jsonb_build_object('hmSpor', true))::text,
       updated_at = now()
 WHERE id = 1146
   AND slug = 'spor'
   AND lower(domain) = 'spor.gundemi.org'
RETURNING id, slug, layout_json::jsonb->>'hmSpor' AS hm_spor,
          layout_json::jsonb->>'hmCatTree' AS hm_cat_tree;
COMMIT;
```

Bayrak yazılmadan site eski görünümde kalır. Dosyalar duruyor olsa da `Spor::on()` false döner.

## OpCache

`docker cp` dosya mtime'ını günceller. Çalışan FrankenPHP'de `opcache.validate_timestamps=1` ise yeni `App.php` / `Spor.php` bir sonraki istekte okunur; konteyner yeniden başlatılmaz.

Kapalıysa (`validate_timestamps=0`) süreç eski bytecode'u tutar. Kontrol:

```bash
docker exec php-theme-yenisafak php -i | grep -E 'opcache.validate_timestamps|opcache.revalidate_freq'
```

CLI `php -i` ile worker aynı ini'yi kullanmayabilir. Timestamps kapalıysa tam recreate yerine süreç yenilemesi:

```bash
docker kill --signal=USR2 php-theme-yenisafak
```

USR2 worker'ı yenilemezse konteyneri yeniden yaratmak son çaredir; önce yedeği (`App.php.before`) durduğundan emin olun.

## Geri alma

```bash
STAMP=spor-20261010
docker cp /docker/php-theme/backups/$STAMP/App.php.before php-theme-yenisafak:/app/src/App.php
docker exec php-theme-yenisafak rm -f /app/src/Spor.php /app/src/SporLive.php
docker exec php-theme-yenisafak rm -rf /app/templates/spor /app/public/brand/spor
```

Bayrağı kaldırmak, dosyalar dururken de eski temaya döndürür:

```sql
UPDATE hm_news_sites
   SET layout_json = (layout_json::jsonb - 'hmSpor')::text,
       updated_at = now()
 WHERE id = 1146 AND slug = 'spor';
```

## Doğrulama

```bash
php tools/check_spor_live.php
curl -sI https://spor.gundemi.org/ | head
curl -s https://spor.gundemi.org/ | grep -E 'spor.css|spor-strip|SPOR'
```

Bayrak kapalıyken gövdede `spor.css` olmamalı. Açıkken ana sayfada manşet, branşlar (`/kategori/futbol` vb.) ve kaynak dönerse Süper Lig tablosu görünür. Kaynak susunca şerit yoktur; haberler durur.
