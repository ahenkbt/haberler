# yektube.com — ERR_FAILED / site açılmıyor

## Belirti

Tarayıcı: **Bu siteye ulaşılamıyor** / `ERR_FAILED`  
HTTPS isteği TLS aşamasında kopuyor (HTTP yanıtı bile gelmiyor).

## Kök neden (çoğu durum)

1. **Vercel Dashboard’da yanlış domain yönlendirmesi** — `yektube.com` → `yekpare.net` gibi bir redirect tanımlıysa veya domain yanlış projeye bağlıysa TLS/yanıt bozulabilir.
2. **`vercel.json` kök `/` yönlendirmesi** — `/` için `redirect` yerine `rewrite` kullanılmalı; aksi halde SPA dosyasına yanlış yönlendirme olur.
3. **Deploy henüz `main`’de değil** — host rewrite’ları içeren commit production’a alınmamış olabilir.

## Vercel kontrol listesi

1. [Vercel → Proje → Settings → Domains](https://vercel.com/dashboard)
2. `yektube.com` ve `www.yektube.com` **aynı projede** olmalı (`yekpare.net` ile birlikte).
3. **Domain Redirects** bölümünde `yektube.com` → başka domain **OLMAMALI**.
4. SSL durumu **Valid** olmalı (Pending ise 10–30 dk bekleyin veya DNS’i kontrol edin).
5. DNS (kayıt firmasında):
   - `A` → `216.150.16.129` ve `216.150.16.193` **veya**
   - `CNAME` → `cname.vercel-dns.com`
6. Production deploy: `main` branch, son `vercel.json` ile.
7. Env (Vercel):
   - `VITE_YEKTUBE_V2_ENABLED=true`
   - `VITE_YEKTUBE_DEDICATED_HOSTS=yektube.com`
   - `VITE_YEKTUBE_DEDICATED_PATH=/yp`

## Beklenen davranış (deploy sonrası)

| URL | Sonuç |
|-----|--------|
| `https://yektube.com/` | `/yp/` ana akışa yönlendirilir (301) |
| `https://yektube.com/yp` | Ana akış |
| `https://yektube.com/muzik` | Müzik |
| `https://www.yektube.com/*` | `https://yektube.com/*` (301) |
| `https://yekpare.net/yp` | Yekpare üzerinde Yektube (**DNS yedek**) |
| `https://yekpare.net/yektube-v2` | `/yp` adresine yönlendirilir |

## yektube.com DNS / SSL bozuksa (ERR_SSL_PROTOCOL_ERROR)

1. **Geçici yedek:** **https://yekpare.net/yp**
2. Kod artık yekpare → yektube.com **zorunlu redirect yapmaz** (`VITE_YEKTUBE_REDIRECT_TO_CANONICAL=0`).
3. DNS düzeltince kanonik domain için Vercel env: `VITE_YEKTUBE_REDIRECT_TO_CANONICAL=1` (isteğe bağlı).

## Hızlı test

```powershell
Invoke-WebRequest -Uri "https://yektube.com/tr" -UseBasicParsing
```

Beklenen: **HTTP 200**, HTML içinde `yektube-v2` asset yolu.

Geçici alternatif (domain düzelene kadar): **https://yekpare.net/yektube-v2**
