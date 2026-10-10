# Portal teması ailesi ve sektör platformları — VPS dağıtımı

Bu dizin, VPS’te (`/docker/php-theme`) canlı olan PHP tema dosyalarının kaynak kopyasıdır. Konteyner `php-theme-yenisafak`, çalışma kökü `/app`. Dosyalar yeniden başlatma olmadan `docker cp` ile kopyalanır, sonra `php -l` ile denetlenir.

Paneldeki `hmPortalTheme` değeri (`okul` | `muhtar` | `sendika`) ortak haber kabuğuna `public/brand/sector/news-*.css` yükler. `portal` ve `yeni` görünümü değiştirmez. `layout_json.hmSector` dolu siteler (muhtar / sendika / okul platformları) `templates/sector/*` kabuğunu kullanır.

`config/sector.json` (yazma DSN) bu pakette yoktur ve repoya konmaz. VPS’teki dosya yerinde kalır.

## Yollar

| Repo | VPS ana makine | Konteyner |
|------|----------------|-----------|
| `src/Sector.php` | `/docker/php-theme/src/Sector.php` | `/app/src/Sector.php` |
| `config/sectors.json` | `/docker/php-theme/config/sectors.json` | `/app/config/sectors.json` |
| `templates/layout.php` | `/docker/php-theme/templates/layout.php` | `/app/templates/layout.php` |
| `templates/sector/` | `/docker/php-theme/templates/sector/` | `/app/templates/sector/` |
| `public/brand/sector/` (`news-okul.css`, `news-muhtar.css`, `news-sendika.css` dahil) | `/docker/php-theme/public/brand/sector/` | `/app/public/brand/sector/` |

`templates/layout.php` tüm haber sitelerinin ortak kabuğudur. Üzerine yazmadan önce yedek alın.

## Dağıtım

VPS’te, paket `/docker/php-theme` altına aynı dizin yapısıyla konduktan sonra:

```bash
SRC=/docker/php-theme
CTR=php-theme-yenisafak
STAMP=$(date +%Y%m%d-%H%M)
BAK="$SRC/backups/sector-themes-$STAMP"
mkdir -p "$BAK/templates" "$BAK/src" "$BAK/config" "$BAK/public/brand"

docker cp "$CTR:/app/templates/layout.php" "$BAK/templates/layout.php"
docker cp "$CTR:/app/templates/sector" "$BAK/templates/sector" || true
docker cp "$CTR:/app/src/Sector.php" "$BAK/src/Sector.php" || true
docker cp "$CTR:/app/config/sectors.json" "$BAK/config/sectors.json" || true
docker cp "$CTR:/app/public/brand/sector" "$BAK/public/brand/sector" || true

docker cp "$SRC/src/Sector.php" "$CTR:/app/src/Sector.php"
docker cp "$SRC/config/sectors.json" "$CTR:/app/config/sectors.json"
docker cp "$SRC/templates/layout.php" "$CTR:/app/templates/layout.php"
docker cp "$SRC/templates/sector/." "$CTR:/app/templates/sector/"
docker cp "$SRC/public/brand/sector/." "$CTR:/app/public/brand/sector/"

docker exec "$CTR" php -l /app/src/Sector.php
docker exec "$CTR" php -l /app/templates/layout.php
docker exec "$CTR" sh -c 'for f in /app/templates/sector/*.php; do php -l "$f" || exit 1; done'
```

Konteyner yeniden başlatılmaz. `App.php` içindeki `sector 2026-10-10` yönlendirme parçaları bu dizinde yoktur; canlı konteynerde zaten durur.

## Geri alma

Yedeği konteynere geri kopyalayın (örnek damga `sector-themes-YYYYMMDD-HHMM`):

```bash
SRC=/docker/php-theme
CTR=php-theme-yenisafak
BAK="$SRC/backups/sector-themes-YYYYMMDD-HHMM"

docker cp "$BAK/templates/layout.php" "$CTR:/app/templates/layout.php"
docker cp "$BAK/src/Sector.php" "$CTR:/app/src/Sector.php"
docker cp "$BAK/config/sectors.json" "$CTR:/app/config/sectors.json"
test -d "$BAK/templates/sector" && docker cp "$BAK/templates/sector/." "$CTR:/app/templates/sector/"
test -d "$BAK/public/brand/sector" && docker cp "$BAK/public/brand/sector/." "$CTR:/app/public/brand/sector/"
```

Eski sektör yedeği: `/docker/php-theme/backups/sector-20261010/`. Sektör kabuğunu kapatmak için ilgili sitenin `layout_json` içinden `hmSector` anahtarını silin; site normal haber temasına döner. Portal kabuğunu kapatmak için `hmPortalTheme` anahtarını silin (`portal` / boş = varsayılan Portal).
