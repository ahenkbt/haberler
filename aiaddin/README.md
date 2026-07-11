# Aiaddin — WordPress temaları, eklentiler ve Laravel paketi

Bu klasör, `C:\Users\ahenk\Downloads\aiaddin` içeriğinin repoya alınmış halidir: **haber / kurumsal (STK, belediye, vakıf)** WordPress varlıkları ve **Businesso tarzı** Laravel kurulumunun kaynak ağacı.

**Ürün ilkesi (Aiaddin):** Yeni Aiaddin uygulaması **Yekpare ile bağlanmayacak** şekilde tasarlanır; kalıcı veri **ayrı MySQL** üzerindedir ve bu hatta **PostgreSQL kullanılmaz**. İleride yalnızca **Haber Merkezi** ile isteğe bağlı ayrı bir HTTP API düşünülebilir. Ayrıntı: `haber-merkezi/docs/AIADDIN_YOL_HARITASI.md`.

**Businesso (Laravel) çekirdeği:** `laravel-businesso/` — çok kiracılı site mantığı ve ön yüz hattı buradan yürütülür. Güvenlik sertleştirmesi ve cron kurulumu: [`laravel-businesso/docs/BUSINESSO_GUVENLIK.md`](./laravel-businesso/docs/BUSINESSO_GUVENLIK.md).

**GitHub + Railway + Vercel (adım adım):** [`docs/DEPLOY_GITHUB_RAILWAY_VERCEL.md`](./docs/DEPLOY_GITHUB_RAILWAY_VERCEL.md).

## Dizin yapısı

| Yol | Kaynak | Açıklama |
|-----|--------|----------|
| `wordpress/themes/ahenk-haber` | `ahenk-haber` | Haber teması |
| `wordpress/themes/ahenk-haber-v3` | `ahenk-haber-v3` | Haber teması (v3) |
| `wordpress/themes/yenitema` | `yenitema` | Tema kaynağı |
| `wordpress/themes/dernek-belediye-vakif-v7` | `Dernek & Belediye & Vakıf Sitesi V7` | Kurumsal / STK teması (hedef klasör adı ASCII) |
| `wordpress/plugins/ahenk-ai-icerik-botu` | `ahenk-ai-icerik-botu` | AI içerik / RSS vb. modül (eklenti) |
| `wordpress/plugins/yenitema-plugin-build` | `yenitema-plugin-build` | Eklenti derleme çıktısı |
| `legacy/habermerkezi` | `habermerkezi` | Eski / referans paket |
| `laravel-businesso` | `installable` | Laravel uygulaması; **`vendor` kopyalanmadı** — yerelde `composer install` |

## Yerelde Laravel

```bash
cd laravel-businesso
cp .env.example .env   # Windows: copy .env.example .env
composer install
php artisan key:generate
```

Üretim ortamında `.env` ve `APP_KEY` kendi sunucunuza göre ayarlanmalıdır. Repoda `.env` ve `storage/logs/*.log` tutulmaz (bkz. `.gitignore`).

## İlgili belgeler

Repo içinde Haber Merkezi / Aiaddin yol haritası: `haber-merkezi/docs/AIADDIN_YOL_HARITASI.md`, `haber-merkezi/docs/YOL_HARITASI_AIADDIN_STK_PHP.md`.
