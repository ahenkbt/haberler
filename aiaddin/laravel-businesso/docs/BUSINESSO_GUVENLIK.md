# Businesso (Laravel) — güvenlik ve çok kiracılı mimari

Bu paket `aiaddin/laravel-businesso` altındadır. Aiaddin ürününde siteler **Businesso mantığında** (paket / abonelik / alt alan veya özel domain ile çoklu site) kurulacaktır; ön yüz davranışı Businesso ön yüzü ile uyumludur.

## Bu repoda yapılan sertleştirmeler

1. **Cron HTTP uçları** (`/subcheck`, `/check-payment`, ana domainde `/expired`, `/expiry-reminder`) artık **doğrudan herkese açık değildir**. `.env` içinde `CRON_SECRET` tanımlanmalıdır; çağrıda aşağıdakilerden biri kullanılır:
   - Tercihen header: `X-Cron-Secret: <CRON_SECRET>`
   - Alternatif: sorgu `?token=<CRON_SECRET>` (URL loglarında görünebilir; header tercih edin)

   `CRON_SECRET` boşsa bu rotalar **503** döner (yanlışlıkla açık cron bırakılmaz).

2. **Bakım modu** middleware’i Laravel 9 ile uyumlu `PreventRequestsDuringMaintenance` tabanına alındı (`CheckForMaintenanceMode` sınıfı).

3. **Oturum çerezi** `same_site` varsayılanı `lax` (ortam değişkeni: `SESSION_SAME_SITE`). HTTPS üretimde `SESSION_SECURE_COOKIE=true` kullanın.

4. **CronJobController::expired** içindeki boş `catch` kaldırıldı; hatalar `Log` ile yazılır.

## Üretim kontrol listesi

| Madde | Açıklama |
|--------|-----------|
| `APP_DEBUG` | Üretimde **false** |
| `APP_KEY` | `php artisan key:generate` ile dolu |
| `CRON_SECRET` | Uzun rastgele dize; sadece cron sunucunuzda |
| `WEBSITE_HOST` | Ana vitrin domain’i (routes `web.php` ile uyumlu) |
| HTTPS | TLS zorunlu; `SESSION_SECURE_COOKIE=true` |
| `composer audit` | Düzenli çalıştırın; kritik CVE’lerde güncelleme planı |
| Yedek | Veritabanı + `storage/app` içeriği |
| Kurulum sihirbazı | Canlıda **kapatılmış** / kaldırılmış olmalı (`installed` dosyası + web erişimi) |

## Bilinen mimari riskler (kaynak kod düzeyi)

- HTTP isteği içinden `queue:work` çağrısı yoğun trafikte risklidir; mümkünse **sunucu cron** ile `php artisan schedule:run` ve ayrı **queue worker** süreci kullanın.
- Ödeme bildirimleri için CSRF istisnaları (`VerifyCsrfToken`) gerekli; URL’lerin **ödeme sağlayıcı IP’leri** ile sınırlı olduğundan emin olun (mümkünse webhook imzası doğrulayın).

## “Sıfırdan yaz” notu

Tüm Businesso dosyalarını tek seferde yeniden yazmak yerine, bu repoda **kritik yüzeyler** (cron, bakım modu, oturum, loglama) sıkılaştırıldı. İleride Aiaddin için **ince bir çekirdek** (tenant + paket + ödeme) çıkarılıp geri kalan modüller kademeli taşınabilir; yol haritası: `haber-merkezi/docs/AIADDIN_YOL_HARITASI.md`.
