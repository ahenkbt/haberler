# Cursor PR onay kurulumu (Ahenk-BT/goalgo)

Bu repo **tek işbirlikçi** ile yönetiliyor. PR'ların takılmasının üç yaygın nedeni vardır; aşağıdaki kontrol listesi hepsini kapatır.

## 1. GitHub Actions CI (`Goalgo CI`)

PR kırmızıysa önce **build** job'ına bakın.

```bash
gh pr checks <PR_NUMARASI> --repo Ahenk-BT/goalgo
```

- `build` **fail** → merge edilmez. Yerelde: `cd goalgo && pnpm run typecheck`
- `build` **pass** → CI tarafı tamam

Kök policy: `APPROVAL_POLICY.md` — CI geçmeden auto-approve yapılmaz.

## 2. Cursor Bugbot (sık takılma)

**Belirti:** `Cursor Bugbot` check'i uzun süre `pending` kalır; Approval Agent 8 dk sonra *Not approving* yorumu bırakır.

**Hızlı çözüm (PR yorumu):**

```
cursor review
```

veya

```
bugbot run
```

**Kalıcı çözüm (Cursor Dashboard):**

1. [cursor.com/dashboard](https://cursor.com/dashboard) → **Approval Agents**
2. *Pull Request Router and Approver* agent'ını açın
3. **Use Bugbot Review Context** → **KAPATIN**
4. **Use Risk Score** → açık, **Maximum Risk** → Low veya Medium
5. **Approve PR** aracı açık olsun

**Not:** İki aynı Approval Agent varsa birini devre dışı bırakın (çift *Not approving* yorumu önlenir).

## 3. İnsan reviewer yok

Tek collaborator (`ahenkbt`) PR yazarının kendisi olduğu için GitHub otomatik reviewer atayamaz. Bu normal.

Cloud Agent PR'ları için merge:

```bash
gh pr merge <PR_NUMARASI> --repo Ahenk-BT/goalgo --merge --delete-branch
```

Branch protection onay zorunlu tutmuyorsa bu yeterlidir.

## Repo policy dosyaları

| Dosya | Amaç |
|-------|------|
| `APPROVAL_POLICY.md` | Auto-approve / red kuralları |
| `.cursor/approval-policies/ROUTING.md` | Policy yönlendirme |

Policy değişiklikleri **main**'e merge edildikten sonra yeni PR'larda geçerlidir.

## Cloud Agent oturum sonu kontrol listesi

1. `gh pr checks` → `build` yeşil mi?
2. Değişiklik küçük ve düşük risk mi?
3. Bugbot takılıysa PR'a `cursor review` yaz veya dashboard'da Bugbot context kapat
4. `gh pr merge --merge --delete-branch`
5. `main` deploy: Vercel + Railway + Netlify workflow'ları success

## Deploy doğrulama

```bash
gh run list --repo Ahenk-BT/goalgo --branch main --limit 5
```

Beklenen: `Goalgo CI`, `Vercel Production Deploy`, `Railway Production Deploy`, `Netlify Production Deploy` → **success**
