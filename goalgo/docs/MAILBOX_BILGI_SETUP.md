# bilgi@yekpare.net — posta kutusu kurulumu

Yekpare admin panelinde **Posta & anasayfa duyuru** (`/admin/posta-ve-duyurular`) sayfası site posta kutusunu okur ve yazar. Varsayılan adres: **bilgi@yekpare.net**.

> **Vercel yalnızca web sitesini barındırır.** E-posta DNS kayıtları (MX, SPF, DKIM) domain sağlayıcınızda (GoDaddy, Cloudflare, Natro, vb.) tanımlanmalıdır. Vercel panelinden e-posta açılamaz.

## 1. E-posta sağlayıcısı (Gmail)

### Seçenek A — Hızlı başlangıç (kişisel Gmail)

Geçici veya test için doğrudan Gmail hesabınızı kullanabilirsiniz (örnek: **ahenkbt@gmail.com**):

1. Google hesabınızda **2 adımlı doğrulama** açık olmalı.
2. [Google Hesap → Güvenlik → Uygulama şifreleri](https://myaccount.google.com/apppasswords) → yeni uygulama şifresi oluşturun (Mail / Diğer).
3. Railway ortam değişkenlerinde `SMTP_USER`, `IMAP_USER` ve `SITE_MAILBOX_ADDRESS` olarak bu Gmail adresini kullanın; şifre alanına **uygulama şifresini** yazın (normal Gmail şifresi değil).

| Servis | Sunucu |
|--------|--------|
| SMTP | `smtp.gmail.com` (port **587**, STARTTLS) |
| IMAP | `imap.gmail.com` (port **993**, SSL) |

> Kişisel Gmail ile `bilgi@yekpare.net` adresinden **gönderemezsiniz**; gelen mailler de yalnızca Gmail kutunuza düşer. Üretimde `bilgi@` için Seçenek B önerilir.

### Seçenek B — bilgi@yekpare.net (Google Workspace)

1. [Google Workspace](https://workspace.google.com/) → domain ekleyin: `yekpare.net`
2. Google’ın verdiği **MX**, **SPF (TXT)** ve **DKIM (CNAME)** kayıtlarını domain DNS paneline ekleyin.
3. Posta kutusu: **bilgi@yekpare.net**
4. Uygulama şifresi oluşturun (2FA gerekli).

Aynı SMTP/IMAP sunucuları: `smtp.gmail.com:587`, `imap.gmail.com:993`.

Alternatifler: Microsoft 365, Migadu, vb. — SMTP/IMAP bilgilerini sağlayıcınızdan alın.

## 2. Railway api-server ortam değişkenleri

Adım adım checklist: **[MAILBOX_BILGI_RAILWAY_CHECKLIST.md](./MAILBOX_BILGI_RAILWAY_CHECKLIST.md)**

Railway → **api-server** servisi → **Variables**:

**Gmail (kişisel hesap örneği):**

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

**Google Workspace (bilgi@):**

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

```env
# İlk kurulumda DB'ye yaz (isteğe bağlı; DB boşken otomatik de çalışır)
SITE_MAILBOX_BOOTSTRAP=1

# Arka planda IMAP çekme (isteğe bağlı, varsayılan kapalı)
SITE_MAILBOX_AUTO_SYNC=1
SITE_MAILBOX_AUTO_SYNC_MS=300000
```

Deploy sonrası api-server loglarında `[site-mailbox] bootstrap tamamlandı` satırını arayın.

## 3. Admin panelden kullanım

1. **Yönetim → Posta & anasayfa duyuru**
2. Üstte posta kutusu adresi görünür
3. **Bağlantı testi** → SMTP ve IMAP OK olmalı
4. **IMAP senkron** veya otomatik senkron (3 dk arayüz / 5 dk sunucu) → gelen mailler listelenir
5. **Gönder** formu ile yeni mail; gelen maillerde **Yanıtla**

Aynı bilgiler **Genel Ayarlar → Entegrasyonlar** alanına da kaydedilebilir; ortam değişkenleri önceliklidir.

## 4. Sorun giderme

| Belirti | Olası neden |
|---------|-------------|
| SMTP hata | Yanlış şifre — **uygulama şifresi** kullanın; normal Gmail şifresi çalışmaz |
| IMAP hata | IMAP kapalı (Gmail ayarlarında etkinleştirin), eski Zoho şablonu DB’de kalmış |
| Mail gelmiyor | MX DNS henüz yayılmadı (Workspace), yanlış MX |
| Panel boş | IMAP senkron çalıştırın; Railway env dolu mu kontrol edin |
| `535 Authentication failed` | 2FA + uygulama şifresi gerekli |

DNS doğrulama (Workspace): `nslookup -type=mx yekpare.net` → Google MX kayıtları görünmeli.
