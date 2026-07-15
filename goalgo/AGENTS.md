# Yekpare Cloud Agent — Otonom Düzeltme Talimatları

> **Amaç:** P0→P3 yol haritasını **sırayla**, **tek PR = tek konu** ile uygula.  
> **Kaynak:** [docs/YEKPARE-CANIYA-CIKIS-YOL-HARITASI.md](./docs/YEKPARE-CANIYA-CIKIS-YOL-HARITASI.md)  
> **Detaylı playbook:** [docs/CLOUD-AGENT-OTOMATIK-TALIMAT.md](./docs/CLOUD-AGENT-OTOMATIK-TALIMAT.md)

---

## Her oturumda (zorunlu)

1. **Durum oku:** `docs/YEKPARE-CANIYA-CIKIS-YOL-HARITASI.md` içindeki `- [ ]` maddelerinden **ilk tamamlanmamış P0** maddesini seç.
2. **Tek görev:** Bir oturumda yalnızca **bir** checklist maddesi (veya bir alt-PR).
3. **Dal:** `auto/p0-<kısa-ad>` veya `auto/p1-<kısa-ad>` — `main`'den aç; **main'e doğrudan push etme**.
4. **Kapsam:** Yalnızca ilgili dosyalar; geniş refactor yok. `map.ts` / `Kesfet.tsx` parçalama P3'e ertelenir.
5. **Doğrula:** `cd goalgo && pnpm run typecheck` (api-server + ahenkpress etkilendiyse).
6. **Commit + push** dalı; **PR aç** (`gh pr create`).
7. **Typecheck geçerse otomatik merge:** `gh pr merge --merge --delete-branch` — Approval Agent / Bugbot beklemeyin (solo-dev repo). Önce `gh pr checks` ile `build` yeşil olmalı. Detay: [docs/CURSOR-PR-ONAY-KURULUM.md](../docs/CURSOR-PR-ONAY-KURULUM.md)
8. **Yol haritasını güncelle:** Tamamlanan maddeyi `- [x]` yap.
9. **Sonraki maddeye geç:** Aynı oturumda veya yeni cloud agent ile bir sonraki `- [ ]` maddesi.

---

## Stack (yanlış varsayım yapma)

- Backend: `artifacts/api-server` — Express 5, Drizzle, PostgreSQL
- Frontend: `artifacts/ahenkpress` — React, Vite, wouter
- Migrations: `lib/db/migrations/` + `meta/_journal.json` (Prisma yok)
- Auth guard: `denyUnlessAdminMaintenance` — `src/lib/admin-guard.ts`
- **Deploy (prod):** Cloudflare Workers (SPA Assets + API Container) + **Neon** Postgres. Detay: `docs/CLOUDFLARE-NEON-KURULUM.md`
- **Redeploy:** `main` merge → GitHub Actions `cloudflare-production.yml` (`CLOUDFLARE_*`, `DATABASE_URL`, `SESSION_SECRET`). Render/Netlify/Railway/Vercel prod değildir.

---

## P0 sırası (bu sırayı bozma)

| Sıra | Görev | Dosyalar |
|------|--------|----------|
| P0-1 | Migrate uçlarına admin guard | `transport.ts`, `customer.ts`, `partners.ts` |
| P0-2 | Auth'suz delivery/premium DELETE/PUT kapat | `delivery.ts`, `premium.ts` |
| P0-3 | Geliver webhook imza + parametrik SQL | `providers.ts` |
| P0-4 | Sipariş IDOR (tracking token veya auth) | `delivery.ts` |
| P0-5 | `my-reservations` SQL injection düzelt | `delivery.ts` |
| P0-6 | Shop order IDOR | `shop-checkout.ts`, `ecommerce.ts` |
| P0-7 | Migration journal senkron (0047–0060, 0091–0094) | `lib/db/migrations/meta/_journal.json` |
| P0-8 | Transport 500 — tablo/DDL uyumu | `transport.ts`, migrations |
| P0-9 | Stub gizle veya route kapat | `MagazaSepet.tsx`, `MagazaOdeme.tsx` |
| P0-10 | Checkout Stripe bypass kaldır | `Checkout.tsx` |

P0 bittikten sonra P1 maddelerine geç — yol haritasındaki sırayı takip et.

---

## Güvenlik kuralları (her patch)

- Yeni public endpoint: auth middleware zorunlu.
- SQL: `sql.raw` + string birleştirme **yasak**; Drizzle parametreli sorgu.
- Webhook: imza doğrulama olmadan state güncelleme **yasak**.
- Secret / `.env` commit **yasak**.
- Demo şifreleri prod seed'de devre dışı bırak.

---

## PR şablonu

```
## Checklist maddesi
P0-X: ...

## Değişiklik
- ...

## Test
- [ ] pnpm run typecheck
- [ ] (varsa) ilgili endpoint manuel

## Risk
Düşük / Orta — ...
```

---

## Oturum sonu mesajı (kullanıcıya)

- Tamamlanan madde
- PR URL
- Sonraki madde (henüz başlama)
- Blocker varsa net yaz
