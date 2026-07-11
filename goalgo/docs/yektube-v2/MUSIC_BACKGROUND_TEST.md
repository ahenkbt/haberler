# P1-M3 — Müzik arka plan test checklist

`/müzik` sekmesinde mini oynatıcı açıkken aşağıdaki senaryoları doğrulayın.

## Android (Chrome / PWA)

- [ ] Parça oynarken ekranı kilitle → ses devam eder
- [ ] Kilit ekranında **Duraklat** / **Oynat** Media Session ile çalışır
- [ ] Kilit ekranında **Sonraki** sıradaki parçaya geçer
- [ ] Tarayıcıyı arka plana al (Home) → ses kesilmez
- [ ] Uygulamaya dönünce ilerleme çubuğu senkron kalır

## iOS (Safari / Ana ekrana ekle)

- [ ] Parça oynarken ekranı kilitle → ses devam eder (Safari kısıtlarına bağlı)
- [ ] Kilit ekranı kontrolleri görünür ve yanıt verir
- [ ] Sekme arka plana geçince ses devam eder veya `visibilitychange` ile resume olur
- [ ] Ana ekran PWA’dan açılışta oturum korunur

## Genel

- [ ] Network’te embed izinli parçada `/play` isteği yok (iframe-first)
- [ ] Embed kapalı parçada native `/play?audio=1` fallback devreye girer
- [ ] Yekçek / izleme sayfası açılınca müzik `stopAllHtmlMedia` ile durmaz (`keepMusic`)