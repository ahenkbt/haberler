# Yapilanlar / Pushlanacaklar

> **Son push:** 19 Haziran 2026 — `origin/main` = `52fce31d` (`revert(haberler)`: `bf9f790d` manşet theme blokları tam geri al; önceki: `e24e8395`).
> Kapsam: manşet theme revert (`52fce31d`); `bf9f790d` manşet blokları origin'de geri alındı.

---

## Bu commit'te dahil edilenler

| # | Madde | Durum | Not |
|---|-------|-------|-----|
| 1 | KategoriDetay overlay kontrast | ✅ | `text-white` + `drop-shadow-md`, gradient mevcut |
| 2 | `hmHeadlinePool.ts` min 15 / max 20 | ✅ | Havuz/limit only; hero JSX baseline korundu |
| 3 | MANŞET HABER (`esenThemeBlock`) manuel-only | ✅ | `buildMansetHeadlineOnlyPool`, toggle render |
| 4 | Vitrin modül toggles tüm temalarda | ✅ | `resolveHmNewsHomeModuleEnabled`, placeholder |
| 5 | `hmHomeModuleCategories` slug merge | ✅ | Otomatik kategori dağıtımı |
| 6 | Kategori kutuları 1+5 | ✅ | `HmCategoryBoxLayout`, `hmCategoryBoxItems` |
| 7 | `/tum-haberler` kategori gruplama + kurumsal filtre | ✅ | `TumHaberler.tsx`, `portalHmEditorNews` |
| 8 | Kategori menü ☘️ | ✅ | `HmNewsCategoriesDropdown`, nav strip/header |
| 9 | `HmNewsSearchBox` modülü | ✅ | `yekpareSearchBox` slot |
| 10 | PWA site-özel manifest | ✅ | `middleware.js`, `pageSeo`, `hm.ts` |
| 11 | Galeri/Video TV 6 içerik + editör alanları | ✅ | `hmMediaSpotlightPool`, vitrin editör |
| 12 | Menü dış URL | ✅ | `6d585dc2` korundu |
| 13 | UTF-8 ek düzeltme (`2cd2af69`) | ✅ | SON DAKİKA, Sağlık, Son Haber Akışı, bağış metinleri |

### Manşet güvenlik (bilinçli hariç tutulanlar)

- `hmVitrinThemes.css` — **grid/aspect-ratio/height değişmedi** (yalnızca `:has(.hm-classic-feature-shade)` ile renk sızıntısı düzeltmesi, 5167616b)
- `HaberAnasayfasi` hero JSX/grid — **baseline layout korundu** (classic/portal3/full-numbered varyantları)
- `HeadlineNumberPagination` — **eklenmedi**
- Global dedupe hero havuzuna seed — **boş seed** (yan kart / MANŞET HABER boşaltması önlendi)
- Ara manşet (`portal3`/`esen`) — **embedded `StableContainedHeadline`**, çift section yok

---

## Bu commit'te atlananlar

| Madde | Neden |
|-------|-------|
| P6 Postgres-ZfoJ Railway cutover | Manuel Railway — kullanıcı talimatı |
| `0086` migrasyon deploy | DB cutover sonrası |
| Manşet LAYOUT (`/tum-haberler` orantı, numaralı slider CSS) | Açık kullanıcı talimatı yok |
| `hmVitrinThemes.css` ajans/wsj grid CSS | Manşet global CSS yasağı |
| Admin/editör JSDoc mojibake (`EditorVitrinAyarlari` vb.) | Kullanıcı arayüzü dışı; ayrı PR |

---

## Geri alma

```bash
git revert HEAD
git push origin main
```

**Baseline öncesi:** `6d585dc2` (menü URL) + bu commit.

---

## Push öncesi kontrol

- [x] `pnpm exec tsc --noEmit` — ahenkpress + api-server
- [x] Manşet CSS grid/aspect-ratio/height değişmedi
- [x] Hero JSX baseline korundu
- [x] Yalnızca haber/vitrin dosyaları stage edildi
