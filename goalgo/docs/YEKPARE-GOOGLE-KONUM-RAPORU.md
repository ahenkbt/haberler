# Yekpare: Google konum ve sipariş paneli (özet)

Bu dosya, Canvas açılamadığında da okunabilir olması için repoda tutulur. Güncel: kod değişiklikleriyle uyumludur.

## Neden öneri çıkmıyordu?

1. **Ayarlar:** Admin → Genel Ayarlar → Harita bölümünde **Google harita açık** olmalı ve **tarayıcı (Maps JavaScript API) anahtarı** dolu olmalı. Anahtar DB’de boşsa ama derlemede **`VITE_GOOGLE_MAPS_BROWSER_KEY`** tanımlıysa kod otomatik onu kullanır (aynı referrer kuralları geçerli).
2. **Google Cloud:** Projede **faturalandırma** açık olmalı; **Maps JavaScript API** ve **Places API** etkin olmalı. Faturalandırma kapalıysa Google doğrudan “enable billing” hatası döner.
3. **OAuth ≠ Harita anahtarı:** Kimlik bilgileri sayfasındaki **OAuth 2.0 Web istemcisi** ve indirilen **`client_secret_....json`** dosyası “Google ile giriş” gibi kullanıcı oturumu içindir. Bu projede Haritalar / Places (tarayıcı haritası, adres önerisi, Veri Kazıyıcı sunucu istekleri) **API anahtarı** kullanır; OAuth müşteri kimliği veya client secret’ı `GOOGLE_*` ortam değişkenlerine yazmak bu entegrasyonu tamamlamaz ve repoya eklenmemelidir.
4. **Referrer kısıtı (Google resmi davranış):** `https://*.yekpare.net/*` yalnızca **alt alan adlarını** kapsar; **kök alan** (`https://yekpare.net/...`) için ayrıca `https://yekpare.net/*` (ve kullanıyorsanız `https://www.yekpare.net/*`) eklenmelidir. İkisi birlikte tam kapsama sağlar.

5. **Sunucu Places anahtarı sırası (ortam değişkenleri):** `resolveGooglePlacesApiKey` önce `GOOGLE_MAPS_SERVER_KEY`, sonra `GOOGLE_MAPS_API_KEY`, en son `GOOGLE_PLACES_API_KEY` okur. Tarayıcı (HTTP referrer) anahtarını yalnızca `GOOGLE_MAPS_API_KEY` veya panel ayarlarında tutup `GOOGLE_PLACES_API_KEY`’i boş bırakabilir veya sunucuya uygun ayrı anahtarı `GOOGLE_MAPS_SERVER_KEY` / `GOOGLE_MAPS_API_KEY`’e koyabilirsiniz; yanlışlıkla `GOOGLE_PLACES_API_KEY`’e referrer’lı anahtar yazılmışsa önceki sıra onu seçip Text Search’ü kırıyordu.

Kod artık boş öneri listesinde **REQUEST_DENIED** vb. durumlarda kısa bir uyarı metni gösterebilir (`fetchGooglePlacePredictionsDetailed` + `GooglePlaceOneLinePicker`).

## Sipariş işletmeleri sayfası

- **Google öncelik:** Dış platform içe aktarma, crawler ve **Yeni işletme** formunda tek satırlık **Google ile konum** alanı eklendi; seçimde `place_id` → koordinat + adres satırı + il/ilçe doldurulur.
- **Mahalle boşken koordinat:** Önceden il/ilçe/mahalle üçlüsü zorunluydu ve mahalle boşsa koordinat siliniyordu; artık il+ilçe ile yaklaşık geocode yapılır; Google’dan sabitlenen nokta `importPickRef` / `crawlerPickRef` ile korunur.
- **Excel:** Yemeksepeti Excel bloğu varsayılan olarak **kapalı** (`<details>`); üstte Google ve link içe aktarma öne çıkar.

## Canvas raporu

Cursor: `canvases/google-maps-admin-konum-raporu.canvas.tsx` — iç içe `Text` kaldırıldı; IDE hatası bu yüzden oluşuyordu. Yeniden açmayı deneyin.

## Oturum / “Panele giriş yapın”

SPA ve API farklı host’taysa panel istekleri mümkünse aynı origin `/api` vekilinden gitmeli; admin yetkisi tarayıcıya gömülü secret ile değil API’nin HttpOnly panel oturumu ile doğrulanır.

**Güncel (çapraz köken):** Site `https://yekpare.net` iken `VITE_API_BASE_URL` doğrudan `*.railway.app` vb. ise panel çerezi Railway’a gitmez; `admin=1` harita listeleri boş / 401 olur. Kod artık bu durumda otomatik **göreli `/api`** kullanır. Bilinçli CORS kurulumu için `VITE_API_CROSS_ORIGIN=true` ile tam URL zorlanabilir.

**Harita → sipariş taşıma / JSON içe aktarma:** Bu POST’lar `postAdminJson` ile çağrılıyor; istek öncesi `ensureAdminPanelBootstrap` çalışır (panel oturumu tazelenir).

Production CORS artık izinli origin listesine göre sıkıdır; `CORS_ALLOWED_ORIGINS` içinde Vercel/özel alan origin’leri yoksa tarayıcı istekleri reddedilir.

## Firebase Haritalar Backend Adapter

Paylaşılan GOALGO klasöründeki Node API, `firebase-admin` ile Firebase Admin/Auth başlatıyor; `firebase.json`, Functions ya da Firestore rules dosyası yok. İşletme, kategori, favori ve Google Places birleştirme modeli Prisma/Postgres tabanlı. Bu nedenle Yekpare Haritalar’da mevcut Postgres endpointleri korunur; Firebase yalnızca küçük kullanıcı harita durumları için opsiyonel adapter olarak bağlanır.

API ortam değişkenleri:

- `YEKPARE_MAP_FIREBASE_BACKEND=disabled|mirror|firestore`
- `GOOGLE_APPLICATION_CREDENTIALS` veya `FIREBASE_SERVICE_ACCOUNT_JSON` veya `FIREBASE_PROJECT_ID` + `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY`
- `YEKPARE_MAP_FIREBASE_COLLECTION_PREFIX=yekpare_maps` (opsiyonel)

Modlar:

- `disabled`: varsayılan; tüm `/api/map/...` endpointleri mevcut Postgres backend ile çalışır.
- `mirror`: `/map/saved-places`, `/map/user-place-drafts`, `/map/share-states` Postgres’e yazmaya devam eder, aynı kayıtlar Firestore koleksiyonlarına yansıtılır.
- `firestore`: bu üç kullanıcı durumu Firestore’dan okunur; Firebase erişimi yoksa veya hata verirse Postgres fallback devreye girer.

Varsayılan Firestore koleksiyonları `yekpare_maps_saved_places`, `yekpare_maps_user_place_drafts`, `yekpare_maps_share_states` ve gelecekte toplu işletme senkronu için ayrılan `yekpare_maps_businesses` şeklindedir. Servis hesabı JSON’u repoya eklenmemeli; paylaşılan klasördeki plaintext servis hesabı canlıysa anahtar rotasyonu yapılmalı ve dosya sadece sunucu secret storage / deploy ortamında tutulmalıdır.

## Tüm işletmeleri silmek (harita + vendor)

1. Admin → **Sipariş İşletmeleri** → aşağıda **“Tehlikeli: tüm işletmeleri sil”** bölümünü açın.  
2. Kutuya tam olarak `SIL-TUM-ISLETMELER` yazın, **Hepsini sil**’e basın, tarayıcı onayını verin.  
3. Bu işlem `map_businesses` dahil harita işletmelerini, `vendors` ve bağlı sipariş/menü/kupon verilerini siler; **geri alınamaz**.

Üstte ve sekmelerin hemen altında **“Haritayı panele taşı”** kısayolu da sabitlenir (kaydırınca kaybolmaz).
