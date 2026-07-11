# AhenkPress Mobil API Dokümantasyonu

Tüm istekler `Content-Type: application/json` başlığıyla gönderilmelidir.  
Oturum gerektiren uç noktalarda **Cookie** tabanlı oturum kullanılır (`credentials: include` / `withCredentials: true`).

---

## Temel URL

| Ortam       | Base URL                                                                                             |
|-------------|------------------------------------------------------------------------------------------------------|
| Geliştirme  | `https://2f686a41-676d-4e2d-81e9-449df89d9c68-00-2ty93677s4u14.janeway.replit.dev`                 |
| Production  | Deploy edildikten sonra Replit `.replit.app` domain'i veya özel domain                              |

Tüm API yolları `/api` önekiyle başlar.

---

## Genel Yanıt Formatı

```json
{ "success": true,  "data": { ... } }
{ "success": false, "error": "Hata mesajı" }
```

Listeler şu formattadır:
```json
{ "success": true, "data": [...], "total": 150, "page": 1, "limit": 20 }
```

---

## 1. Üyelik (Site Üyeleri)

Oturum **HTTP Cookie** ile korunur. iOS/Android'de `withCredentials` veya `HTTPCookieStorage` kullanın.

### `POST /api/members/register` — Kayıt Ol

**Body:**
```json
{
  "firstName": "Ahmet",
  "lastName":  "Yılmaz",
  "email":     "ahmet@ornek.com",
  "phone":     "+905551234567",
  "password":  "sifre123"
}
```

**Zorunlu:** `firstName`, `lastName`, `email`, `password` (min 6 karakter)  
**Opsiyonel:** `phone`

**Başarılı yanıt (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "firstName": "Ahmet",
    "lastName": "Yılmaz",
    "email": "ahmet@ornek.com",
    "phone": "+905551234567"
  }
}
```

---

### `POST /api/members/login` — Giriş Yap

**Body:**
```json
{ "email": "ahmet@ornek.com", "password": "sifre123" }
```

**Başarılı yanıt (200):** *(yukarıdakiyle aynı data yapısı)*

---

### `GET /api/members/me` — Oturumdaki Üye

**Yanıt:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "firstName": "Ahmet",
    "lastName": "Yılmaz",
    "email": "ahmet@ornek.com",
    "phone": null,
    "createdAt": "2026-04-30T..."
  }
}
```

Oturum yoksa: `{ "success": true, "data": null }`

---

### `POST /api/members/logout` — Çıkış Yap

Body gerekmez.  
**Yanıt:** `{ "success": true }`

---

## 2. Haberler

### `GET /api/news` — Haber Listesi

**Query Params:**

| Parametre   | Tür    | Açıklama                              |
|-------------|--------|---------------------------------------|
| `page`      | number | Sayfa no (varsayılan: 1)              |
| `limit`     | number | Sayfa boyutu (varsayılan: 20)         |
| `category`  | string | Kategori slug'ı ile filtrele          |
| `q`         | string | Başlık veya içerik arama              |
| `status`    | string | `published` (varsayılan)              |

**Örnek:**
```
GET /api/news?page=1&limit=10&category=gundem
```

**Yanıt:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "Haber Başlığı",
      "slug": "haber-basligi",
      "summary": "Kısa özet...",
      "content": "<p>HTML içerik</p>",
      "imageUrl": "https://...",
      "publishedAt": "2026-04-30T12:00:00Z",
      "category": { "id": "uuid", "name": "Gündem", "slug": "gundem" },
      "author": { "id": "uuid", "name": "Muhabir Adı" },
      "viewCount": 1240,
      "isFeatured": false,
      "isBreaking": false
    }
  ],
  "total": 350,
  "page": 1,
  "limit": 10
}
```

---

### `GET /api/news/featured` — Öne Çıkan Haberler

Parametresiz. En fazla 5 öne çıkan haber döner.

---

### `GET /api/news/breaking` — Son Dakika Haberleri

---

### `GET /api/news/popular` — Popüler Haberler

---

### `GET /api/news/:id` — Haber Detayı

`id` yerine UUID veya slug kullanılabilir.

---

### `GET /api/news/by-category/:categorySlug` — Kategoriye Göre Haberler

**Query Params:** `page`, `limit`

---

### `GET /api/categories` — Haber Kategorileri

```json
{
  "success": true,
  "data": [
    { "id": "uuid", "name": "Gündem", "slug": "gundem", "imageUrl": null }
  ]
}
```

---

## 3. Keşfet — İşletmeler

### `GET /api/map/businesses` — İşletme Listesi

**Query Params:**

| Parametre      | Tür    | Açıklama                                      |
|----------------|--------|-----------------------------------------------|
| `page`         | number | Sayfa no                                      |
| `limit`        | number | Sayfa boyutu (maks 100)                       |
| `lat`          | number | Kullanıcı enlem                               |
| `lng`          | number | Kullanıcı boylam                              |
| `radius`       | number | Metre cinsinden yarıçap (ör: 5000)            |
| `category`     | string | Kategori ID veya slug                         |
| `city`         | string | Şehir ID                                      |
| `q`            | string | İşletme adı / adres arama                     |
| `isPremium`    | bool   | `true` ile sadece premium işletmeler          |
| `hasDelivery`  | bool   | Paket servis filtresi                         |
| `hasReservation` | bool | Rezervasyon filtresi                          |
| `isOpen`       | bool   | Şu an açık olanlar (yakında)                  |
| `minRating`    | number | Minimum puan                                  |
| `sort`         | string | `distance`, `rating`, `name`                  |

**Örnek:**
```
GET /api/map/businesses?lat=39.9208&lng=32.8541&radius=3000&category=restoranlar&limit=20
```

**Yanıt (her eleman):**
```json
{
  "id": "uuid",
  "slug": "cafe-istanbul-1234",
  "name": "Cafe İstanbul",
  "address": "Bağdat Cad. No:10, Kadıköy/İstanbul",
  "phone": "+902164001234",
  "website": "https://cafe.istanbul",
  "email": "info@cafe.istanbul",
  "rating": 4.5,
  "userRatingsTotal": 320,
  "latitude": 40.9876,
  "longitude": 29.0534,
  "photoUrl": "https://maps.googleapis.com/...",
  "coverPhotoUrl": "https://...",
  "priceLevel": 2,
  "isPremium": true,
  "hasDelivery": false,
  "hasReservation": true,
  "hasOnlineOrder": false,
  "openingHours": { "mon": {...}, "tue": {...} },
  "tags": ["kahvaltı","organik"],
  "distance": 850,
  "category": { "id": "uuid", "name": "Restoranlar", "slug": "restoranlar", "icon": "🍽️" }
}
```

---

### `GET /api/map/businesses/search` — İşletme Arama

**Query Params:** `q`, `city`, `category`, `page`, `limit`

---

### `GET /api/map/businesses/by-slug/:slug` — Slug ile İşletme Getir

---

### `GET /api/map/businesses/:id` — ID ile İşletme Detayı

Yukarıdaki tek eleman formatında döner.

---

### `GET /api/map/businesses/:id/google-details` — Google Detayları

Gerçek zamanlı Google Places API verileri (fotoğraflar, yorumlar, saatler):

```json
{
  "success": true,
  "data": {
    "name": "Cafe İstanbul",
    "photos": ["https://...", "https://..."],
    "reviews": [
      {
        "author_name": "Ali K.",
        "rating": 5,
        "text": "Harika bir yer!",
        "time": 1714300000
      }
    ],
    "opening_hours": {
      "weekday_text": ["Pazartesi: 08:00–22:00", "..."]
    },
    "website": "https://...",
    "formatted_phone_number": "+90 212 000 0000"
  }
}
```

---

### `GET /api/map/businesses/:id/user-reviews` — Kullanıcı Yorumları

Onaylı anonim yorumlar:

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "nickname": "Mehmet Y.",
      "rating": 4,
      "comment": "Servis çok iyiydi.",
      "photos": ["https://..."],
      "createdAt": "2026-04-20T..."
    }
  ]
}
```

---

### `POST /api/map/businesses/:id/user-reviews` — Yorum Gönder

**Body:**
```json
{
  "firstName": "Ahmet",
  "lastName":  "Yılmaz",
  "email":     "ahmet@ornek.com",
  "phone":     "+905551234567",
  "nickname":  "Ahmet Y.",
  "rating":    5,
  "comment":   "Çok memnun kaldım.",
  "photos":    ["base64 veya URL"]
}
```

**Zorunlu:** `firstName`, `lastName`, `email`, `rating` (1–5)  
**Opsiyonel:** `phone`, `nickname`, `comment`, `photos`

> Yorum onay bekler; admin panelinden onaylandıktan sonra yayınlanır.

---

### `GET /api/map/businesses/:id/products` — İşletme Ürün/Hizmetleri

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Serpme Kahvaltı",
      "description": "2 kişilik",
      "price": "450.00",
      "currency": "TRY",
      "imageUrl": "https://...",
      "category": "Kahvaltı"
    }
  ]
}
```

---

### `GET /api/map/categories` — İşletme Kategorileri

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Restoranlar",
      "slug": "restoranlar",
      "icon": "🍽️",
      "imageUrl": "https://...",
      "googlePlaceType": "restaurant"
    }
  ]
}
```

---

### `GET /api/map/cities` — Şehirler

---

### `GET /api/map/cities/:id/districts` — İlçeler

---

### `GET /api/map/homepage-businesses` — Ana Sayfa İşletmeleri

Öne çıkan veya premium işletmeler (ana sayfa widget'ı için).

---

### `GET /api/popular-locations` — Popüler Lokasyonlar

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Ankara Çankaya",
      "lat": 39.9042,
      "lng": 32.8597,
      "imageUrl": "https://...",
      "businessCount": 87
    }
  ]
}
```

---

### `GET /api/popular-locations/search` — Lokasyon Arama

**Query Params:** `q` (il / ilçe adı arama)

---

## 4. İşletme Sahipliği & Favoriler *(JWT Token ile)*

Aşağıdaki uç noktalar `Authorization: Bearer <token>` başlığı gerektirir.  
Token, `/api/map/users/login` ile alınır.

### `POST /api/map/users/login` — İşletme Kullanıcısı Girişi

**Body:**
```json
{ "email": "isletme@ornek.com", "password": "sifre123" }
```

**Yanıt:**
```json
{
  "success": true,
  "token": "eyJhbGci...",
  "user": { "id": "uuid", "email": "...", "businessId": "uuid" }
}
```

---

### `GET /api/map/users/me` — İşletme Kullanıcısı Bilgisi

`Authorization: Bearer <token>`

---

### `GET /api/map/favorites` — Favori İşletmeler

`Authorization: Bearer <token>`

---

### `POST /api/map/favorites` — Favoriye Ekle

**Body:** `{ "googlePlaceId": "ChIJ..." }`

---

### `DELETE /api/map/favorites/:googlePlaceId` — Favoriden Çıkar

---

### `POST /api/map/ownership-claims` — İşletme Sahiplik Talebi

**Body:**
```json
{
  "businessId": "uuid",
  "ownerName": "Ahmet Yılmaz",
  "ownerPhone": "+905551234567",
  "ownerEmail": "ahmet@ornek.com",
  "message": "Bu işletmenin sahibiyim."
}
```

---

## 5. Push Bildirimleri

### `POST /api/map/device-tokens` — Cihaz Token'ı Kaydet

**Body:**
```json
{
  "token": "FCM_DEVICE_TOKEN",
  "platform": "ios",
  "userId": "uuid"
}
```

---

## 6. Genel Ayarlar

### `GET /api/settings` — Site Ayarları

```json
{
  "success": true,
  "data": {
    "siteName": "AhenkPress",
    "siteDescription": "...",
    "logoUrl": "https://...",
    "primaryColor": "#4338ca",
    "contactEmail": "info@ornek.com",
    "socialMedia": {
      "twitter": "@ahenkpress",
      "instagram": "@ahenkpress",
      "facebook": "ahenkpress"
    }
  }
}
```

---

## 7. Fotoğraf Proxy

Google Places fotoğraflarını direkt göstermek için:

```
GET /api/map/places/photo?ref=GOOGLE_PHOTO_REFERENCE&maxwidth=800
```

Fotoğraf URL'leri yerine bu proxy endpoint'ini kullanın; CORS ve API key sorunlarını çözer.

---

## Hata Kodları

| HTTP Kodu | Anlamı                                  |
|-----------|-----------------------------------------|
| 200       | Başarılı                                |
| 400       | Eksik veya geçersiz parametre           |
| 401       | Yetkilendirme gerekiyor                 |
| 403       | Erişim yasak                            |
| 404       | Bulunamadı                              |
| 409       | Çakışma (ör: e-posta zaten kayıtlı)    |
| 500       | Sunucu hatası                           |

---

## Sayfalama

Tüm liste uç noktaları sayfalamayı destekler:

```
GET /api/news?page=2&limit=20
```

Yanıtta `total`, `page`, `limit` döner. Toplam sayfa = `Math.ceil(total / limit)`

---

## iOS / Android Entegrasyon Notları

1. **Cookie Oturumu** — `members/*` uç noktaları için `URLSession.shared.configuration.httpCookieAcceptPolicy = .always` (iOS) veya `OkHttpClient`'a `CookieJar` ekleyin (Android).
2. **JWT Token** — `map/users/*` uç noktaları (işletme sahipleri) için `Authorization: Bearer <token>` header'ı gereklidir.
3. **Fotoğraflar** — Google Places fotoğrafları için `/api/map/places/photo?ref=...&maxwidth=800` proxy'sini kullanın.
4. **CORS** — Production'da tüm origin'lere izin verilmektedir.
5. **Content-Type** — Tüm POST/PUT isteklerinde `Content-Type: application/json` zorunludur.
6. **Base64 Fotoğraf** — Yorum fotoğrafları `data:image/jpeg;base64,...` formatında gönderilebilir.

---

## Örnek: Swift (iOS) ile Haber Listesi

```swift
let url = URL(string: "https://YOUR_DOMAIN/api/news?page=1&limit=20")!
var request = URLRequest(url: url)
request.setValue("application/json", forHTTPHeaderField: "Content-Type")

URLSession.shared.dataTask(with: request) { data, _, _ in
    guard let data = data,
          let json = try? JSONDecoder().decode(NewsResponse.self, from: data) else { return }
    print(json.data)
}.resume()
```

---

## Örnek: Kotlin (Android) ile İşletme Arama

```kotlin
val client = OkHttpClient()
val request = Request.Builder()
    .url("https://YOUR_DOMAIN/api/map/businesses/search?q=kafe&limit=10")
    .header("Content-Type", "application/json")
    .build()

client.newCall(request).execute().use { response ->
    val body = response.body?.string()
    // JSON parse işlemi
}
```
