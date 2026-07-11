# Yektube — Web Push (VAPID) kurulumu

Tarayıcı bildirimleri için **VAPID** anahtar çifti gerekir. Public key hem sunucuda hem tarayıcı aboneliğinde kullanılır; **private key yalnızca sunucuda** kalır.

## 1. Anahtar üret

Proje kökünde (veya `goalgo/artifacts/api-server` içinde):

```bash
cd goalgo/artifacts/api-server
pnpm exec web-push generate-vapid-keys
```

Çıktı örneği:

```
Public Key:
BPbJP6rKzVN0rOpeXNbQRaSPHSemr7p28xQOPPOT8vpgcWjvS_tgdBl0KYiTqrrkLBz4rg_eQpS-6sERRRjY-OQ

Private Key:
_0zfjoJbHq-VY50PgoD2zKMxcbf7b8fdCA5J9Ky5TN0
```

**Her ortam (production/staging) için ayrı çift üretin.** Yukarıdaki değerler yalnızca format örneğidir; kendi ürettiğiniz anahtarları kullanın.

## 2. Railway (api-server) — ne yazılacak?

Railway → **api-server** servisi → **Variables**:

| Değişken | Karşısına yazılacak | Örnek |
|----------|---------------------|--------|
| `WEB_PUSH_VAPID_PUBLIC_KEY` | `generate-vapid-keys` çıktısındaki **Public Key** satırının tamamı (tek satır, boşluksuz) | `BPbJP6rKzVN0rOpeXNbQRaSPHSemr7p28xQOPPOT8vpgcWjvS_tgdBl0KYiTqrrkLBz4rg_eQpS-6sERRRjY-OQ` |
| `WEB_PUSH_VAPID_PRIVATE_KEY` | Aynı komuttaki **Private Key** satırının tamamı (**gizli**, repoya koymayın) | `_0zfjoJbHq-VY50PgoD2zKMxcbf7b8fdCA5J9Ky5TN0` |
| `WEB_PUSH_VAPID_CONTACT` | Push servisinin sorumlu iletişim adresi (RFC 8292); genelde e-posta | `mailto:destek@yektube.com` veya `mailto:sizin@email.com` |

**Notlar:**

- Tırnak (`"` veya `'`) **koymayın** — sadece ham değer.
- Public ve private key **eşleşmeli** (aynı `generate-vapid-keys` çıktısından).
- `WEB_PUSH_VAPID_CONTACT` gerçek bir e-posta olmalı; `mailto:` öneki zorunlu.

## 3. Yerel geliştirme

`goalgo/artifacts/api-server/.env` (veya kök `.env`):

```env
WEB_PUSH_VAPID_PUBLIC_KEY=BPbJ...sizin-public-key...
WEB_PUSH_VAPID_PRIVATE_KEY=_0zf...sizin-private-key...
WEB_PUSH_VAPID_CONTACT=mailto:destek@yektube.com
```

Değişiklikten sonra api-server’ı yeniden başlatın.

## 4. Kullanıcı tarafı (test)

1. Yektube’de giriş yap → **Hesabım** → **Ayarlar**
2. **Bildirimlere izin ver** (tarayıcı izni + push aboneliği kaydı)
3. **Test bildirimi** — sunucunun VAPID ile push gönderebildiğini doğrular

Push yalnızca **HTTPS** (veya localhost) üzerinde çalışır. `yektube.com` / `yekpare.net/yp` production’da HTTPS olmalı.

## 5. Sorun giderme

| Belirti | Olası neden |
|---------|-------------|
| Ayarlarda “Push sunucusu yapılandırılmamış” | Public **ve** private key Railway’de yok veya deploy sonrası restart edilmedi |
| Test bildirimi 502 | Private key yanlış veya public/private eşleşmiyor |
| Abonelik 410 | Eski abonelik; Ayarlar’dan tekrar “Bildirimlere izin ver” |
| Bildirim gelmiyor (Windows) | Sistem bildirimleri kapalı; Chrome site izni “İzin ver” olmalı |

## 6. Yeni video bildirimleri

Kanal senkronunda **yeni** video eklendiğinde, o kanala abone olup push kaydı olan ve ilgili tercihi açık üyelere bildirim gider (`notifyNewVideos` / `notifyShorts`).
