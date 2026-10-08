# Site topic, category and distribution rules (HM PHP news sites)
Updated 2026-10-08 20:35 TRT by the catfill executor. The machine-readable copy is site-topics.json in the same folder and in the repo (importer-v5/site-topics.json).
Classifier: importer-v5/classifier.py. The AI Haber Editörü (f8c22352) and every importer must use these rules.

## Never
- Corporate sites never get news or RSS, and are never fan-out targets:
  - TÜRKATA Vakfı (tukav/tr, id 61)
  - Vatan Kahramanları Derneği (vkd, id 7)
  - Trafik Güvenliği Derneği (trafik, id 11)
  - any php-kurumsal, VKD or VATAN themed site
- kirsehirhaber.org (229) is suspended.
- vatanhaber.net (1): never Hüseyin Akın, Anadolu Çınarları Partisi or AÇI Partisi. The site-1 hm_site_blocked_terms are applied to everything written to sites 1 and 230, because vatanhaber reads pool 230.
- Off-topic items are HIDDEN (hm_site_content_hidden), never deleted.

## Topic sites (only these topics; everything else hidden)
| site | id | only |
|---|---|---|
| sehitgazi.org.tr | 232 | şehit, gazi, asker, MSB, TSK, emniyet/jandarma/polis/güvenlik güçleri, şehit aileleri, gaziler ve dernekleri |
| turksav.org | 233 | savunma sanayii, MSB, Genelkurmay, savunma haberleri |
| yesilvatan.gen.tr | 236 | doğa, ekoloji, orman, tarım, yenilenebilir enerji, çevre |
| dunyasaglik.org | 237 | sağlık |
| fix.tc | 1142 | teknoloji: haberler, mobil, donanım, incelemeler, yazılım, oyun |
| yerel.net.tr | 231 | local news only: must name a province or district, or belediye/muhtar/vali/kaymakam/köy/mahalle. Menu: region tabs with province sub-tabs |
| regional *.gundemi.org | 1133 ege, 1134 marmara, 1135 karadeniz, 1136 icanadolu, 1137 doguanadolu, 1138 guneydogu, 1139 akdeniz, 1140 kibris | only news that names a province or district of that region |

These sites have layout_json.hmNewsRssSources = [], so they show only their own rows and never the general pool 230.

## General news sites: category tree (pool 230 feeds all of them; at least 10 on-topic items with images each)
- **Siyaset:** cumhurbaskanligi, bakanliklar, tbmm, siyasi-partiler, genel-merkez, il-ilce-baskanliklari
  - **Bakanlıklar tabs:** bakanlik-aile, bakanlik-saglik, bakanlik-milli-egitim, bakanlik-icisleri, bakanlik-adalet, bakanlik-disisleri, bakanlik-hazine, bakanlik-calisma, bakanlik-tarim, bakanlik-ulastirma, bakanlik-enerji, bakanlik-sanayi, bakanlik-cevre, bakanlik-ticaret, bakanlik-kultur-turizm, bakanlik-genclik-spor, bakanlik-msb
  - Keyword rules use the ministry name or "Bakan <surname>": Tekin → Milli Eğitim, Bolat → Ticaret, Fidan → Dışişleri, Göktaş → Aile, Kacır → Sanayi, Şimşek → Hazine, Yerlikaya → İçişleri, Tunç → Adalet, Işıkhan → Çalışma, Yumaklı → Tarım, Uraloğlu → Ulaştırma, Bayraktar → Enerji, Kurum → Çevre, Ersoy → Kültür Turizm, Bak → Gençlik Spor, Güler → MSB, Memişoğlu → Sağlık.
- **Kamu:** kamu-kurumlari, mulki-idare, valilikler, kaymakamliklar, guvenlik
  - **Güvenlik tabs:**
    - tsk: TSK, MSB, Kara, Hava and Deniz Kuvvetleri, Sahil Güvenlik, Genelkurmay, tatbikat, harekat
    - emniyet: emniyet, polis, EGM, narkotik
    - jandarma
    - savunma-sanayi: SSB, ASELSAN, ROKETSAN, TUSAŞ, Baykar, HAVELSAN, MKE, STM, FNSS, Otokar, KAAN, HÜRJET, SİHA, füze
- **STK:** toplum-ve-yasam, sivil-toplum-kuruluslari
- **Yerel Yönetimler:** buyuksehir-ve-iller, ilceler, belediye, muhtar
  - turkatahaber /kategori/yerel-yonetimler takes ONLY belediye, büyükşehir and muhtar news. Sources: Cumha RSS, plus the haberler.com/belediye and haberler.com/muhtar listing pages with the source credited.
- **Dünya:** nato, uluslararasi-kuruluslar, birlesmis-milletler, avrupa-birligi
- **Yerel:** region tabs bolge-marmara, bolge-ege, bolge-akdeniz, bolge-ic-anadolu, bolge-karadeniz, bolge-dogu-anadolu, bolge-guneydogu-anadolu, each with province tabs.
  - A province item gets category_slug = <province slug> (izmir, ankara, sanliurfa...), region_key = 'tr-<province slug>' and region_label = <Province>.
  - Its region comes from the province table in site-topics.json (provinces.<slug>.region).
  - A region tab item must name at least one province or district of that region.

## Strict classification (recategorizer + importers + AI editor)
1. Keyword and source rules. The title counts 3x, spot/lead 1x. CAT_RULES apply per category: an item stays in a strict category only if its rule matches.
2. City and region rule: a province category (ankara, izmir, gundemi-*-<city>) keeps an item only if its TITLE or SPOT names the province or one of its districts. The district list is importer-v5/districts.json.
3. AI chain, only for ambiguous items: evren (deepseek-v4-flash) → nvidia (nemotron lightning) → gemini (flash-lite) → openai (nano).
4. Move to the correct category when the site has one. Otherwise, or when the item is off-topic for the site, hide it on that site.
   - Live HM items cannot be moved from the PHP side. They are hidden on the site when they sit in a wrong strict category.

## Cross-distribution (topic sites → general sites, pool 230)
- Rows from topic sites are copied to pool 230 under the matching category, deduped per site:
  - 232 and 233 defense/security → savunma-sanayi, tsk, emniyet, jandarma, guvenlik
  - 236 → bakanlik-tarim when the ministry is named, otherwise gundem
  - 237 → saglik
  - 1142 → teknoloji
  - 231 local → the province slug or bolge-*
- Never to corporate sites. The vatanhaber ban applies.

## Jobs (VPS 187.77.84.201, /docker/php-theme/importer-v5)
- catfill.py: fill and daily importer.
  - Crons: /etc/cron.d/php-theme-importer-catfill runs targets 4x a day; the panel feeds run hourly.
  - Targets come from mktargets.py → targets.json. Target keys: cat_rule, city, region, topic, src_cats; feeds can be "db:<site>" or "scrape:<listing url>".
- recat_job.py: hourly at :17 (/etc/cron.d/php-theme-recat). Moves and hides rss rows. Log: /var/log/php-theme/recat.log.
- guard_live.py: every 20 min (/etc/cron.d/php-theme-guard). Hides off-topic live HM items and editor news. Log: /var/log/php-theme/guard-live.log.

## Spor branches + kibris.gundemi.org (spor-kibris executor, 2026-10-08)
- General sites: Spor has 13 branch tabs (CategoryTree::SPOR): futbol, basketbol, voleybol, hentbol, gures, atletizm, tenis, yuzme, motor-sporlari, dovus-sporlari, e-spor, amator-spor, engelli-sporlari. /kategori/spor aggregates all branches.
  - classifier topic = spor for every branch. Branch regexes live in /docker/php-theme/spor-kibris/targets-spk.json. Hourly :37 spk_redistribute.py moves pool `spor` rows into a branch (MOVE only).
  - Do NOT recat a branch row back to `spor`.
- 1140 kibris.gundemi.org: own categories kibris-gundem, kibris-ekonomi, kibris-guney, kibris-spor, kibris-egitim, kibris-kultur-sanat, plus the 4 gundemi-kibris-* cities. It also has open sections `turkiye` and `dunya`, filled by spor-kibris targets.
  - All of these are keep (classifier block "spor-kibris", REGION_OPEN_CATS/REGION_OWN_PREFIX). Never TO_POOL them.
  - Manşet = Kıbrıs only (hm_ai_editor_sites topic_rule; Topic priority keywords).
  - Kıbrıs/KKTC news is also copied into pool 230 `dunya` for general sites.

## 2026-10-08 21:00–21:35 — "Dağıt, gizleme" (redistribute, don't hide) — applies to importers, recategorizer, guard and AI Haber Editörü
- An item that is off-topic for a topic/regional/local site (sehitgazi 232, turksav 233, yesilvatan 236, dunyasaglik 237, yerel.net.tr 231, regional gundemi.org 1133–1140) is **moved** to the shared general pool (portal_rss_items.site_id = 230) under its correct category (classifier.pool_target): topic → sub-category (Siyaset/Kamu/Güvenlik/Dünya trees, ministries), province category for single-province local news (region_key/label set), else Gündem. General news sites show it; the topic site does not.
- **Allowed hide reasons only:** duplicate (same story already in the pool), no image (after an og:image retry), banned (vatanhaber terms: Hüseyin Akın / Anadolu Çınarları / AÇI Partisi / AÇİP), junk/spam (dizi izle/fragman/kimdir/kaç yaşında/bahis…). Reasons are stored as `recat_keep:<reason>` / `unhide_keep:<reason>`.
- **Never hidden:** a site's own editor content (is_editor_manual, authored items, columns/köşe yazıları) and Yazarlar content. On topic sites, network items (site NULL) and fan-out copies from other sites that are off-topic are kept off that site only (`offsite_network:*`); they stay visible on the general sites.
- **Importer topic gate:** per-site panel importer runs for topic/regional/local sites go through importer-v5/gate_run.py, which skips off-topic items before insert (haberler.com tag feeds fall back to general news when the tag is quiet).
- **Yeşil Vatan strict lexicon** (classifier.CEVRE_STRICT): doğa, çevre, ekoloji, orman, iklim, tarım/çiftçi/hayvancılık, deniz/balıkçılık, yenilenebilir enerji, sürdürülebilirlik. Excluded false positives: bare "çevre" prefix (çevresinde), "yaban" (yabancı), "toprak" (surname), "baraj" (seçim barajı), "fon", politics, sport, crime and series. An item with a strong sport/politics/crime/world/tech topic and no green term in the title is rejected.
- sehitgazi/turksav: spot-only matches need 2 hits (one "polis" in the spot is not security news).
- 'Amatör Spor Haftası' stories → pool 230, category amator-spor (spor-kibris block).
