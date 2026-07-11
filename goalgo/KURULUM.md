# Yekpare — Kurulum Kılavuzu

**Haber, Alışveriş, Sipariş ve Navigasyon Uygulaması**

Geliştirici: [Ahenk Bilgi Teknolojileri](https://ahenk.net.tr)

---

## Sistem Gereksinimleri

- Node.js 20+
- pnpm 9+
- PostgreSQL 15+
- Git

---

## 1. Bağımlılıkları Yükle

```bash
# pnpm kurulu değilse
npm install -g pnpm

# Proje bağımlılıklarını yükle
pnpm install
```

---

## 2. Çevre Değişkenlerini Ayarla

Proje kök dizininde `.env` dosyası oluştur:

```env
# Veritabanı
DATABASE_URL=postgresql://kullanici:sifre@localhost:5432/goalgo

# Oturum güvenlik anahtarı (rastgele uzun bir string)
SESSION_SECRET=cok_gizli_bir_anahtar_buraya_yazin

# Firebase Admin (isteğe bağlı — sadece harita mobil `/api/map/users/login` için)
# Ortam değişkeni yoksa Firebase doğrulaması kapalıdır; yeni Firebase projesi oluşturup aşağıdakilerden birini doldurun.
# Seçenek A: sunucuda JSON dosya yolu
# GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
# Seçenek B: tek satır JSON (Vercel)
# FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
# Seçenek C: ayrı alanlar
# FIREBASE_PROJECT_ID=
# FIREBASE_CLIENT_EMAIL=
# FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Google Maps API (isteğe bağlı — harita ve işletme detayları için)
GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# OpenAI API (isteğe bağlı — AI içerik üretimi için)
OPENAI_API_KEY=your_openai_api_key

# Stripe (isteğe bağlı — ödeme sistemi için)
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
```

---

## 3. Veritabanını Hazırla

```bash
# Tabloları oluştur (migration)
pnpm --filter @workspace/db run migrate

# (İsteğe bağlı) Örnek verilerle doldur
pnpm --filter @workspace/api-server run seed
```

---

## 4. Uygulamayı Başlat

### Geliştirme Modu

İki ayrı terminal penceresi aç:

**Terminal 1 — API Sunucusu:**
```bash
pnpm run dev:api
```
*(Eşdeğer: `pnpm --filter @workspace/api-server run dev` — Windows’ta `PORT=3000` ve `goalgo/.env` yüklemesi dahildir.)*

**Terminal 2 — Frontend:**
```bash
pnpm run dev:web
```
*(Eşdeğer: `pnpm --filter @workspace/ahenkpress run dev` — `/api` istekleri Vite proxy ile `http://127.0.0.1:3000` adresine gider; ayrıca `VITE_API_BASE_URL` gerekmez.)*

Uygulama şu adreslerde erişilebilir:
- Frontend: http://localhost:5173
- API: http://localhost:3000

---

## 5. Üretim (Production) Build

```bash
# Frontend build
pnpm --filter @workspace/ahenkpress run build

# API sunucusunu üretim modunda başlat
NODE_ENV=production pnpm --filter @workspace/api-server run start
```

---

## 6. İlk Kurulum Sonrası

1. `/admin` adresine git
2. Varsayılan admin hesabı: `admin@goalgo.com` / `admin123` *(seed sonrası değiştir!)*
3. **Genel Ayarlar** → Site adı, logo, sosyal medya linklerini güncelle
4. **Haberler** → İlk haberleri ekle
5. **Harita** → İşletme kategorileri ve lokasyonları ekle

---

## 7. Proje Yapısı

```
/
├── artifacts/
│   ├── ahenkpress/     # React + Vite frontend
│   └── api-server/     # Express 5 API sunucusu
├── lib/
│   └── db/             # Drizzle ORM + PostgreSQL şeması
├── scripts/            # Yardımcı scriptler
└── pnpm-workspace.yaml # Monorepo yapılandırması
```

---

## 8. Önemli URL'ler

| Sayfa | URL |
|-------|-----|
| Ana Sayfa | `/` |
| Haberler | `/haberler` |
| Keşfet / Harita | `/kesfet` |
| Alışveriş | `/magaza` |
| Video | `/video-galeri` |
| Admin Paneli | `/admin` |
| Site Haritası | `/sitemap.xml` |
| RSS Feed | `/api/rss` |
| Haber Sitemap | `/api/sitemap/news.xml` |
| İşletme Sitemap | `/api/sitemap/businesses.xml` |

---

## 9. SEO & Google

- **robots.txt**: `/robots.txt`
- **Sitemap**: `/sitemap.xml` ve `/api/sitemap/index.xml`
- **Open Graph**: Otomatik meta etiketleri her sayfada mevcut
- **Schema.org**: Organization ve WebSite yapılandırılmış verisi `index.html`'de

---

## Destek

Geliştirici: **Ahenk Bilgi Teknolojileri**
Web: [https://ahenk.net.tr](https://ahenk.net.tr)

