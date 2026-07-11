# bilgi@yekpare.net — Railway + DNS adım adım checklist

Admin panel: **Yönetim → Posta & anasayfa duyuru** → `/admin/posta-ve-duyurular`

Varsayılan kutu: **bilgi@yekpare.net** (Gmail / Google Workspace ile)

> Vercel yalnızca web sitesini host eder. **MX / SPF / DKIM** kayıtları domain DNS’inde (GoDaddy, Cloudflare, Natro vb.) tanımlanmalıdır.

---

## Faz 1 — Gmail kurulumu

### Hızlı test (kişisel Gmail — örnek: ahenkbt@gmail.com)

| ☐ | Adım |
|---|------|
| ☐ | Google hesabında **2 adımlı doğrulama** açık |
| ☐ | [Uygulama şifreleri](https://myaccount.google.com/apppasswords) → Mail için yeni şifre |
| ☐ | Railway env: `SITE_MAILBOX_ADDRESS`, `SMTP_USER`, `IMAP_USER` = Gmail adresiniz |
| ☐ | `SMTP_PASS` ve `IMAP_PASS` = uygulama şifresi (16 karakter) |

### Üretim (bilgi@ — Google Workspace)

| ☐ | Adım |
|---|------|
| ☐ | [Google Workspace](https://workspace.google.com/) → **Add domain** → `yekpare.net` |
| ☐ | Google’ın verdiği **MX**, **SPF (TXT)**, **DKIM (CNAME)** kayıtlarını not alın |
| ☐ | Domain DNS paneline girin (**Vercel DNS değil**, domain sağlayıcı) |
| ☐ | MX kayıtlarını Google’a yönlendirin |
| ☐ | SPF TXT ve DKIM CNAME kayıtlarını ekleyin |
| ☐ | Workspace’te domain doğrulaması tamamlanana kadar bekleyin |
| ☐ | Posta kutusu: **bilgi@yekpare.net** |
| ☐ | **Uygulama şifresi** oluşturun (2FA zorunlu) |

**Gmail sunucuları:**

| | Değer |
|---|--------|
| SMTP | `smtp.gmail.com` · port **587** · STARTTLS |
| IMAP | `imap.gmail.com` · port **993** · SSL |

---

## Faz 2 — DNS doğrulama (Workspace / bilgi@)

```powershell
nslookup -type=mx yekpare.net
```

Beklenen: Google MX kayıtları (`aspmx.l.google.com` vb.).

Harici test: [mxtoolbox.com](https://mxtoolbox.com/SuperTool.aspx?action=mx%3ayekpare.net) → MX OK.

| ☐ | Kontrol |
|---|---------|
| ☐ | MX yanıt veriyor (Workspace kullanıyorsanız) |
| ☐ | Harici adresten `bilgi@yekpare.net`’e test maili gönderildi |
| ☐ | Gmail / Workspace arayüzünde mail göründü |

> Kişisel Gmail ile test ediyorsanız MX adımı atlanır; mailler doğrudan Gmail kutunuza gelir.

---

## Faz 3 — Railway ortam değişkenleri

**Railway** → projeniz → **api-server** servisi → **Variables** → **Raw Editor** (veya tek tek ekleyin).

### Kişisel Gmail (örnek)

```env
SITE_MAILBOX_ADDRESS=ahenkbt@gmail.com

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=ahenkbt@gmail.com
SMTP_PASS=Google-uygulama-sifresi-buraya
SMTP_FROM=Yekpare <ahenkbt@gmail.com>

IMAP_HOST=imap.gmail.com
IMAP_PORT=993
IMAP_USER=ahenkbt@gmail.com
IMAP_PASS=Google-uygulama-sifresi-buraya
IMAP_FOLDER=INBOX
```

### Google Workspace (bilgi@)

```env
SITE_MAILBOX_ADDRESS=bilgi@yekpare.net

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=bilgi@yekpare.net
SMTP_PASS=Google-uygulama-sifresi-buraya
SMTP_FROM=Yekpare <bilgi@yekpare.net>

IMAP_HOST=imap.gmail.com
IMAP_PORT=993
IMAP_USER=bilgi@yekpare.net
IMAP_PASS=Google-uygulama-sifresi-buraya
IMAP_FOLDER=INBOX
```

### İlk kurulum / otomatik senkron (önerilen)

```env
SITE_MAILBOX_BOOTSTRAP=1
SITE_MAILBOX_AUTO_SYNC=1
SITE_MAILBOX_AUTO_SYNC_MS=300000
```

| ☐ | Kontrol |
|---|---------|
| ☐ | Deploy tetiklendi |
| ☐ | Log: `[site-mailbox] bootstrap tamamlandı` |
| ☐ | Admin → **Bağlantı testi** → SMTP OK, IMAP OK |
| ☐ | **IMAP senkron** → en az bir test maili listeleniyor |

---

## Faz 4 — Admin panel smoke test

| ☐ | Adım |
|---|------|
| ☐ | `/admin/posta-ve-duyurular` açılıyor |
| ☐ | Kutu adresi doğru görünüyor |
| ☐ | Giden test maili (kendinize) → Gmail’de geldi |
| ☐ | Gelen mail → panelde görünüyor |
| ☐ | **Yanıtla** ile cevap gönderildi |

---

## Sorun giderme

| Hata | Çözüm |
|------|--------|
| `535-5.7.8 Username and Password not accepted` | Uygulama şifresi kullanın; 2FA açık olsun |
| Eski Zoho ayarları DB’de | `SITE_MAILBOX_BOOTSTRAP=1` veya Genel Ayarlardan temizleyin |
| IMAP timeout | `imap.gmail.com:993`, SSL; Railway outbound 993 açık |
| bilgi@ gelmiyor | Workspace MX kayıtları; kişisel Gmail MX değildir |

**Güvenlik:** Uygulama şifresini repoya veya sohbete yapıştırmayın; yalnızca Railway Variables.
