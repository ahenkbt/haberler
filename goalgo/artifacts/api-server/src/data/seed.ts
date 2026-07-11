import { db, getYektubeDbForPrimaryWrite, videoSourcesTable, videosTable, productCategoriesTable, productsTable, mapPopularLocationsTable } from "@workspace/db";
import { TURKEY_CITIES } from "../lib/seed-popular-locations.js";
import { sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import seedSources from "./seed-sources.json";
import seedVideos1 from "./seed-videos-1.json";
import seedVideos2 from "./seed-videos-2.json";
import shopSeed from "./shop-seed.json";
import { seedEcommerceProductCategoriesIfNeeded } from "../lib/ecommerce-product-categories.js";
import { geliverDemoPassword, isDemoSeedAllowed } from "../lib/demo-credentials.js";

type SeedSource = {
  id: number; name: string; platform: string; sourceType: string; channelId: string;
  url: string; logoUrl: string; categorySlug: string; active: boolean; isLive: boolean;
};

type SeedVideo = {
  videoId: string; sourceId: number; title: string; thumbnail?: string;
  duration?: string; categorySlug: string; channelName?: string; active: boolean; isFeatured: boolean;
};

export async function seedVideoDataIfNeeded(logger?: { info: (msg: string, obj?: object) => void; error: (obj: object, msg: string) => void }) {
  const log = (msg: string, obj?: object) => logger ? logger.info(msg, obj ?? {}) : console.log(msg, obj ?? "");
  const logErr = (msg: string, err: unknown) => logger ? logger.error({ err }, msg) : console.error(msg, err);

  try {
    const ydb = getYektubeDbForPrimaryWrite();
    const rows = await ydb.execute<{ count: string }>(
      sql`SELECT COUNT(*)::text as count FROM video_sources WHERE id >= 7`
    );
    const count = parseInt((rows.rows ?? rows)[0]?.count ?? "0", 10);

    if (count >= 10) {
      log("Video seed: already seeded, skipping", { count });
      return;
    }

    log("Video seed: starting import", { sources: (seedSources as SeedSource[]).length });

    const sources = seedSources as SeedSource[];

    for (const s of sources) {
      await ydb.execute(sql`
        INSERT INTO video_sources (id, name, platform, source_type, channel_id, url, logo_url, category_slug, active, is_live)
        VALUES (
          ${s.id}, ${s.name}, ${s.platform}, ${s.sourceType}, ${s.channelId},
          ${s.url}, ${s.logoUrl || null}, ${s.categorySlug}, ${s.active}, ${s.isLive}
        )
        ON CONFLICT (id) DO NOTHING
      `);
    }

    await ydb.execute(sql`SELECT setval('video_sources_id_seq', 70, true)`);
    log("Video seed: sources inserted", { total: sources.length });

    const allVideos = [...(seedVideos1 as SeedVideo[]), ...(seedVideos2 as SeedVideo[])];
    const CHUNK = 100;
    let inserted = 0;

    for (let i = 0; i < allVideos.length; i += CHUNK) {
      const chunk = allVideos.slice(i, i + CHUNK);
      await ydb.insert(videosTable).values(
        chunk.map(v => ({
          videoId: v.videoId,
          sourceId: v.sourceId,
          title: v.title,
          thumbnail: v.thumbnail || null,
          duration: v.duration || null,
          categorySlug: v.categorySlug,
          channelName: v.channelName || null,
          active: v.active,
          isFeatured: v.isFeatured,
        }))
      );
      inserted += chunk.length;
      if (inserted % 500 === 0) log(`Video seed: progress ${inserted}/${allVideos.length}`);
    }

    await ydb.execute(sql`SELECT setval('videos_id_seq', (SELECT MAX(id) + 1 FROM videos), false)`);
    log("Video seed: complete", { sources: sources.length, videos: allVideos.length });
  } catch (err) {
    logErr("Video seed failed", err);
  }
}

type ShopSeedCategory = { name: string; slug: string; description: string };
type ShopSeedProduct = {
  name: string; slug: string; description: string;
  price: string; salePrice: string | null; sku: string;
  imageUrl: string; images: string[]; categorySlug: string;
  featured: boolean; stock: number;
};

export async function seedShopDataIfNeeded(logger?: { info: (msg: string, obj?: object) => void; error: (obj: object, msg: string) => void }) {
  const log = (msg: string, obj?: object) => logger ? logger.info(msg, obj ?? {}) : console.log(msg, obj ?? "");
  const logErr = (msg: string, err: unknown) => logger ? logger.error({ err }, msg) : console.error(msg, err);

  try {
    const rows = await db.execute<{ count: string }>(
      sql`SELECT COUNT(*)::text as count FROM product_categories`
    );
    const count = parseInt((rows.rows ?? rows)[0]?.count ?? "0", 10);
    if (count >= 10) {
      log("Shop seed: already seeded, skipping", { count });
      return;
    }

    const categories = (shopSeed as { categories: ShopSeedCategory[]; products: ShopSeedProduct[] }).categories;
    const products = (shopSeed as { categories: ShopSeedCategory[]; products: ShopSeedProduct[] }).products;

    log("Shop seed: inserting categories", { total: categories.length });

    const catIdMap: Record<string, number> = {};
    for (let i = 0; i < categories.length; i++) {
      const c = categories[i];
      const [row] = await db.insert(productCategoriesTable).values({
        name: c.name,
        slug: c.slug,
        description: c.description,
        position: i,
      }).onConflictDoNothing().returning();
      if (row) catIdMap[c.slug] = row.id;
    }

    // Fetch any existing cats that conflicted
    const existingCats = await db.select().from(productCategoriesTable);
    for (const ec of existingCats) {
      if (!catIdMap[ec.slug]) catIdMap[ec.slug] = ec.id;
    }

    log("Shop seed: inserting products", { total: products.length });

    const CHUNK = 50;
    for (let i = 0; i < products.length; i += CHUNK) {
      const chunk = products.slice(i, i + CHUNK);
      await db.insert(productsTable).values(
        chunk.map(p => ({
          name: p.name,
          slug: p.slug,
          description: p.description || null,
          price: p.price || "0",
          salePrice: p.salePrice || null,
          sku: p.sku || null,
          imageUrl: p.imageUrl || null,
          images: p.images?.length ? p.images : null,
          categoryId: catIdMap[p.categorySlug] ?? null,
          featured: p.featured,
          stock: p.stock,
          active: true,
        }))
      ).onConflictDoNothing();
    }

    log("Shop seed: complete", { categories: categories.length, products: products.length });
  } catch (err) {
    logErr("Shop seed failed", err);
  }
}

export async function seedPopularLocationsIfNeeded(logger?: { info: (msg: string, obj?: object) => void; error: (obj: object, msg: string) => void }) {
  const log = (msg: string, obj?: object) => logger ? logger.info(msg, obj ?? {}) : console.log(msg, obj ?? "");
  const logErr = (msg: string, err: unknown) => logger ? logger.error({ err }, msg) : console.error(msg, err);

  try {
    const rows = await db.execute<{ count: string }>(
      sql`SELECT COUNT(*)::text as count FROM map_popular_locations`
    );
    const count = parseInt((rows.rows ?? rows)[0]?.count ?? "0", 10);

    if (count >= 81) {
      log("Popular locations seed: already seeded", { count });
      return;
    }

    log("Popular locations seed: seeding 81 Turkish provinces", { existing: count });

    // Clear stale rows (e.g. initial 10 cities without region) then insert full set
    await db.execute(sql`DELETE FROM map_popular_locations`);

    const CHUNK = 20;
    for (let i = 0; i < TURKEY_CITIES.length; i += CHUNK) {
      const chunk = TURKEY_CITIES.slice(i, i + CHUNK);
      await db.insert(mapPopularLocationsTable).values(
        chunk.map(c => ({
          name: c.name,
          nameTr: c.nameTr,
          latitude: c.lat,
          longitude: c.lng,
          zoomLevel: c.zoom,
          region: c.region,
          districts: [...c.districts],
          sortOrder: c.sort,
          isActive: true,
        }))
      );
    }

    log("Popular locations seed: complete", { total: TURKEY_CITIES.length });
  } catch (err) {
    logErr("Popular locations seed failed", err);
  }
}

export async function seedMapDemoDataIfNeeded(logger?: { info: (msg: string, obj?: object) => void; error: (obj: object, msg: string) => void }) {
  const log = (msg: string) => logger ? logger.info(msg, {}) : console.log(msg);
  try {
    const countRes = await db.execute(sql`SELECT COUNT(*)::text as count FROM map_businesses`);
    const existingCount = parseInt((countRes.rows[0] as { count: string }).count, 10);
    if (existingCount > 0) {
      log(`seedMapDemoData: ${existingCount} businesses already exist, skipping`);
      return;
    }
    log("seedMapDemoData: inserting demo categories and businesses...");

    // --- Map Categories ---
    await db.execute(sql`
      INSERT INTO map_categories (id, name, slug, icon, is_active, sort_order) VALUES
        ('d4883fc2-8f1e-423c-841a-cc0963a79803', 'Restoranlar', 'restoranlar', '🍽️', true, 1),
        ('424de72e-899d-4f50-93d1-7f221e9ae917', 'Kafeler', 'kafeler', '☕', true, 2),
        ('3e639509-1170-4734-8ac8-ab9e66dcce11', 'Hastaneler', 'hastaneler', '🏥', true, 3),
        ('b11a2d3e-1234-4abc-9def-000000000010', 'Otomotiv', 'otomotiv', '🚗', true, 4),
        ('98d149be-87ac-47f3-b5d4-bd83b2af3e5d', 'Bankalar', 'bankalar', '🏦', true, 5),
        ('83a6f26a-ee85-48e2-a29a-0c49f4a1529a', 'Benzin İstasyonu', 'benzin-istasyonu', '⛽', true, 6),
        ('17c87525-ac12-43c8-a101-b14537b94c2a', 'Marketler', 'marketler', '🛒', true, 7),
        ('7d4db3af-e84a-437c-baf8-d7de5b429b81', 'Oteller', 'oteller', '🏨', true, 8),
        ('b11a2d3e-1234-4abc-9def-000000000001', 'Alışveriş Merkezleri', 'alisveris-merkezleri', '🏬', true, 9),
        ('b11a2d3e-1234-4abc-9def-000000000002', 'Elektronik', 'elektronik', '📱', true, 10),
        ('b11a2d3e-1234-4abc-9def-000000000003', 'Moda & Giyim', 'moda-giyim', '👗', true, 11),
        ('b11a2d3e-1234-4abc-9def-000000000004', 'Hizmetler', 'hizmetler', '🔧', true, 12),
        ('b11a2d3e-1234-4abc-9def-000000000005', 'Eğlence', 'eglence', '🎭', true, 13)
      ON CONFLICT (id) DO NOTHING
    `);

    // --- Map Businesses ---
    await db.execute(sql`
      INSERT INTO map_businesses (id, name, slug, category_id, address, phone, website, rating, user_ratings_total, photo_url, cover_photo_url, latitude, longitude, is_active, is_premium, description, has_delivery, has_online_order, homepage_featured, homepage_super_category, store_type) VALUES
      ('c1a6c1a9-3a2d-49f3-9b8a-b8baed3afcdc', 'Nusr-Et Steakhouse', 'nusr-et-steakhouse', 'd4883fc2-8f1e-423c-841a-cc0963a79803', 'Etiler Mah. Nisbetiye Cd. No:19, Beşiktaş, İstanbul', '+90 212 352 0660', 'https://nusret.com', 4.5, 2841, 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&q=80', 'https://images.unsplash.com/photo-1544025162-d76694265947?w=1200&q=80', 41.0753, 29.0309, true, true, 'Dünyaca ünlü et restoranı. Salt Bae''nin meşhur kuruluşu.', true, true, true, 'siparis', 'siparis'),
      ('94f81ddc-1c18-498a-b22a-cbe13e0561a5', 'Köşebaşı Restoran', 'kosebasih-restoran', 'd4883fc2-8f1e-423c-841a-cc0963a79803', 'Nişantaşı, Teşvikiye Cd. No:11, Şişli, İstanbul', '+90 212 241 2924', 'https://kosebasih.com', 4.7, 1523, 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80', 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200&q=80', 41.0482, 28.9971, true, true, 'Türk mutfağının en güzel kebap ve ızgara çeşitleri.', true, true, true, 'siparis', 'siparis'),
      ('a61186ab-4635-48e5-babe-38c49c262b2a', 'Mandabatmaz Kahvesi', 'mandabatmaz-kahvesi', '424de72e-899d-4f50-93d1-7f221e9ae917', 'Olivia Geçidi No:1, Beyoğlu, İstanbul', '+90 212 293 9598', null, 4.8, 987, 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&q=80', 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1200&q=80', 41.0340, 28.9776, true, true, 'İstanbul''un ikonik Türk kahve durağı. 1967''den beri hizmet.', false, false, true, 'siparis', 'siparis'),
      ('3cee56f3-9279-428c-b3d3-bbfd0f21f185', 'Kebapçı İskender', 'kebapci-iskender', 'd4883fc2-8f1e-423c-841a-cc0963a79803', 'Atatürk Cd. No:60, Osmangazi, Bursa', '+90 224 221 4615', 'https://iskender.com.tr', 4.7, 3201, 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&q=80', 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1200&q=80', 40.1886, 29.0609, true, true, 'İskender kebabının orijinal mucidi. 1867''den beri.', true, true, true, 'siparis', 'siparis'),
      ('3017e949-ea6e-4a27-82aa-a91ad7642628', 'Kınacızade Konağı', 'kinacizade-konagi', 'd4883fc2-8f1e-423c-841a-cc0963a79803', 'Hacı Bayram Mh. Kalekapısı Sk. No:28, Altındağ, Ankara', '+90 312 309 2225', null, 4.6, 892, 'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=800&q=80', 'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=1200&q=80', 39.9408, 32.8590, true, true, 'Ankara Kalesi''nin yanında tarihi konakta Türk mutfağı.', false, true, true, 'siparis', 'siparis'),
      ('d9f6abd3-8c9a-43ff-bc2e-a4bc1830e15c', 'Kronotrop Coffee Bar', 'kronotrop-coffee-bar', '424de72e-899d-4f50-93d1-7f221e9ae917', 'Tomtom Mah. Yeniçarşı Cd. No:3, Beyoğlu, İstanbul', '+90 212 292 9272', 'https://kronotrop.com.tr', 4.7, 1456, 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800&q=80', 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=1200&q=80', 41.0332, 28.9745, true, true, 'Türkiye''nin en iyi specialty coffee barı.', false, false, true, 'siparis', 'siparis'),
      ('4bc96c01-2326-4ede-9742-60d1364ea5b1', 'Mikla Restaurant', 'mikla-restaurant', 'd4883fc2-8f1e-423c-841a-cc0963a79803', 'Marmara Pera Oteli, Meşrutiyet Cd. No:15, Beyoğlu, İstanbul', '+90 212 293 5656', 'https://miklarestaurant.com', 4.8, 2134, 'https://images.unsplash.com/photo-1424847651672-bf20a4b0982b?w=800&q=80', 'https://images.unsplash.com/photo-1424847651672-bf20a4b0982b?w=1200&q=80', 41.0340, 28.9781, true, true, 'Mehmet Gürs''ün ikonik çatı katı restoranı. New Nordic Türk mutfağı.', false, true, true, 'siparis', 'siparis'),
      ('89f21cee-b766-4e24-9a2d-9a51c8182b7f', 'İstinye Park AVM', 'istinye-park-avm', 'b11a2d3e-1234-4abc-9def-000000000001', 'İstinye Mah. İstinye Bayırı Cd. No:73, Sarıyer, İstanbul', '+90 212 345 5555', 'https://istinyepark.com', 4.6, 4521, 'https://images.unsplash.com/photo-1567449303183-ae0d6ed1498b?w=800&q=80', 'https://images.unsplash.com/photo-1567449303183-ae0d6ed1498b?w=1200&q=80', 41.1038, 29.0439, true, true, 'İstanbul''un en prestijli alışveriş merkezi. 350+ marka.', false, true, true, 'alisveris', 'alisveris'),
      ('d6711469-468e-4435-a58f-92f39d355f38', 'Teknosa Bağcılar Mega Mağaza', 'teknosa-bagcilar-mega', 'b11a2d3e-1234-4abc-9def-000000000002', 'Güneşli Mah. Atatürk Cd. No:21, Bağcılar, İstanbul', '+90 212 555 8080', 'https://teknosa.com', 4.3, 2876, 'https://images.unsplash.com/photo-1573666033935-0bf7bb387acf?w=800&q=80', 'https://images.unsplash.com/photo-1573666033935-0bf7bb387acf?w=1200&q=80', 41.0618, 28.8372, true, true, 'Türkiye''nin önde gelen teknoloji ve elektronik zinciri.', false, true, true, 'alisveris', 'alisveris'),
      ('eac30fb7-d6ae-4462-8d26-d0cbcb1d4dbb', 'Vakko Grand Bazaar', 'vakko-grand-bazaar', 'b11a2d3e-1234-4abc-9def-000000000003', 'Kapalıçarşı, Beyazıt, İstanbul', '+90 212 522 0800', 'https://vakko.com', 4.7, 1987, 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80', 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&q=80', 41.0107, 28.9680, true, true, 'Türkiye''nin köklü moda markası Vakko''nun özel koleksiyonları.', false, true, true, 'alisveris', 'alisveris'),
      ('d8e10e83-1d99-456c-988f-b589d88083fa', 'Four Seasons Hotel Istanbul at the Bosphorus', 'four-seasons-bosphorus', '7d4db3af-e84a-437c-baf8-d7de5b429b81', 'Çırağan Cd. No:28, Beşiktaş, İstanbul', '+90 212 381 4000', 'https://fourseasons.com/bosphorus', 4.9, 3456, 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80', 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=80', 41.0534, 29.0215, true, true, 'Boğaz manzaralı ultra-lüks otel. İstanbul''un simgesi.', false, false, true, 'hizmet', 'hizmet'),
      ('6f31ba6b-b644-4474-a041-d87a4e91383f', 'Hilton İzmir', 'hilton-izmir', '7d4db3af-e84a-437c-baf8-d7de5b429b81', 'Gaziosmanpaşa Blv. No:7, Konak, İzmir', '+90 232 441 6060', 'https://hilton.com', 4.6, 2109, 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&q=80', 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=1200&q=80', 38.4192, 27.1287, true, true, 'İzmir körfezi manzaralı 5 yıldızlı otel.', false, false, true, 'hizmet', 'hizmet'),
      ('2ae88c99-060b-488e-aea2-c2a5288eaacb', 'The Ritz-Carlton İstanbul', 'ritz-carlton-istanbul', '7d4db3af-e84a-437c-baf8-d7de5b429b81', 'Süzer Plaza, Elmadag Mah. Asker Ocagi Cd. No:15, Şişli, İstanbul', '+90 212 334 4444', 'https://ritzcarlton.com', 4.8, 1876, 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800&q=80', 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=1200&q=80', 41.0479, 28.9874, true, true, 'Şişli''nin kalbinde ultra lüks otel.', false, false, true, 'hizmet', 'hizmet'),
      ('ebabfeb6-b832-44ef-97d6-be91e4f380d0', '1888 Restaurant', '1888-restaurant', 'd4883fc2-8f1e-423c-841a-cc0963a79803', 'Kapalıçarşı içi No:74, Beyazıt, İstanbul', '+90 212 527 4893', null, 4.5, 543, 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80', 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&q=80', 41.0108, 28.9683, true, true, 'Kapalıçarşı''nın en tarihi restoranı. 1888''den beri.', false, false, false, 'yiyecek', null),
      ('a12f5d98-4913-4215-bf4f-14dc8d7deae0', 'Topkapı Sarayı Müzesi', 'topkapi-sarayi-muzesi', '932a6363-3db4-4bf7-8fbc-9807f675bf07', 'Cankurtaran Mah. Topkapı Sarayı, Fatih, İstanbul', '+90 212 512 0480', 'https://millisaraylar.gov.tr', 4.7, 18943, 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=800&q=80', 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=1200&q=80', 41.0115, 28.9837, true, true, 'Osmanlı İmparatorluğu''nun ana sarayı. UNESCO Dünya Mirası.', false, false, true, 'yapilacak', null),
      ('d462353e-bf45-400d-8b3c-911c36b9b669', 'Miniatürk', 'miniaturk', '932a6363-3db4-4bf7-8fbc-9807f675bf07', 'İmrahor Cd. No:2, Eyüpsultan, İstanbul', '+90 212 222 2882', 'https://miniaturk.com.tr', 4.4, 7234, 'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=800&q=80', 'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=1200&q=80', 41.0581, 28.9406, true, true, 'Türkiye''nin önemli yapılarının minyatürlerini içeren açık hava müzesi.', false, false, true, 'yapilacak', null),
      ('16083dfe-132b-4f92-a6b3-68fc4068907a', 'Boğaz Tekne Turu', 'bogaz-tekne-turu', '932a6363-3db4-4bf7-8fbc-9807f675bf07', 'Eminönü İskelesi, Fatih, İstanbul', '+90 212 522 0045', null, 4.6, 5432, 'https://images.unsplash.com/photo-1585364740074-f91d1218b0ce?w=800&q=80', 'https://images.unsplash.com/photo-1585364740074-f91d1218b0ce?w=1200&q=80', 41.0173, 28.9737, true, true, 'İstanbul Boğazı''nda 2 saatlik tekne turu. Günlük kalkışlar.', false, true, true, 'yapilacak', null),
      ('2e0e6d94-751c-4988-bf03-a984ba14a16d', 'Trabzon Meyhanesi', 'trabzon-meyhanesi', 'd4883fc2-8f1e-423c-841a-cc0963a79803', 'Balıklı Sok. No:5, Beyoğlu, İstanbul', '+90 212 244 2990', null, 4.6, 1203, 'https://images.unsplash.com/photo-1578474846511-04ba529f0b88?w=800&q=80', 'https://images.unsplash.com/photo-1578474846511-04ba529f0b88?w=1200&q=80', 41.0361, 28.9825, true, false, 'Karadeniz mutfağının en iyi temsilcisi. Hamsi ve taze balık.', false, false, false, 'yiyecek', null),
      ('cc0506f6-eaff-476f-99f0-8222ade8f975', 'Vanilla Restaurant Antalya', 'vanilla-restaurant-antalya', 'd4883fc2-8f1e-423c-841a-cc0963a79803', 'Şirinyalı Mah. Atatürk Blv. No:142, Muratpaşa, Antalya', '+90 242 323 9090', null, 4.5, 876, 'https://images.unsplash.com/photo-1600891964599-f61ba0e24092?w=800&q=80', 'https://images.unsplash.com/photo-1600891964599-f61ba0e24092?w=1200&q=80', 36.8836, 30.6901, true, false, 'Antalya''nın en sevilen Akdeniz mutfağı restoranı.', false, false, false, 'yiyecek', null),
      ('5f5b2d75-fa30-4384-85ea-1116cfb34a90', 'Sultanahmet Camii (Mavi Cami)', 'sultanahmet-camii', 'e600debe-935c-47b8-bf2c-893836aef24a', 'Sultan Ahmet Mah. Atmeydanı Cd. No:7, Fatih, İstanbul', null, null, 4.9, 32109, 'https://images.unsplash.com/photo-1554867788-f90f4f0c8800?w=800&q=80', 'https://images.unsplash.com/photo-1554867788-f90f4f0c8800?w=1200&q=80', 41.0054, 28.9768, true, false, 'İstanbul''un sembolü. 6 minareli Osmanlı camii, UNESCO Dünya Mirası.', false, false, true, 'yapilacak', null),
      ('b22a0001-0000-0000-0001-000000000001', 'BurgerHouse Kadıköy', 'burgerhouse-kadikoy', 'd4883fc2-8f1e-423c-841a-cc0963a79803', 'Moda Cd. No:45, Kadıköy, İstanbul', '+90 216 414 9090', null, 4.5, 1243, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=1200&q=80', 40.9888, 29.0260, true, true, 'Kadıköy''ün en sevilen burger noktası. El yapımı et köfte.', true, true, true, 'siparis', 'siparis'),
      ('b22a0001-0000-0000-0001-000000000002', 'Pizza Roma Ankara', 'pizza-roma-ankara', 'd4883fc2-8f1e-423c-841a-cc0963a79803', 'Kızılay Mah. Ziya Gökalp Cd. No:22, Çankaya, Ankara', '+90 312 431 7070', null, 4.4, 876, 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80', 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=1200&q=80', 39.9184, 32.8542, true, true, 'Ankara''nın en lezzetli İtalyan pizza lezzeti.', true, true, true, 'siparis', 'siparis'),
      ('b22a0001-0000-0000-0001-000000000003', 'Çiğköfteci Ali Usta', 'cigkofteci-ali-usta', 'd4883fc2-8f1e-423c-841a-cc0963a79803', 'Güzelbahçe Sk. No:8, Nişantaşı, İstanbul', '+90 212 225 5500', null, 4.6, 3214, 'https://images.unsplash.com/photo-1546549032-9571cd6b27df?w=800&q=80', 'https://images.unsplash.com/photo-1546549032-9571cd6b27df?w=1200&q=80', 41.0481, 28.9948, true, true, 'En lezzetli çiğ köfte. Acı, orta, az acı seçenekleri.', true, true, true, 'siparis', 'siparis'),
      ('b22a0001-0000-0000-0001-000000000004', 'Zara Home Turkey', 'zara-home-turkey', 'b11a2d3e-1234-4abc-9def-000000000003', 'Maslak 42, Maslak, Sarıyer, İstanbul', '+90 212 286 9090', 'https://zarahome.com', 4.5, 1567, 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80', 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=1200&q=80', 41.1066, 29.0205, true, true, 'Ev dekorasyonu ve yaşam tarzı ürünleri.', false, true, true, 'alisveris', 'alisveris'),
      ('b22a0001-0000-0000-0001-000000000005', 'Samsung Store İzmir', 'samsung-store-izmir', 'b11a2d3e-1234-4abc-9def-000000000002', 'Konak Pier, Atatürk Cd. No:1, Konak, İzmir', '+90 232 489 7070', 'https://samsung.com/tr', 4.4, 987, 'https://images.unsplash.com/photo-1616348436168-de43ad0db179?w=800&q=80', 'https://images.unsplash.com/photo-1616348436168-de43ad0db179?w=1200&q=80', 38.4272, 27.1428, true, true, 'Samsung ürünleri ve servis merkezi.', false, true, true, 'alisveris', 'alisveris'),
      ('b22a0001-0000-0000-0001-000000000006', 'Swissôtel The Bosphorus', 'swissotel-bosphorus', '7d4db3af-e84a-437c-baf8-d7de5b429b81', 'Çırağan Cd. No:2, Beşiktaş, İstanbul', '+90 212 326 1100', 'https://swissotel.com', 4.8, 4231, 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800&q=80', 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=1200&q=80', 41.0536, 29.0196, true, true, 'Boğaz manzaralı 5 yıldızlı lüks otel. 600 oda.', false, false, true, 'hizmet', 'hizmet'),
      ('b22a0001-0000-0000-0001-000000000007', 'Gaziantep Lahmacun', 'gaziantep-lahmacun', 'd4883fc2-8f1e-423c-841a-cc0963a79803', 'Bağlarbaşı Mah. Halide Edip Adıvar Cd. No:12, Üsküdar, İstanbul', '+90 216 556 4040', null, 4.8, 2103, 'https://images.unsplash.com/photo-1561626423-a51b45aef0a1?w=800&q=80', 'https://images.unsplash.com/photo-1561626423-a51b45aef0a1?w=1200&q=80', 41.0191, 29.0163, true, true, 'Güneydoğu mutfağının incisi. İnce hamurlu Gaziantep lahmacunu.', true, true, true, 'siparis', 'siparis')
      ON CONFLICT (id) DO NOTHING
    `);

    log("seedMapDemoData: demo businesses inserted successfully");
  } catch (err) {
    logger ? logger.error({ err }, "seedMapDemoData failed") : console.error("seedMapDemoData failed", err);
  }
}

/** Keşfet vitrininde gösterilmeyen POI kategorilerini canlı DB'de de kapatır; otomotiv kategorisini ekler */
export async function syncMapCategoryDefaults(
  logger?: { info: (msg: string, obj?: object) => void; error?: (obj: object, msg: string) => void },
): Promise<void> {
  const log = (msg: string) => (logger ? logger.info(msg, {}) : console.log(msg));
  try {
    await db.execute(sql`
      UPDATE map_categories
      SET is_active = false, updated_at = NOW()
      WHERE slug IN ('parklar', 'camiler', 'eczaneler')
    `);
    await db.execute(sql`
      INSERT INTO map_categories (id, name, slug, icon, google_place_type, is_active, sort_order)
      VALUES (
        'b11a2d3e-1234-4abc-9def-000000000010',
        'Otomotiv',
        'otomotiv',
        '🚗',
        'car_repair',
        true,
        4
      )
      ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name,
        icon = EXCLUDED.icon,
        google_place_type = EXCLUDED.google_place_type,
        is_active = true,
        sort_order = EXCLUDED.sort_order,
        updated_at = NOW()
    `);
    log("syncMapCategoryDefaults: eczaneler deactivated, otomotiv category ensured");
  } catch (err) {
    if (logger?.error) logger.error({ err }, "syncMapCategoryDefaults failed");
    else console.error("syncMapCategoryDefaults failed", err);
  }
}

export async function seedSeriIlanlarIfNeeded(logger?: { info: (msg: string, obj?: object) => void; error: (obj: object, msg: string) => void }) {
  const log = (msg: string) => logger ? logger.info(msg, {}) : console.log(msg);
  log("seedSeriIlanlar: retired (module removed)");
}

/**
 * SQL migrasyon zincirinde olmayan Drizzle kolonları — ilk `/api/map/*` isteğinden önce çalışmalı.
 * Özellikle `vendors.linked_map_business_id` yoksa `MAP_BUSINESS_HAS_ACTIVE_VENDOR` EXISTS sorgusu 500 üretir.
 */
export async function ensureMapVendorColumnPatches(
  logger?: { info: (msg: string, obj?: object) => void; error: (obj: object, msg: string) => void },
): Promise<void> {
  const log = (msg: string) => (logger ? logger.info(msg, {}) : console.log(msg));
  await db.execute(sql`ALTER TABLE map_businesses ADD COLUMN IF NOT EXISTS slug TEXT`);
  await db.execute(sql`ALTER TABLE map_businesses ADD COLUMN IF NOT EXISTS import_source TEXT`);
  await db.execute(sql`ALTER TABLE map_businesses ADD COLUMN IF NOT EXISTS google_places_extras JSONB`);
  await db.execute(sql`ALTER TABLE map_businesses ADD COLUMN IF NOT EXISTS scraped_photos JSONB`);
  await db.execute(sql`ALTER TABLE map_businesses ADD COLUMN IF NOT EXISTS scraped_reviews JSONB`);
  await db.execute(sql`ALTER TABLE map_businesses ADD COLUMN IF NOT EXISTS scraped_at TIMESTAMP`);
  await db.execute(sql`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS catalog_contact_gap BOOLEAN NOT NULL DEFAULT false`);
  await db.execute(sql`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS catalog_menu_gap BOOLEAN NOT NULL DEFAULT false`);
  await db.execute(sql`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS membership_tier TEXT NOT NULL DEFAULT 'gold'`);
  await db.execute(sql`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS about_html TEXT`);
  await db.execute(sql`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS google_place_id TEXT`);
  await db.execute(sql`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS linked_map_business_id TEXT`);
  await db.execute(sql`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS google_import_kind TEXT`);
  log("ensureMapVendorColumnPatches: harita + vendor uyumluluk sütunları hazır");
}

export async function ensureExtraTables(logger?: { info: (msg: string, obj?: object) => void; error: (obj: object, msg: string) => void }) {
  const log = (msg: string) => logger ? logger.info(msg, {}) : console.log(msg);
  try {
    await ensureMapVendorColumnPatches(logger);
    // Backward-compat safety for older prod schemas.
    await db.execute(sql`
      ALTER TABLE IF EXISTS map_products
        ADD COLUMN IF NOT EXISTS home_featured BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS home_featured_until TIMESTAMP;
    `);
    await db.execute(sql`
      ALTER TABLE IF EXISTS map_campaigns
        ADD COLUMN IF NOT EXISTS home_featured BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS home_featured_until TIMESTAMP;
    `);
    await db.execute(sql`DROP TABLE IF EXISTS seri_ilanlar`);
    log("ensureExtraTables: schema compatibility checks ready");

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS map_contact_messages (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        business_id VARCHAR NOT NULL,
        sender_name TEXT NOT NULL,
        sender_phone TEXT,
        sender_email TEXT,
        message TEXT NOT NULL,
        is_read BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    log("ensureExtraTables: map_contact_messages ready");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS site_contact_messages (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT,
        subject TEXT,
        message TEXT NOT NULL,
        is_read BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    log("ensureExtraTables: site_contact_messages ready");
    await db.execute(sql`ALTER TABLE map_businesses ADD COLUMN IF NOT EXISTS store_type TEXT`);
    log("ensureExtraTables: store_type column ready");
    await db.execute(sql`ALTER TABLE map_businesses ADD COLUMN IF NOT EXISTS homepage_super_category TEXT`);
    log("ensureExtraTables: homepage_super_category column ready");
    await db.execute(sql`ALTER TABLE map_businesses ADD COLUMN IF NOT EXISTS homepage_featured BOOLEAN NOT NULL DEFAULT FALSE`);
    log("ensureExtraTables: homepage_featured column ready");
    await db.execute(sql`ALTER TABLE map_businesses ADD COLUMN IF NOT EXISTS homepage_featured_until TIMESTAMP`);
    log("ensureExtraTables: homepage_featured_until column ready");

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS map_feature_placement_pricing (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
        placement_key TEXT NOT NULL UNIQUE,
        label_tr TEXT NOT NULL,
        price_day DOUBLE PRECISION NOT NULL DEFAULT 0,
        price_week DOUBLE PRECISION NOT NULL DEFAULT 0,
        price_month DOUBLE PRECISION NOT NULL DEFAULT 0,
        sort_order INTEGER NOT NULL DEFAULT 0,
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS map_feature_promotion_requests (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
        business_id VARCHAR NOT NULL,
        owner_user_id VARCHAR,
        placement_key TEXT NOT NULL,
        billing_period TEXT NOT NULL,
        units INTEGER NOT NULL DEFAULT 1,
        total_try DOUBLE PRECISION NOT NULL,
        payment_method TEXT NOT NULL,
        receipt_url TEXT,
        category_super TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        admin_note TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    log("ensureExtraTables: map_feature_placement_pricing / map_feature_promotion_requests ready");

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS kesfet_discover_groups (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        key TEXT NOT NULL UNIQUE,
        label TEXT NOT NULL,
        icon TEXT,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS kesfet_discover_subcategories (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        group_id VARCHAR NOT NULL,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        google_place_type TEXT,
        google_keyword TEXT,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    log("ensureExtraTables: kesfet_discover_groups / subcategories ready");

    await db.execute(sql`
      INSERT INTO map_feature_placement_pricing (placement_key, label_tr, price_day, price_week, price_month, sort_order)
      VALUES
        ('homepage', 'Ana sayfa (öne çıkan işletmeler)', 299, 1499, 4999, 1),
        ('kesfet_harita', 'Keşfet / Haritalar', 199, 999, 3499, 2),
        ('category_home', 'Ana sayfa süper kategori şeridi', 249, 1199, 3999, 3),
        ('siparis', 'Sipariş modülü', 349, 1699, 5499, 4),
        ('alisveris', 'Alışveriş', 349, 1699, 5499, 5),
        ('turizm', 'Turizm', 299, 1499, 4999, 6)
      ON CONFLICT (placement_key) DO NOTHING
    `);
    await db.execute(sql`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS wiki_featured JSONB DEFAULT '[]'::jsonb`);
    log("ensureExtraTables: wiki_featured column ready");
    await db.execute(sql`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS wiki_encyclopedia_ui JSONB`);
    log("ensureExtraTables: wiki_encyclopedia_ui column ready");

    await db.execute(sql`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS home_recent_business_limit INTEGER NOT NULL DEFAULT 10`);
    log("ensureExtraTables: home_recent_business_limit column ready");
    await db.execute(sql`ALTER TABLE map_businesses ADD COLUMN IF NOT EXISTS vendor_id INTEGER`);
    log("ensureExtraTables: vendor_id column ready");
    await db.execute(sql`ALTER TABLE map_cities ADD COLUMN IF NOT EXISTS image_url text`);
    log("ensureExtraTables: map_cities.image_url column ready");

    /* — Servis Sağlayıcı alanları (vendors tablosuna) — */
    await db.execute(sql`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS provider_type TEXT`);
    await db.execute(sql`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS provider_subtype TEXT`);
    await db.execute(sql`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS application_status TEXT NOT NULL DEFAULT 'approved'`);
    await db.execute(sql`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS rejection_reason TEXT`);
    await db.execute(sql`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS doc_kimlik TEXT`);
    await db.execute(sql`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS doc_vergi TEXT`);
    await db.execute(sql`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS doc_imza TEXT`);
    await db.execute(sql`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP`);
    log("ensureExtraTables: provider columns ready");

    /* Emlak modülü kaldırıldı: tablo silinır; haritadaki vendor bağları koparılır; emlak vendor kayıtları silinir */
    await db.execute(sql`DROP TABLE IF EXISTS emlak_listings`);
    await db.execute(sql`
      UPDATE map_businesses SET vendor_id = NULL
      WHERE vendor_id IN (SELECT id FROM vendors WHERE vendor_type = 'emlak')
    `);
    await db.execute(sql`DELETE FROM vendors WHERE vendor_type = 'emlak'`);
    log("ensureExtraTables: emlak_listings / emlak vendors retired");

    /* Eksik panel e-postası / WhatsApp: önce işletme e-postası, son çare sentetik demo adresi (yetkili adını zorlamıyoruz) */
    await db.execute(sql`
      UPDATE vendors
      SET owner_email = COALESCE(
            NULLIF(TRIM(owner_email), ''),
            NULLIF(TRIM(email), ''),
            LOWER(REGEXP_REPLACE(REGEXP_REPLACE(name, '[^a-zA-Z0-9]', '-', 'g'), '-+', '-', 'g'))
              || '@demo.yekpare.net'
          ),
          whatsapp = COALESCE(whatsapp, phone),
          application_status = COALESCE(application_status, 'approved'),
          verified_at = COALESCE(verified_at, NOW())
      WHERE owner_email IS NULL OR TRIM(COALESCE(owner_email, '')) = ''
         OR whatsapp IS NULL
    `);
    log("ensureExtraTables: vendor owner_email / whatsapp backfill");
  } catch (err) {
    logger ? logger.error({ err }, "ensureExtraTables failed") : console.error("ensureExtraTables failed", err);
  }
}

/* — Delivery Extended Tables: sub-categories, product templates, combos, options — */
export async function ensureDeliveryExtensions(logger?: { info: (msg: string, obj?: object) => void; error: (obj: object, msg: string) => void }) {
  const log = (msg: string) => logger ? logger.info(msg, {}) : console.log(msg);
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS vendor_subcategories (
        id SERIAL PRIMARY KEY,
        category_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        slug TEXT NOT NULL,
        icon TEXT,
        position INTEGER NOT NULL DEFAULT 0,
        active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE UNIQUE INDEX IF NOT EXISTS uq_vendor_subcategories_cat_slug ON vendor_subcategories(category_id, slug);

      CREATE TABLE IF NOT EXISTS vendor_product_templates (
        id SERIAL PRIMARY KEY,
        vendor_category_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        position INTEGER NOT NULL DEFAULT 0,
        active BOOLEAN NOT NULL DEFAULT true
      );

      CREATE TABLE IF NOT EXISTS vendor_item_options (
        id SERIAL PRIMARY KEY,
        menu_item_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        required BOOLEAN NOT NULL DEFAULT false,
        multiple BOOLEAN NOT NULL DEFAULT true,
        choices JSONB NOT NULL DEFAULT '[]',
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS vendor_menu_combos (
        id SERIAL PRIMARY KEY,
        vendor_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL DEFAULT 0,
        image_url TEXT,
        combo_items JSONB NOT NULL DEFAULT '[]',
        active BOOLEAN NOT NULL DEFAULT true,
        position INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      ALTER TABLE vendors ADD COLUMN IF NOT EXISTS branch_type TEXT NOT NULL DEFAULT 'tek_subeli';
      ALTER TABLE vendors ADD COLUMN IF NOT EXISTS parent_vendor_id INTEGER;
      ALTER TABLE vendors ADD COLUMN IF NOT EXISTS subcategory_id INTEGER;
      ALTER TABLE vendor_menu_items ADD COLUMN IF NOT EXISTS unit_type TEXT NOT NULL DEFAULT 'adet';
      ALTER TABLE vendor_menu_items ADD COLUMN IF NOT EXISTS weight_value TEXT;
    `);
    log("ensureDeliveryExtensions: vendor_subcategories, product_templates, combos, options tables ready");
    log("ensureDeliveryExtensions: branch_type, subcategory_id, unit_type columns ready");

    /* — Ensure core delivery categories exist — */
    const deliveryCats = [
      { name: "Yemek & Restoran",    slug: "yemek",              icon: "🍽️",  position: 1 },
      { name: "Market",              slug: "market",             icon: "🛒",  position: 2 },
      { name: "Su & İçecek",         slug: "su-icecek",          icon: "💧",  position: 3 },
      { name: "Çiçek",              slug: "cicek",              icon: "🌷",  position: 4 },
      { name: "Eczane",             slug: "eczane",             icon: "💊",  position: 5 },
      { name: "Manav",              slug: "manav",              icon: "🥦",  position: 6 },
      { name: "Kasap",              slug: "kasap",              icon: "🥩",  position: 7 },
      { name: "Şarküteri",          slug: "sarküteri",          icon: "🧀",  position: 8 },
      { name: "Kuruyemiş",          slug: "kuruyemis",          icon: "🥜",  position: 9 },
      { name: "Fırın & Yufkacı",    slug: "firin",              icon: "🥖",  position: 10 },
      { name: "Pastane & Tatlıcı",  slug: "pastane",            icon: "🎂",  position: 11 },
      { name: "Balıkçı",            slug: "balikci",            icon: "🐟",  position: 12 },
      { name: "Aktar & Bitkisel",   slug: "aktar",              icon: "🌿",  position: 13 },
      { name: "Kozmetik & Bakım",   slug: "kozmetik-bakim",     icon: "💄",  position: 14 },
      { name: "Kırtasiye & Kitap",  slug: "kirtasiye",          icon: "📚",  position: 15 },
      { name: "Züccaciye & Ev",     slug: "zuccaciye",          icon: "🏠",  position: 16 },
      { name: "Nalbur & Yapı",      slug: "nalbur",             icon: "🔧",  position: 17 },
      { name: "Giyim & Aksesuar",   slug: "giyim-aksesuar",     icon: "👕",  position: 18 },
      { name: "Petshop",            slug: "petshop",            icon: "🐾",  position: 19 },
      { name: "Hediyelik & Bijuteri",slug: "hediyelik",         icon: "🎁",  position: 20 },
      { name: "Elektronik",         slug: "elektronik-teslimat",icon: "📱",  position: 21 },
    ];
    for (const c of deliveryCats) {
      await db.execute(sql`
        INSERT INTO vendor_categories (name, slug, icon, position, active)
        VALUES (${c.name}, ${c.slug}, ${c.icon}, ${c.position}, true)
        ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, icon = EXCLUDED.icon, position = EXCLUDED.position
      `);
    }
    await db.execute(sql`
      UPDATE vendor_categories SET active = false, updated_at = NOW()
      WHERE slug IN ('yedek-parca', 'oto-yedek-parca', 'yedek-parca-oto')
    `);
    log(`ensureDeliveryExtensions: ${deliveryCats.length} delivery categories upserted`);
  } catch (err) {
    logger ? logger.error({ err }, "ensureDeliveryExtensions failed") : console.error("ensureDeliveryExtensions failed", err);
  }
}

export async function ensureVendorServiceExtensions(logger?: { info: (msg: string, obj?: object) => void; error: (obj: object, msg: string) => void }) {
  const log = (msg: string) => logger ? logger.info(msg, {}) : console.log(msg);
  try {
    await db.execute(sql`
      ALTER TABLE vendors ADD COLUMN IF NOT EXISTS table_service_enabled BOOLEAN NOT NULL DEFAULT false;
      ALTER TABLE vendors ADD COLUMN IF NOT EXISTS reservation_enabled BOOLEAN NOT NULL DEFAULT false;
      ALTER TABLE vendors ADD COLUMN IF NOT EXISTS reservation_auto_confirm BOOLEAN NOT NULL DEFAULT false;
      ALTER TABLE vendors ADD COLUMN IF NOT EXISTS table_sections TEXT;

      CREATE TABLE IF NOT EXISTS vendor_reservations (
        id SERIAL PRIMARY KEY,
        vendor_id INTEGER NOT NULL,
        guest_name TEXT NOT NULL,
        guest_phone TEXT NOT NULL,
        reservation_date TEXT NOT NULL,
        reservation_time TEXT NOT NULL,
        party_size INTEGER NOT NULL DEFAULT 1,
        section_id TEXT,
        section_name TEXT,
        note TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    log("ensureVendorServiceExtensions: table_service, reservation columns + vendor_reservations table ready");
  } catch (err) {
    logger ? logger.error({ err }, "ensureVendorServiceExtensions failed") : console.error("ensureVendorServiceExtensions failed", err);
  }
}

/* ────────────────────────────────────────────────────────────────────
   Demo Vendor Seed — Delivery & E-Commerce brands with map premium entries
──────────────────────────────────────────────────────────────────── */
export async function seedDemoVendorsIfNeeded(logger?: { info: (msg: string, obj?: object) => void; error: (obj: object, msg: string) => void }) {
  const log = (msg: string) => logger ? logger.info(msg, {}) : console.log(msg);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = <T>(res: any): T[] => (res.rows ?? res) as T[];
  try {
    const countRes = await db.execute<{ count: string }>(sql`SELECT COUNT(*)::text as count FROM vendors`);
    const existingCount = parseInt(r<{count: string}>(countRes)[0]?.count ?? "0", 10);
    if (existingCount > 0) {
      log(`seedDemoVendors: ${existingCount} vendors already exist, skipping`);
      return;
    }
    log("seedDemoVendors: inserting demo vendors...");

    /* — 1. Vendor Categories — */
    await db.execute(sql`
      INSERT INTO vendor_categories (name, slug, icon, position, active) VALUES
        ('Hamburger & Fastfood', 'hamburger-fastfood', '🍔', 1, true),
        ('Pizza',               'pizza',               '🍕', 2, true),
        ('Tavuk',               'tavuk',               '🍗', 3, true),
        ('Simit & Börek',       'simit-borek',         '🥐', 4, true),
        ('Giyim & Moda',        'giyim-moda',          '👗', 5, true),
        ('Elektronik',          'elektronik',          '📱', 6, true),
        ('Mağazalar',           'magazalar',           '🏬', 7, true)
    `);
    log("seedDemoVendors: vendor categories ready");

    /* — 2. Delivery Vendors — */
    await db.execute(sql`
      INSERT INTO vendors (name, slug, description, image_url, cover_url, phone, city, district, working_hours, min_order_amount, delivery_fee, delivery_time, rating, review_count, is_open, featured, active, vendor_type, owner_name) VALUES
      (
        'Burger King', 'burger-king',
        'Dünyaca ünlü fast-food zinciri. Whopper, Big King ve daha fazlası.',
        'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=80',
        'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=1200&q=80',
        '+90 850 222 5464', 'İstanbul', 'Kadıköy', '08:00-23:00', 50, 9.90, 30, 4.5, 2150,
        false, true, true, 'delivery', 'Yekpare Partner'
      ),
      (
        'Domino''s Pizza', 'dominos-pizza',
        'Türkiye''nin en sevilen pizza zinciri. 30 dakikada teslim garantisi.',
        'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&q=80',
        'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=1200&q=80',
        '+90 444 3 696', 'İstanbul', 'Beşiktaş', '10:00-23:59', 60, 12.90, 35, 4.4, 1890,
        false, true, true, 'delivery', 'Yekpare Partner'
      ),
      (
        'Tavuk Dünyası', 'tavuk-dunyasi',
        'Türkiye''nin lider tavuk zinciri. Izgara, kanat, nugget ve çok daha fazlası.',
        'https://images.unsplash.com/photo-1562967914-608f82629710?w=400&q=80',
        'https://images.unsplash.com/photo-1562967914-608f82629710?w=1200&q=80',
        '+90 444 8 888', 'Ankara', 'Çankaya', '10:00-22:00', 45, 8.90, 25, 4.6, 3240,
        false, true, true, 'delivery', 'Yekpare Partner'
      ),
      (
        'Simit Sarayı', 'simit-sarayi',
        'Türkiye''nin simgesi simit ve geleneksel lezzetler. Kahvaltıdan akşama.',
        'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&q=80',
        'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=1200&q=80',
        '+90 444 7 647', 'İstanbul', 'Sultanahmet', '07:00-22:00', 30, 5.90, 20, 4.7, 4120,
        false, true, true, 'delivery', 'Yekpare Partner'
      )
    `);
    log("seedDemoVendors: delivery vendors inserted");

    /* — 3. Ecommerce Vendors — */
    await db.execute(sql`
      INSERT INTO vendors (name, slug, description, image_url, cover_url, phone, city, district, working_hours, min_order_amount, shipping_fee, shipping_time, free_shipping_above, rating, review_count, is_open, featured, active, vendor_type, owner_name) VALUES
      (
        'LC Waikiki', 'lc-waikiki',
        'Türkiye''nin en büyük hazır giyim markası. Modaya uygun, uygun fiyatlı koleksiyonlar.',
        'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?w=400&q=80',
        'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?w=1200&q=80',
        '+90 444 0 528', 'İstanbul', 'Bağcılar', '09:00-22:00', 0, 29.90, 3, 200,
        4.3, 5670, false, true, true, 'ecommerce', 'Yekpare Partner'
      ),
      (
        'Teknosa', 'teknosa',
        'Türkiye''nin önde gelen teknoloji ve elektronik zinciri. Garantili ürünler.',
        'https://images.unsplash.com/photo-1573666033935-0bf7bb387acf?w=400&q=80',
        'https://images.unsplash.com/photo-1573666033935-0bf7bb387acf?w=1200&q=80',
        '+90 444 8 366', 'İstanbul', 'Bağcılar', '09:00-22:00', 0, 39.90, 3, 500,
        4.5, 3890, false, true, true, 'ecommerce', 'Yekpare Partner'
      ),
      (
        'Boyner', 'boyner',
        'Türkiye''nin köklü alışveriş markası. Giyim, ev ve yaşam ürünleri.',
        'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=400&q=80',
        'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=1200&q=80',
        '+90 444 0 269', 'İstanbul', 'Kadıköy', '09:00-22:00', 0, 24.90, 3, 300,
        4.4, 2760, false, true, true, 'ecommerce', 'Yekpare Partner'
      )
    `);
    log("seedDemoVendors: ecommerce vendors inserted");

    /* — 4. Menu Categories & Items for Delivery Vendors — */
    const vendorsRes = await db.execute<{ id: number; slug: string; vendor_type: string }>(
      sql`SELECT id, slug, vendor_type FROM vendors ORDER BY id`
    );
    const vendors = r<{ id: number; slug: string; vendor_type: string }>(vendorsRes);
    const vMap: Record<string, number> = {};
    for (const v of vendors) vMap[v.slug] = v.id;

    if (vMap['burger-king']) {
      await db.execute(sql`
        INSERT INTO vendor_menu_categories (vendor_id, name, position, active) VALUES
          (${vMap['burger-king']}, 'Burgerler', 1, true),
          (${vMap['burger-king']}, 'Menüler', 2, true),
          (${vMap['burger-king']}, 'Yan Ürünler', 3, true),
          (${vMap['burger-king']}, 'İçecekler', 4, true)
      `);
      const catsRes0 = await db.execute<{ id: number; name: string }>(
        sql`SELECT id, name FROM vendor_menu_categories WHERE vendor_id = ${vMap['burger-king']} ORDER BY id`
      );
      const [burgersId, menuId, sidesId, drinksId] = r<{id: number}>(catsRes0).map(c => c.id);
      await db.execute(sql`
        INSERT INTO vendor_menu_items (vendor_id, menu_category_id, name, description, price, sale_price, image_url, active, is_popular) VALUES
          (${vMap['burger-king']}, ${burgersId}, 'Whopper', 'Büyük boy ızgara köfte, domates, marul, turşu, soğan ile', 149.90, null, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=80', true, true),
          (${vMap['burger-king']}, ${burgersId}, 'Big King XXL', 'Çift katlı özel soslu büyük burger', 179.90, null, 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=400&q=80', true, true),
          (${vMap['burger-king']}, ${burgersId}, 'Crispy Chicken Burger', 'Çıtır tavuklu özel sos ve sebzeler ile', 134.90, null, 'https://images.unsplash.com/photo-1562967914-608f82629710?w=400&q=80', true, false),
          (${vMap['burger-king']}, ${menuId}, 'Whopper Menü', 'Whopper + Orta Boy Patates + İçecek', 209.90, 189.90, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=80', true, true),
          (${vMap['burger-king']}, ${sidesId}, 'Patates Kızartması (Büyük)', 'Çıtır altın sarısı patates', 44.90, null, 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400&q=80', true, false),
          (${vMap['burger-king']}, ${sidesId}, 'Soğan Halkası', 'Çıtır soğan halkası porsiyonu', 39.90, null, 'https://images.unsplash.com/photo-1604152135912-04a022e23696?w=400&q=80', true, false),
          (${vMap['burger-king']}, ${drinksId}, 'Kola (Büyük)', 'Soğuk içecek, 450ml', 29.90, null, 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&q=80', true, false)
      `);
    }

    if (vMap['dominos-pizza']) {
      await db.execute(sql`
        INSERT INTO vendor_menu_categories (vendor_id, name, position, active) VALUES
          (${vMap['dominos-pizza']}, 'Pizzalar', 1, true),
          (${vMap['dominos-pizza']}, 'Kampanyalar', 2, true),
          (${vMap['dominos-pizza']}, 'Yan Ürünler', 3, true),
          (${vMap['dominos-pizza']}, 'İçecekler', 4, true)
      `);
      const catsRes1 = await db.execute<{ id: number }>(
        sql`SELECT id FROM vendor_menu_categories WHERE vendor_id = ${vMap['dominos-pizza']} ORDER BY id`
      );
      const [pizzaId, kampId, sidesId, drinksId] = r<{id: number}>(catsRes1).map(c => c.id);
      await db.execute(sql`
        INSERT INTO vendor_menu_items (vendor_id, menu_category_id, name, description, price, sale_price, image_url, active, is_popular) VALUES
          (${vMap['dominos-pizza']}, ${pizzaId}, 'Pepperoni Pizza (Büyük)', 'Özel domates sos, bol mozzarella, pepperoni', 289.90, null, 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&q=80', true, true),
          (${vMap['dominos-pizza']}, ${pizzaId}, 'Karışık Pizza (Büyük)', 'Sucuk, sosis, mantar, biber, mısır', 309.90, null, 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&q=80', true, true),
          (${vMap['dominos-pizza']}, ${pizzaId}, 'Vejeteryan Pizza (Orta)', 'Taze sebzeler, özel sos', 219.90, null, 'https://images.unsplash.com/photo-1595854341625-f33ee10dbf9f?w=400&q=80', true, false),
          (${vMap['dominos-pizza']}, ${kampId}, '2 Büyük Pizza Kampanyası', '2 büyük pizza seçiminize göre', 499.90, 449.90, 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&q=80', true, true),
          (${vMap['dominos-pizza']}, ${sidesId}, 'Garlic Bread', 'Sarımsaklı ekmek 4''lü', 69.90, null, 'https://images.unsplash.com/photo-1619096252214-ef06c45683e3?w=400&q=80', true, false),
          (${vMap['dominos-pizza']}, ${drinksId}, 'Kola 1L', 'Soğuk kola şişesi', 39.90, null, 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&q=80', true, false)
      `);
    }

    if (vMap['tavuk-dunyasi']) {
      await db.execute(sql`
        INSERT INTO vendor_menu_categories (vendor_id, name, position, active) VALUES
          (${vMap['tavuk-dunyasi']}, 'Izgara Ürünler', 1, true),
          (${vMap['tavuk-dunyasi']}, 'Kanatlar', 2, true),
          (${vMap['tavuk-dunyasi']}, 'Menüler', 3, true),
          (${vMap['tavuk-dunyasi']}, 'İçecekler', 4, true)
      `);
      const catsRes2 = await db.execute<{ id: number }>(
        sql`SELECT id FROM vendor_menu_categories WHERE vendor_id = ${vMap['tavuk-dunyasi']} ORDER BY id`
      );
      const [izgId, kanatId, menuId, drinksId] = r<{id: number}>(catsRes2).map(c => c.id);
      await db.execute(sql`
        INSERT INTO vendor_menu_items (vendor_id, menu_category_id, name, description, price, sale_price, image_url, active, is_popular) VALUES
          (${vMap['tavuk-dunyasi']}, ${izgId}, 'Izgara Tavuk', 'Marine edilmiş ızgara tavuk göğsü', 139.90, null, 'https://images.unsplash.com/photo-1562967914-608f82629710?w=400&q=80', true, true),
          (${vMap['tavuk-dunyasi']}, ${izgId}, 'Tavuk Şiş', '3 şiş ızgara tavuk parça', 149.90, null, 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&q=80', true, true),
          (${vMap['tavuk-dunyasi']}, ${kanatId}, 'Çıtır Kanat (8 Adet)', 'Baharatlı çıtır tavuk kanadı', 124.90, null, 'https://images.unsplash.com/photo-1527477396000-e27163b481c2?w=400&q=80', true, true),
          (${vMap['tavuk-dunyasi']}, ${menuId}, 'Izgara Tavuk Menü', 'Izgara tavuk + pilav + salata + içecek', 189.90, 169.90, 'https://images.unsplash.com/photo-1562967914-608f82629710?w=400&q=80', true, true),
          (${vMap['tavuk-dunyasi']}, ${drinksId}, 'Ayran', 'Ev yapımı taze ayran', 19.90, null, 'https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?w=400&q=80', true, false)
      `);
    }

    if (vMap['simit-sarayi']) {
      await db.execute(sql`
        INSERT INTO vendor_menu_categories (vendor_id, name, position, active) VALUES
          (${vMap['simit-sarayi']}, 'Simitler', 1, true),
          (${vMap['simit-sarayi']}, 'Kahvaltı', 2, true),
          (${vMap['simit-sarayi']}, 'Poğaça & Börek', 3, true),
          (${vMap['simit-sarayi']}, 'İçecekler', 4, true)
      `);
      const catsRes3 = await db.execute<{ id: number }>(
        sql`SELECT id FROM vendor_menu_categories WHERE vendor_id = ${vMap['simit-sarayi']} ORDER BY id`
      );
      const [simitId, kahvId, pogId, drinksId] = r<{id: number}>(catsRes3).map(c => c.id);
      await db.execute(sql`
        INSERT INTO vendor_menu_items (vendor_id, menu_category_id, name, description, price, sale_price, image_url, active, is_popular) VALUES
          (${vMap['simit-sarayi']}, ${simitId}, 'Simit', 'Taze pişmiş susam simit', 12.90, null, 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&q=80', true, true),
          (${vMap['simit-sarayi']}, ${simitId}, 'Simit + Peynir', 'Simit ve beyaz peynir', 29.90, null, 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&q=80', true, true),
          (${vMap['simit-sarayi']}, ${kahvId}, 'Kahvaltı Tabağı', 'Peynir, zeytin, domates, salatalık, yumurta', 89.90, null, 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=400&q=80', true, true),
          (${vMap['simit-sarayi']}, ${pogId}, 'Patatesli Poğaça', 'Taze pişmiş patatesli poğaça', 24.90, null, 'https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=400&q=80', true, false),
          (${vMap['simit-sarayi']}, ${pogId}, 'Ispanaklı Börek', 'El açması ıspanaklı börek dilimi', 34.90, null, 'https://images.unsplash.com/photo-1541014741259-de529411b96a?w=400&q=80', true, false),
          (${vMap['simit-sarayi']}, ${drinksId}, 'Çay', 'Demlik çay', 9.90, null, 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&q=80', true, false)
      `);
    }

    /* — 5. Menu Categories & Items for E-Commerce Vendors — */
    if (vMap['lc-waikiki']) {
      await db.execute(sql`
        INSERT INTO vendor_menu_categories (vendor_id, name, position, active) VALUES
          (${vMap['lc-waikiki']}, 'Erkek Giyim', 1, true),
          (${vMap['lc-waikiki']}, 'Kadın Giyim', 2, true),
          (${vMap['lc-waikiki']}, 'Çocuk Giyim', 3, true),
          (${vMap['lc-waikiki']}, 'Ayakkabı & Aksesuar', 4, true)
      `);
      const catsRes4 = await db.execute<{id: number}>(
        sql`SELECT id FROM vendor_menu_categories WHERE vendor_id = ${vMap['lc-waikiki']} ORDER BY id`
      );
      const [erkekId, kadinId, cocukId, ayakkId] = r<{id: number}>(catsRes4).map(c => c.id);
      await db.execute(sql`
        INSERT INTO vendor_menu_items (vendor_id, menu_category_id, name, description, price, sale_price, image_url, active, is_popular, sku, stock) VALUES
          (${vMap['lc-waikiki']}, ${erkekId}, 'Erkek Slim Fit Jean', 'Slim fit kesim, yüksek kaliteli denim kumaş.', 349.99, 249.99, 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&q=80', true, true, 'LCW-E001', 50),
          (${vMap['lc-waikiki']}, ${erkekId}, 'Erkek Basic T-Shirt', 'Pamuklu basic erkek tişört. 5 renk seçeneği.', 149.99, 99.99, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&q=80', true, false, 'LCW-E002', 80),
          (${vMap['lc-waikiki']}, ${kadinId}, 'Kadın Oversize Sweatshirt', 'Rahat kesim, yumuşak içlik kumaş. Modern şehir stili.', 279.99, 199.99, 'https://images.unsplash.com/photo-1578681994506-b8f463449011?w=400&q=80', true, true, 'LCW-K001', 35),
          (${vMap['lc-waikiki']}, ${kadinId}, 'Kadın Floral Elbise', 'Çiçek desenli midi boy elbise. Yaz koleksiyonu.', 319.99, null, 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=400&q=80', true, false, 'LCW-K002', 25),
          (${vMap['lc-waikiki']}, ${cocukId}, 'Çocuk Takım Elbise (3-7 Yaş)', 'Şık çocuk takım elbise seti.', 189.99, null, 'https://images.unsplash.com/photo-1503944583220-79d8926ad5e2?w=400&q=80', true, false, 'LCW-C001', 20),
          (${vMap['lc-waikiki']}, ${ayakkId}, 'Unisex Spor Ayakkabı', 'Hafif ve esnek yapısıyla günlük kullanım için ideal.', 449.99, 349.99, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80', true, true, 'LCW-A001', 30)
      `);
    }

    if (vMap['teknosa']) {
      await db.execute(sql`
        INSERT INTO vendor_menu_categories (vendor_id, name, position, active) VALUES
          (${vMap['teknosa']}, 'Akıllı Telefon', 1, true),
          (${vMap['teknosa']}, 'Bilgisayar & Tablet', 2, true),
          (${vMap['teknosa']}, 'Ses Sistemleri', 3, true),
          (${vMap['teknosa']}, 'Aksesuarlar', 4, true)
      `);
      const catsRes5 = await db.execute<{id: number}>(
        sql`SELECT id FROM vendor_menu_categories WHERE vendor_id = ${vMap['teknosa']} ORDER BY id`
      );
      const [telefonId, bilgId, sesId, akseId] = r<{id: number}>(catsRes5).map(c => c.id);
      await db.execute(sql`
        INSERT INTO vendor_menu_items (vendor_id, menu_category_id, name, description, price, sale_price, image_url, active, is_popular, sku, stock) VALUES
          (${vMap['teknosa']}, ${telefonId}, 'Samsung Galaxy A55 5G', '8GB RAM, 256GB. 50MP kamera, 5000mAh batarya.', 17999.00, 15999.00, 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&q=80', true, true, 'TKN-T001', 15),
          (${vMap['teknosa']}, ${telefonId}, 'iPhone 15 128GB', 'Apple A16 Bionic, Dynamic Island, USB-C.', 44999.00, 42999.00, 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=400&q=80', true, true, 'TKN-T002', 10),
          (${vMap['teknosa']}, ${bilgId}, 'Lenovo IdeaPad Gaming Laptop', 'Intel i7, RTX 3060, 16GB RAM, 512GB SSD.', 34999.00, 31999.00, 'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=400&q=80', true, true, 'TKN-B001', 8),
          (${vMap['teknosa']}, ${bilgId}, 'Apple iPad 10. Nesil 64GB', '10.9 inç Liquid Retina, A14 Bionic.', 19999.00, null, 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400&q=80', true, false, 'TKN-B002', 10),
          (${vMap['teknosa']}, ${sesId}, 'Sony WH-1000XM5 Kulaklık', 'Piyasanın en iyi aktif gürültü önleyici özelliği.', 8999.00, 7499.00, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&q=80', true, true, 'TKN-S001', 12),
          (${vMap['teknosa']}, ${akseId}, 'Anker 65W USB-C Şarj Cihazı', 'Hızlı şarj, 3 port, GaN teknolojisi.', 899.00, 749.00, 'https://images.unsplash.com/photo-1621974919766-f7b9bdace6d4?w=400&q=80', true, false, 'TKN-A001', 30)
      `);
    }

    if (vMap['boyner']) {
      await db.execute(sql`
        INSERT INTO vendor_menu_categories (vendor_id, name, position, active) VALUES
          (${vMap['boyner']}, 'Erkek Giyim', 1, true),
          (${vMap['boyner']}, 'Parfüm & Bakım', 2, true),
          (${vMap['boyner']}, 'Ayakkabı', 3, true),
          (${vMap['boyner']}, 'Markalar', 4, true)
      `);
      const catsRes6 = await db.execute<{id: number}>(
        sql`SELECT id FROM vendor_menu_categories WHERE vendor_id = ${vMap['boyner']} ORDER BY id`
      );
      const [erkekBId, parfumId, ayakkBId, markId] = r<{id: number}>(catsRes6).map(c => c.id);
      await db.execute(sql`
        INSERT INTO vendor_menu_items (vendor_id, menu_category_id, name, description, price, sale_price, image_url, active, is_popular, sku, stock, brand) VALUES
          (${vMap['boyner']}, ${erkekBId}, 'Tommy Hilfiger Erkek Gömlek', 'Slim fit erkek gömlek. %100 pamuk. Tommy Hilfiger logolu.', 1299.00, 899.00, 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=400&q=80', true, true, 'BYN-E001', 25, 'Tommy Hilfiger'),
          (${vMap['boyner']}, ${erkekBId}, 'Levi''s 501 Original Jean', 'İkonik 501 straight fit jean. Klasik 5 cep tasarımı.', 1799.00, null, 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&q=80', true, false, 'BYN-E002', 15, 'Levi''s'),
          (${vMap['boyner']}, ${parfumId}, 'Calvin Klein Eternity 100ml', 'Odunsu ve baharatlı notalar. Erkek parfümü.', 1899.00, 1499.00, 'https://images.unsplash.com/photo-1541643600914-78b084683702?w=400&q=80', true, true, 'BYN-P001', 18, 'Calvin Klein'),
          (${vMap['boyner']}, ${ayakkBId}, 'Adidas Originals Stan Smith', 'İkonik Stan Smith sneaker. Deri üst, lastik taban.', 2299.00, 1899.00, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80', true, true, 'BYN-A001', 20, 'Adidas'),
          (${vMap['boyner']}, ${markId}, 'Nike Air Max 270', 'Maksimum yastıklama ile günlük kullanım için ideal.', 3499.00, 2999.00, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80', true, false, 'BYN-M001', 12, 'Nike')
      `);
    }

    /* — 6. Map Premium İşletme Girişleri — */
    const restCatId = 'd4883fc2-8f1e-423c-841a-cc0963a79803';
    const marketCatId = '17c87525-ac12-43c8-a101-b14537b94c2a';
    const vendorMap = [
      { slug: 'burger-king',   mapSlug: 'burger-king-map',   name: 'Burger King',   cat: restCatId,   lat: 40.9912, lng: 29.0306, city: 'İstanbul', addr: 'Bağdat Cd. No:45, Kadıköy, İstanbul', superCat: 'siparis' },
      { slug: 'dominos-pizza', mapSlug: 'dominos-pizza-map', name: "Domino's Pizza", cat: restCatId,   lat: 41.0434, lng: 29.0080, city: 'İstanbul', addr: 'Barbaros Blv. No:12, Beşiktaş, İstanbul', superCat: 'siparis' },
      { slug: 'tavuk-dunyasi', mapSlug: 'tavuk-dunyasi-map', name: 'Tavuk Dünyası',  cat: restCatId,   lat: 39.9201, lng: 32.8543, city: 'Ankara',   addr: 'Ziya Gökalp Cd. No:31, Çankaya, Ankara', superCat: 'siparis' },
      { slug: 'simit-sarayi',  mapSlug: 'simit-sarayi-map',  name: 'Simit Sarayı',  cat: restCatId,   lat: 41.0055, lng: 28.9777, city: 'İstanbul', addr: 'Divan Yolu Cd. No:1, Fatih, İstanbul', superCat: 'siparis' },
      { slug: 'lc-waikiki',    mapSlug: 'lc-waikiki-map',    name: 'LC Waikiki',    cat: marketCatId, lat: 41.0648, lng: 28.8374, city: 'İstanbul', addr: 'Güneşli Mah. Atatürk Cd. No:1, Bağcılar, İstanbul', superCat: 'alisveris' },
      { slug: 'teknosa',       mapSlug: 'teknosa-map',       name: 'Teknosa',       cat: marketCatId, lat: 41.0618, lng: 28.8372, city: 'İstanbul', addr: 'Güneşli Mah. Atatürk Cd. No:21, Bağcılar, İstanbul', superCat: 'alisveris' },
      { slug: 'boyner',        mapSlug: 'boyner-map',        name: 'Boyner',        cat: marketCatId, lat: 40.9876, lng: 29.0249, city: 'İstanbul', addr: 'Bağdat Cd. No:100, Kadıköy, İstanbul', superCat: 'alisveris' },
    ];

    for (const v of vendorMap) {
      const vendorId = vMap[v.slug];
      if (!vendorId) continue;
      const insertRes = await db.execute<{ id: string }>(sql`
        INSERT INTO map_businesses (
          name, slug, category_id, address, city_id, phone, rating, user_ratings_total,
          photo_url, cover_photo_url, latitude, longitude, is_active, is_premium, description,
          has_delivery, has_online_order, homepage_featured, homepage_super_category, store_type, vendor_id
        ) VALUES (
          ${v.name}, ${v.mapSlug}, ${v.cat},
          ${v.addr}, null, '+90 444 0 000',
          4.5, 1500,
          'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80',
          'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=1200&q=80',
          ${v.lat}, ${v.lng},
          true, true,
          ${v.name + ' — Yekpare iş ortağı. Yakında tam hizmete giriyor.'},
          ${v.superCat === 'siparis'}, ${v.superCat === 'alisveris'},
          true, ${v.superCat}, ${v.superCat}, ${vendorId}
        ) RETURNING id
      `);
      const mapBizId = r<{id: string}>(insertRes)[0]?.id;
      if (mapBizId) {
        await db.execute(sql`UPDATE vendors SET notes = ${mapBizId} WHERE id = ${vendorId}`);
      }
    }
    log("seedDemoVendors: map premium entries inserted");
    log("seedDemoVendors: complete — 7 vendors, menu items, products, map entries ready");
  } catch (err) {
    logger ? logger.error({ err }, "seedDemoVendors failed") : console.error("seedDemoVendors failed", err);
  }
}

/** Tek satır: Geliver denemesi için onaylı e‑ticaret mağaza + şifre + örnek ürünler (slug sabit). */
export async function seedGeliverDemoVendorIfNeeded(logger?: { info: (msg: string, obj?: object) => void; error: (obj: object, msg: string) => void }) {
  const log = (msg: string) => (logger ? logger.info(msg, {}) : console.log(msg));
  if (!isDemoSeedAllowed()) {
    log("seedGeliverDemoVendor: skipped (production — set ENABLE_DEMO_SEED=1 to override)");
    return;
  }
  const DEMO_PASSWORD = geliverDemoPassword();
  if (!DEMO_PASSWORD) {
    log("seedGeliverDemoVendor: skipped (set GELIVER_DEMO_PASSWORD for demo seed)");
    return;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = <T>(res: any): T[] => (res.rows ?? res) as T[];

  const DEMO_SLUG = "geliver-demo-magaza";
  /** Panel girişi — yalnızca dev/demo seed. */
  const DEMO_OWNER_EMAIL = "geliver.demo@yekpare.demo";

  try {
    await db.execute(sql`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS password_hash TEXT`);
    await db.execute(sql`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS geliver_api_token TEXT`);
    await db.execute(sql`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS geliver_sender_address_id TEXT`);
    await db.execute(sql`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS geliver_sender_zip TEXT`);
    await db.execute(sql`
      ALTER TABLE vendors ADD COLUMN IF NOT EXISTS geliver_auto_ship_on_order BOOLEAN NOT NULL DEFAULT false
    `);

    const exists = r<{ id: number }>(
      await db.execute(sql`SELECT id FROM vendors WHERE slug = ${DEMO_SLUG} LIMIT 1`),
    );
    if (exists[0]) {
      const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
      await db.execute(sql`
        UPDATE vendors SET
          owner_email = ${DEMO_OWNER_EMAIL},
          email = ${DEMO_OWNER_EMAIL},
          provider_type = 'alisveris',
          application_status = 'approved',
          password_hash = ${passwordHash},
          updated_at = NOW()
        WHERE slug = ${DEMO_SLUG}
      `);
      log(`seedGeliverDemoVendor: '${DEMO_SLUG}' giriş bilgileri güncellendi (${DEMO_OWNER_EMAIL})`);
      return;
    }

    const catTry = r<{ id: number }>(
      await db.execute(sql`SELECT id FROM vendor_categories WHERE slug = 'elektronik' LIMIT 1`),
    );
    const categoryId = catTry[0]?.id ?? null;

    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

    const ins = r<{ id: number }>(
      await db.execute(sql`
        INSERT INTO vendors (
          name, slug, description, category_id, vendor_type,
          image_url, cover_url, phone, email, address, city, district,
          lat, lng, working_hours,
          min_order_amount, shipping_fee, shipping_time, free_shipping_above,
          rating, review_count, is_open, featured, active,
          owner_name, owner_email, whatsapp,
          provider_type, provider_subtype, application_status,
          verified_at,
          revenue_model, password_hash,
          geliver_sender_zip, geliver_auto_ship_on_order
        ) VALUES (
          'Geliver Demo Mağaza',
          ${DEMO_SLUG},
          'Geliver kargo ve vitrin denemesi için örnek mağaza. Panelden API anahtarınızı girin.',
          ${categoryId},
          'ecommerce',
          'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&q=80',
          'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200&q=80',
          '+905551112233',
          ${DEMO_OWNER_EMAIL},
          'Merkez Mah. Demo Sok. No:1',
          'İstanbul',
          'Esenyurt',
          41.048,
          28.897,
          '09:00-21:00',
          0, 29.90, 3, 499,
          4.9, 24, true, false, true,
          'Demo Geliver Yetkilisi',
          ${DEMO_OWNER_EMAIL},
          '+905551112233',
          'alisveris',
          'elektronik',
          'approved',
          NOW(),
          'subscription',
          ${passwordHash},
          '34000',
          true
        )
        RETURNING id
      `),
    );

    const vid = ins[0]?.id;
    if (!vid) {
      log("seedGeliverDemoVendor: INSERT başarısız");
      return;
    }

    await db.execute(sql`
      INSERT INTO vendor_menu_categories (vendor_id, name, position, active) VALUES
        (${vid}, 'Paket Ürünler', 1, true),
        (${vid}, 'Aksesuar', 2, true)
    `);
    const cats = r<{ id: number }>(
      await db.execute(sql`SELECT id FROM vendor_menu_categories WHERE vendor_id = ${vid} ORDER BY id`),
    );
    const catPaket = cats[0]?.id;
    const catAks = cats[1]?.id;
    if (!catPaket || !catAks) {
      log("seedGeliverDemoVendor: kategori oluşturulamadı");
      return;
    }

    await db.execute(sql`
      INSERT INTO vendor_menu_items (
        vendor_id, menu_category_id, name, description, price, sale_price, image_url, active, is_popular, stock
      ) VALUES
        (${vid}, ${catPaket}, 'Demo Bluetooth Kulaklık',
          'Kablosuz, ENC mikrofon. Geliver ile gönderim denemesi için uygun hafif paket.',
          899.00, 749.00,
          'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&q=80',
          true, true, 40),
        (${vid}, ${catPaket}, 'Demo Taşınabilir Şarj Cihazı',
          '10000 mAh, USB-C. Hediye paketi seçeneği.',
          449.00, null,
          'https://images.unsplash.com/photo-1621974919766-f7b9bdace6d4?w=400&q=80',
          true, true, 60),
        (${vid}, ${catPaket}, 'Demo Akıllı Saat',
          'Adım, nabız, uyku takibi. Kutulu gönderim.',
          1299.00, 1199.00,
          'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=400&q=80',
          true, false, 15),
        (${vid}, ${catAks}, 'Demo Telefon Kılıfı',
          'Şeffaf silikon, çok model uyumlu.',
          149.00, null,
          'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=400&q=80',
          true, false, 100),
        (${vid}, ${catAks}, 'USB-C Kablo 2m',
          'Hızlı şarj destekli örgül kablo.',
          199.00, 159.00,
          'https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?w=400&q=80',
          true, false, 80)
    `);

    log(`seedGeliverDemoVendor: mağaza eklendi slug=${DEMO_SLUG} owner_email=${DEMO_OWNER_EMAIL}`);
  } catch (err) {
    logger ? logger.error({ err }, "seedGeliverDemoVendor failed") : console.error("seedGeliverDemoVendor failed", err);
  }
}

export async function seedImeceMarketplaceIfNeeded(logger?: { info: (msg: string, obj?: object) => void; error: (obj: object, msg: string) => void }) {
  const log = (msg: string, obj?: object) => (logger ? logger.info(msg, obj ?? {}) : console.log(msg, obj ?? ""));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = <T>(res: any): T[] => (res.rows ?? res) as T[];

  const categories = [
    { name: "Kahvaltılık", slug: "supermarket-ve-gida-temel-gida-kahvaltilik", oldSlugs: ["imece-kahvaltilik", "kahvaltilik", "supermarket-kahvaltilik"], position: 6, parentSlug: "supermarket-ve-gida-temel-gida" },
    { name: "Zeytin & Zeytinyağı", slug: "supermarket-ve-gida-temel-gida-zeytin-ve-zeytinyagi", oldSlugs: ["imece-zeytin-zeytinyagi", "zeytin-zeytinyagi", "supermarket-zeytin-ve-zeytinyagi"], position: 7, parentSlug: "supermarket-ve-gida-temel-gida" },
    { name: "Bakliyat", slug: "supermarket-ve-gida-temel-gida-bakliyat", oldSlugs: ["imece-bakliyat", "bakliyat", "supermarket-bakliyat"], position: 2, parentSlug: "supermarket-ve-gida-temel-gida" },
    { name: "Reçel & Bal", slug: "supermarket-ve-gida-atistirmaliklar-recel-ve-bal", oldSlugs: ["imece-recel-bal", "recel-bal", "supermarket-recel-ve-bal"], position: 5, parentSlug: "supermarket-ve-gida-atistirmaliklar" },
    { name: "Kuruyemiş", slug: "supermarket-ve-gida-atistirmaliklar-kuruyemis", oldSlugs: ["imece-kuruyemis", "kuruyemis", "supermarket-kuruyemis"], position: 2, parentSlug: "supermarket-ve-gida-atistirmaliklar" },
    { name: "Baharat", slug: "supermarket-ve-gida-temel-gida-baharat", oldSlugs: ["imece-baharat", "baharat", "supermarket-baharat"], position: 8, parentSlug: "supermarket-ve-gida-temel-gida" },
    { name: "İçecek", slug: "supermarket-ve-gida-atistirmaliklar-icecek", oldSlugs: ["imece-icecek", "icecek", "supermarket-icecek"], position: 6, parentSlug: "supermarket-ve-gida-atistirmaliklar" },
    { name: "Doğal Temizlik", slug: "supermarket-ve-gida-temizlik-urunleri-dogal-temizlik", oldSlugs: ["imece-dogal-temizlik", "dogal-temizlik", "supermarket-dogal-temizlik"], position: 5, parentSlug: "supermarket-ve-gida-temizlik-urunleri" },
    { name: "Kişisel Bakım", slug: "kozmetik-ve-kisisel-bakim-saglik-ve-hijyen-kisisel-bakim", oldSlugs: ["imece-kisisel-bakim", "kisisel-bakim", "kozmetik-kisisel-bakim"], position: 4, parentSlug: "kozmetik-ve-kisisel-bakim-saglik-ve-hijyen" },
    { name: "Hediyelik", slug: "kitap-muzik-film-ve-hobi-hobi-ve-sanat-hediyelik", oldSlugs: ["imece-hediyelik", "hediyelik", "hediyelik-esya-urunleri-ozel-gun-hediyeleri"], position: 5, parentSlug: "kitap-muzik-film-ve-hobi-hobi-ve-sanat" },
  ];

  const products = [
    {
      name: "İmece Organik Köy Peyniri",
      categorySlug: "supermarket-ve-gida-temel-gida-kahvaltilik",
      description: "Geleneksel yöntemle hazırlanmış tam yağlı köy peyniri.",
      price: "189.90",
      salePrice: "169.90",
      imageUrl: "https://images.unsplash.com/photo-1452195100486-9cc805987862?w=500&q=80",
      isPopular: true,
      stock: 45,
    },
    {
      name: "İmece Soğuk Sıkım Zeytinyağı 1L",
      categorySlug: "supermarket-ve-gida-temel-gida-zeytin-ve-zeytinyagi",
      description: "Erken hasat, düşük asitli natürel sızma zeytinyağı.",
      price: "349.90",
      salePrice: null,
      imageUrl: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500&q=80",
      isPopular: true,
      stock: 60,
    },
    {
      name: "İmece Yerli Nohut 1kg",
      categorySlug: "supermarket-ve-gida-temel-gida-bakliyat",
      description: "Anadolu üreticisinden iri taneli yerli nohut.",
      price: "84.90",
      salePrice: null,
      imageUrl: "https://images.unsplash.com/photo-1515543904379-3d757afe72e4?w=500&q=80",
      isPopular: false,
      stock: 120,
    },
    {
      name: "İmece Çiçek Balı 850g",
      categorySlug: "supermarket-ve-gida-atistirmaliklar-recel-ve-bal",
      description: "Yüksek yaylalardan süzme çiçek balı.",
      price: "279.90",
      salePrice: "249.90",
      imageUrl: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=500&q=80",
      isPopular: true,
      stock: 35,
    },
    {
      name: "İmece Kavrulmuş Badem 500g",
      categorySlug: "supermarket-ve-gida-atistirmaliklar-kuruyemis",
      description: "Taze kavrulmuş, tuzsuz yerli badem.",
      price: "229.90",
      salePrice: null,
      imageUrl: "https://images.unsplash.com/photo-1508747703725-719777637510?w=500&q=80",
      isPopular: false,
      stock: 55,
    },
    {
      name: "İmece İsot Baharatı 250g",
      categorySlug: "supermarket-ve-gida-temel-gida-baharat",
      description: "Urfa yöresinden doğal kurutma isot.",
      price: "89.90",
      salePrice: "74.90",
      imageUrl: "https://images.unsplash.com/photo-1532336414038-cf19250c5757?w=500&q=80",
      isPopular: false,
      stock: 70,
    },
    {
      name: "İmece Doğal Elma Sirkesi 500ml",
      categorySlug: "supermarket-ve-gida-atistirmaliklar-icecek",
      description: "Katkısız, geleneksel fermantasyon elma sirkesi.",
      price: "69.90",
      salePrice: null,
      imageUrl: "https://images.unsplash.com/photo-1603073163308-9654c3fb70b5?w=500&q=80",
      isPopular: false,
      stock: 80,
    },
    {
      name: "İmece Zeytinyağlı Sabun 4'lü",
      categorySlug: "supermarket-ve-gida-temizlik-urunleri-dogal-temizlik",
      description: "El yapımı zeytinyağlı doğal sabun seti.",
      price: "119.90",
      salePrice: "99.90",
      imageUrl: "https://images.unsplash.com/photo-1607006483224-3e4cefcaf344?w=500&q=80",
      isPopular: true,
      stock: 65,
    },
    {
      name: "İmece Lavanta Kolonyası 400ml",
      categorySlug: "kozmetik-ve-kisisel-bakim-saglik-ve-hijyen-kisisel-bakim",
      description: "Ferahlık veren lavanta esanslı kolonya.",
      price: "94.90",
      salePrice: null,
      imageUrl: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=500&q=80",
      isPopular: false,
      stock: 90,
    },
    {
      name: "İmece Yerel Lezzet Hediye Kutusu",
      categorySlug: "kitap-muzik-film-ve-hobi-hobi-ve-sanat-hediyelik",
      description: "Seçili yerel ürünlerden hazırlanmış hediye paketi.",
      price: "499.90",
      salePrice: "449.90",
      imageUrl: "https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=500&q=80",
      isPopular: true,
      stock: 25,
    },
  ];

  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ecommerce_product_categories (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        parent_id INTEGER REFERENCES ecommerce_product_categories(id) ON DELETE SET NULL,
        position INTEGER NOT NULL DEFAULT 0,
        active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      ALTER TABLE vendor_menu_items
        ADD COLUMN IF NOT EXISTS ecommerce_category_id INTEGER REFERENCES ecommerce_product_categories(id) ON DELETE SET NULL;
      ALTER TABLE vendor_menu_categories
        ADD COLUMN IF NOT EXISTS ecommerce_category_id INTEGER REFERENCES ecommerce_product_categories(id) ON DELETE SET NULL;
      ALTER TABLE vendor_menu_categories
        ADD COLUMN IF NOT EXISTS is_custom BOOLEAN NOT NULL DEFAULT false;
    `);
    await seedEcommerceProductCategoriesIfNeeded();

    const vendorCategoryRows = r<{ id: number }>(
      await db.execute(sql`
        INSERT INTO vendor_categories (name, slug, icon, position, active, super_category)
        VALUES ('İmece Pazarı', 'imece-pazari', '🛒', 18, true, 'alisveris')
        ON CONFLICT (slug) DO UPDATE SET
          name = EXCLUDED.name,
          icon = EXCLUDED.icon,
          active = true,
          super_category = 'alisveris'
        RETURNING id
      `),
    );
    const vendorCategoryId = vendorCategoryRows[0]?.id ?? null;

    const existingVendor = r<{ id: number }>(
      await db.execute(sql`
        SELECT id
        FROM vendors
        WHERE slug IN ('imece', 'imece-magaza', 'imece-pazari')
          OR name ILIKE '%imece%'
          OR name ILIKE '%İmece%'
        ORDER BY active DESC, id ASC
        LIMIT 1
      `),
    );

    let vendorId = existingVendor[0]?.id ? Number(existingVendor[0].id) : null;
    if (vendorId) {
      await db.execute(sql`
        UPDATE vendors SET
          category_id = COALESCE(category_id, ${vendorCategoryId}),
          vendor_type = 'ecommerce',
          description = COALESCE(NULLIF(description, ''), 'İmece üreticilerinden doğal ve yerel ürünler.'),
          image_url = COALESCE(NULLIF(image_url, ''), 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&q=80'),
          cover_url = COALESCE(NULLIF(cover_url, ''), 'https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=1200&q=80'),
          city = COALESCE(NULLIF(city, ''), 'İstanbul'),
          district = COALESCE(NULLIF(district, ''), 'Kadıköy'),
          shipping_fee = COALESCE(shipping_fee, 29.90),
          shipping_time = COALESCE(shipping_time, 2),
          free_shipping_above = COALESCE(free_shipping_above, 500),
          rating = GREATEST(COALESCE(rating, 0), 4.8),
          review_count = GREATEST(COALESCE(review_count, 0), 128),
          is_open = true,
          featured = true,
          active = true,
          updated_at = NOW()
        WHERE id = ${vendorId}
      `);
    } else {
      const inserted = r<{ id: number }>(
        await db.execute(sql`
          INSERT INTO vendors (
            name, slug, description, category_id, vendor_type,
            image_url, cover_url, phone, city, district, working_hours,
            min_order_amount, shipping_fee, shipping_time, free_shipping_above,
            rating, review_count, is_open, featured, active, owner_name
          ) VALUES (
            'İmece', 'imece',
            'İmece üreticilerinden doğal ve yerel ürünler.',
            ${vendorCategoryId}, 'ecommerce',
            'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&q=80',
            'https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=1200&q=80',
            '+90 850 000 4632', 'İstanbul', 'Kadıköy', '09:00-20:00',
            0, 29.90, 2, 500,
            4.8, 128, true, true, true, 'İmece Ekibi'
          )
          RETURNING id
        `),
      );
      vendorId = inserted[0]?.id ? Number(inserted[0].id) : null;
    }

    if (!vendorId) {
      log("seedImeceMarketplace: İmece mağazası oluşturulamadı");
      return;
    }

    const categoryIdBySlug = new Map<string, number>();
    const menuCategoryIdBySlug = new Map<string, number>();
    for (const cat of categories) {
      const parentCategory = r<{ id: number }>(
        await db.execute(sql`
          SELECT id FROM ecommerce_product_categories
          WHERE slug = ${cat.parentSlug}
          LIMIT 1
        `),
      )[0];
      const parentId = parentCategory?.id ? Number(parentCategory.id) : null;

      for (const oldSlug of cat.oldSlugs) {
        const oldCategory = r<{ id: number }>(
          await db.execute(sql`
            SELECT id FROM ecommerce_product_categories
            WHERE slug = ${oldSlug}
            LIMIT 1
          `),
        )[0];
        if (!oldCategory?.id) continue;

        const newCategory = r<{ id: number }>(
          await db.execute(sql`
            SELECT id FROM ecommerce_product_categories
            WHERE slug = ${cat.slug}
            LIMIT 1
          `),
        )[0];

        const oldId = Number(oldCategory.id);
        const newId = newCategory?.id ? Number(newCategory.id) : null;
        if (newId && newId !== oldId) {
          await db.execute(sql`
            UPDATE vendor_menu_items
            SET ecommerce_category_id = ${newId}
            WHERE ecommerce_category_id = ${oldId}
          `);
          await db.execute(sql`
            UPDATE vendor_menu_categories
            SET ecommerce_category_id = ${newId}, name = ${cat.name}
            WHERE ecommerce_category_id = ${oldId}
          `);
          await db.execute(sql`
            UPDATE ecommerce_product_categories
            SET active = false
            WHERE id = ${oldId}
          `);
        } else {
          await db.execute(sql`
            UPDATE ecommerce_product_categories SET
              name = ${cat.name},
              slug = ${cat.slug},
              parent_id = ${parentId},
              position = ${cat.position},
              active = true
            WHERE id = ${oldId}
          `);
        }
      }

      const catRows = r<{ id: number }>(
        await db.execute(sql`
          INSERT INTO ecommerce_product_categories (name, slug, parent_id, position, active)
          VALUES (${cat.name}, ${cat.slug}, ${parentId}, ${cat.position}, true)
          ON CONFLICT (slug) DO UPDATE SET
            name = EXCLUDED.name,
            parent_id = EXCLUDED.parent_id,
            position = EXCLUDED.position,
            active = true
          RETURNING id
        `),
      );
      const ecommerceCategoryId = Number(catRows[0]?.id ?? 0);
      if (!ecommerceCategoryId) continue;
      categoryIdBySlug.set(cat.slug, ecommerceCategoryId);

      const existingMenuCat = r<{ id: number }>(
        await db.execute(sql`
          SELECT id FROM vendor_menu_categories
          WHERE vendor_id = ${vendorId}
            AND ecommerce_category_id = ${ecommerceCategoryId}
            AND active = true
          LIMIT 1
        `),
      );
      let menuCategoryId = existingMenuCat[0]?.id ? Number(existingMenuCat[0].id) : null;
      if (!menuCategoryId) {
        const insertedMenuCat = r<{ id: number }>(
          await db.execute(sql`
            INSERT INTO vendor_menu_categories (vendor_id, name, position, active, ecommerce_category_id, is_custom)
            VALUES (${vendorId}, ${cat.name}, ${Math.abs(cat.position)}, true, ${ecommerceCategoryId}, false)
            RETURNING id
          `),
        );
        menuCategoryId = insertedMenuCat[0]?.id ? Number(insertedMenuCat[0].id) : null;
      } else {
        await db.execute(sql`
          UPDATE vendor_menu_categories SET
            name = ${cat.name},
            position = ${Math.abs(cat.position)},
            ecommerce_category_id = ${ecommerceCategoryId},
            active = true
          WHERE id = ${menuCategoryId}
        `);
      }
      if (menuCategoryId) menuCategoryIdBySlug.set(cat.slug, menuCategoryId);
    }

    const seedImeceDemoProducts =
      process.env.NODE_ENV !== "production" && process.env.ENABLE_IMECE_DEMO_PRODUCTS === "1";
    if (!seedImeceDemoProducts) {
      for (const product of products) {
        await db.execute(sql`
          DELETE FROM vendor_menu_items
          WHERE vendor_id = ${vendorId}
            AND LOWER(name) = LOWER(${product.name})
        `);
      }
      log("seedImeceMarketplace: İmece categories ready; sample products disabled", {
        vendorId,
        categories: categories.length,
        products: 0,
      });
      return;
    }

    for (const product of products) {
      const ecommerceCategoryId = categoryIdBySlug.get(product.categorySlug) ?? null;
      const menuCategoryId = menuCategoryIdBySlug.get(product.categorySlug) ?? null;
      const existingProduct = r<{ id: number }>(
        await db.execute(sql`
          SELECT id FROM vendor_menu_items
          WHERE vendor_id = ${vendorId} AND LOWER(name) = LOWER(${product.name})
          LIMIT 1
        `),
      );
      if (existingProduct[0]?.id) {
        await db.execute(sql`
          UPDATE vendor_menu_items SET
            menu_category_id = ${menuCategoryId},
            ecommerce_category_id = ${ecommerceCategoryId},
            description = ${product.description},
            price = ${product.price},
            sale_price = ${product.salePrice},
            image_url = ${product.imageUrl},
            active = true,
            is_popular = ${product.isPopular},
            stock = ${product.stock},
            updated_at = NOW()
          WHERE id = ${existingProduct[0].id}
        `);
      } else {
        await db.execute(sql`
          INSERT INTO vendor_menu_items (
            vendor_id, menu_category_id, ecommerce_category_id, name, description,
            price, sale_price, image_url, active, is_popular, stock
          ) VALUES (
            ${vendorId}, ${menuCategoryId}, ${ecommerceCategoryId}, ${product.name}, ${product.description},
            ${product.price}, ${product.salePrice}, ${product.imageUrl}, true, ${product.isPopular}, ${product.stock}
          )
        `);
      }
    }

    log("seedImeceMarketplace: İmece categories and demo products ready", {
      vendorId,
      categories: categories.length,
      products: products.length,
    });
  } catch (err) {
    logger ? logger.error({ err }, "seedImeceMarketplace failed") : console.error("seedImeceMarketplace failed", err);
  }
}
