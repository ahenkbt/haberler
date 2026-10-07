# Hostinger PHP paketleri

| Paket | Siteler | Not |
|-------|---------|-----|
| [`php-kurumsal/`](./php-kurumsal/) | `vatankahramanlari.org` (VKD), `trafikdernegi.com` / `tgd.tc` (TGD) | Vatan kurumsal ön yüz; haber Yenişafak twin değil |
| [`gundemi-bolge/`](./gundemi-bolge/) | `ege.gundemi.org` … `kibris.gundemi.org` (8 alt alan) | Yenişafak haber; config + logos + DNS/VPS adımları |
| [`fixhaber/`](./fixhaber/) | `fix.tc` / `www.fix.tc` (Fix Haber) | Yenişafak haber; Traefik + DNS ops (logo yok → metin marka) |

Haber siteleri (yesilvatan, sehitgazi, …) ayrı Yenişafak PHP teması ile aynı VPS’te (`187.77.84.201`) zaten yayında; `php-kurumsal` yalnızca **kurumsal** cutover paketidir. `gundemi-bolge` bölgesel Yenişafak siteleri için config/logo + ops dokümanıdır.

Deploy: [`php-kurumsal/DEPLOY.md`](./php-kurumsal/DEPLOY.md) · [`gundemi-bolge/DEPLOY.md`](./gundemi-bolge/DEPLOY.md) · [`fixhaber/DEPLOY.md`](./fixhaber/DEPLOY.md)
