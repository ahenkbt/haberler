# Cloud Agent — Otomatik Arka Plan Düzeltme (PC kapalıyken)

Bu doküman, Cursor **Cloud Agent** veya **Automation** ile yol haritasının sırayla uygulanması içindir.

---

## Ön koşullar (bir kez)

1. **GitHub:** `Ahenk-BT/goalgo` — bu dosyalar `main`'e push edilmiş olmalı:
   - `goalgo/AGENTS.md`
   - `goalgo/docs/YEKPARE-CANIYA-CIKIS-YOL-HARITASI.md`
   - `goalgo/.cursor/rules/*.mdc`
2. **Cursor Dashboard → Cloud Agents:** Compute açık, repo erişimi var.
3. **Prod deploy (Netlify + Render):** Cloud agent commit edemez; sadece kod + PR. `main` merge sonrası Netlify GH Actions ile deploy olur (frontend değiştiyse); Render API repo hook veya Render dashboard **Manual Deploy** ile güncellenir. Railway/Vercel workflow'ları birincil yol değildir.

---

## Yöntem A — Cloud Agent (önerilen, PC kapalıyken çalışır)

### Manuel başlatma (ilk oturum)

1. [cursor.com/dashboard](https://cursor.com/dashboard?tab=cloud-agents) → **New Cloud Agent**
2. Repo: `Ahenk-BT/goalgo`, branch: `main`
3. Root directory: `goalgo` (monorepo alt klasör)
4. **Prompt (kopyala-yapıştır):**

```
AGENTS.md dosyasını oku ve P0-1 maddesini uygula.
Kurallar: tek PR, auto/p0-migrate-auth dalı, typecheck, PR aç, yol haritasında maddeyi [x] yap.
Başka P0 maddesine geçme.
```

5. Agent bitince PR'ı incele → merge → yeni Cloud Agent oturumu P0-2 ile.

### Zincirleme (her merge sonrası)

Aynı prompt'ta `P0-1` → `P0-2` → … diye sıra numarasını değiştir.

---

## Yöntem B — Cursor Automation (günlük otomatik)

Automation: **her hafta içi 09:00** cloud agent tetikler.

**Tetikleyici:** Cron `0 9 * * 1-5`  
**Runtime:** Cloud  
**Repo:** `Ahenk-BT/goalgo`, branch `main`, working dir `goalgo`

**Automation prompt:**

```
Read goalgo/AGENTS.md and goalgo/docs/YEKPARE-CANIYA-CIKIS-YOL-HARITASI.md.

Find the first unchecked P0 item in the roadmap checklist.
Implement ONLY that item on branch auto/p0-<slug>.
Run: cd goalgo && pnpm run typecheck
Commit, push, open PR with gh pr create.
If typecheck passes: gh pr merge --merge --delete-branch (do not wait for human merge).
Mark the checklist item [x] in YEKPARE-CANIYA-CIKIS-YOL-HARITASI.md in the same branch.
Then continue to the next unchecked P0 item in the same run if possible.
```

Automation'ı Cursor → **Automations** UI'dan oluşturun (agent bu oturumda taslağı açabilir).

---

## PR onay ve Bugbot (solo-dev)

PR'lar *Not approving* veya kırmızı CI ile takılıyorsa: [docs/CURSOR-PR-ONAY-KURULUM.md](../../docs/CURSOR-PR-ONAY-KURULUM.md)

Özet:
- CI `build` fail → `pnpm run typecheck` düzelt, push
- Bugbot pending → Dashboard'da **Use Bugbot Review Context** kapat veya PR'a `cursor review` yaz
- Merge: `gh pr merge <n> --merge --delete-branch` (Approval Agent onayını bekleme)

---

## Yöntem C — Yerel agent + arka plan (PC açıkken)

Cursor Chat/Agent'ta:

```
@AGENTS.md @YEKPARE-CANIYA-CIKIS-YOL-HARITASI.md
P0-1'i uygula. Tek PR. Bitince dur.
```

Arka plan subagent: Task / Cloud Agent ile `environment: cloud` — PC kapalıyken B veya A gerekir.

---

## Oturum başına prompt şablonları

### P0-1 Migrate auth
```
P0-1: POST /api/transport/migrate, /customer/migrate, /partners/migrate
endpoint'lerine denyUnlessAdminMaintenance ekle (delivery/migrate deseni).
Dosyalar: transport.ts, customer.ts, partners.ts, admin-guard.ts
```

### P0-3 Geliver
```
P0-3: providers.ts Geliver webhook — HMAC/secret doğrulama ekle;
ingestGeliverWebhookEvent öncesi reddet; SQL parametrik olsun.
```

### P0-7 Migration journal
```
P0-7: lib/db/migrations/meta/_journal.json — 0047-0060, 0091, 0092, 0094
yetim dosyalarını journal'a ekle; çift 0061/0090 numaralarını çöz.
db-migrate.mjs dry-run mantığını bozma.
```

---

## İnsan onay noktaları (agent durmalı)

| Olay | Aksiyon |
|------|---------|
| typecheck geçti | `gh pr merge --merge --delete-branch` — bekleme yok |
| typecheck fail | Düzelt, aynı dalda commit; PR güncelle |
| Migration prod riski | PR'da "deploy öncesi manuel DB backup" notu; merge yine yapılabilir |
| Belirsiz ürün kararı | PR açma; issue aç, dur |

---

## İlerleme takibi

| Tarih | Madde | PR | Durum |
|-------|-------|-----|-------|
| | P0-1 | | |
| | P0-2 | | |

*(Agent veya siz doldurun)*

---

## Sık hatalar

- **Birden fazla P0 aynı PR'da** → reddet, böl
- **main'e push** → yasak; dal + PR
- **Commit etmeden "bitti" deme** → PR URL şart
- **Journal olmadan runtime DDL** → migration dosyası tercih et
