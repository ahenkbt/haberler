# GIS Ilerleme Notu (2026-05-05)

## Tamamlananlar

- `Kesfet` haritasina katman paneli eklendi.
- Taban katmanlar:
  - Temel
  - Hava fotografi
  - Gece
  - Topografik
  - Siyasi
  - Fiziki
- Veri katmanlari:
  - Depremler (USGS)
  - Hava durumu (Open-Meteo, 81 il)
  - Nufus yogunlugu (referans overlay)
  - Yukseklik verisi (hillshade)
  - Raster relief
  - Jeodezik grid

## Parsel Ozelligi

- `GET /api/map/parcel-query-link` endpoint eklendi.
- `Kesfet > Katmanlar` icinde:
  - Il / Ilce / Mahalle / Ada / Pafta / Parsel formu
  - TKGM Parsel Sorgu acma
  - Haritada otomatik odak + marker
  - Marker temizleme
  - Son 5 sorgu gecmisi (localStorage)

## Haritalar Sayfasi

- `Haritalar` ekranina da katman paneli eklendi.
- Taban harita secimi + deprem/hava katmanlari calisiyor.

## Teknik Not

- Ortak katman katalog dosyasi: `artifacts/ahenkpress/src/lib/mapLayers.ts`
- Hem `Kesfet` hem `Haritalar` bu katalogdan katman bilgisi okuyor.

## Son Eklenenler

- Resmi kaynaklar icin online/offline health rozeti + 60 sn otomatik yenileme.
- Rozetlerde tooltip: HTTP durum kodu + gecikme (ms).
- Gelismis WMS/WMTS katmanlari:
  - NASA True Color (WMS)
  - NASA Gece Isiklari (WMS)
  - Vektor Cizgi (tile)
- Katman opakligi kaydirici (overlay opacity slider).
- Acik katmanlar icin kisa legend metni.
- Katman tercihleri kalici hale getirildi (localStorage):
  - taban harita secimi
  - aktif overlay katmanlari
  - gelismis WMS/WMTS secimleri
  - opaklik seviyesi
- Admin paneline katman yonetimi eklendi (`Haritalar Yonetimi > Ayarlar`):
  - taban katman aktifligi + sira
  - gelismis katman aktifligi + sira
  - overlay aktifligi + sira
  - varsayilan opaklik
  - "admin ayarlarini zorla" secenegi (local kullanici tercihlerini devre disi birakma)
  - ayarlar `map/settings` uzerinden JSON olarak saklaniyor
