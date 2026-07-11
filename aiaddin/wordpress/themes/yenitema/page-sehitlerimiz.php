<?php
/**
 * Template Name: Şehitlerimiz
 * Template Post Type: page
 */
get_header();
if (function_exists('vkv_breadcrumb')) vkv_breadcrumb();
if (have_posts()) { the_post(); }
/* ══════════════════════════════════════════════════
   202 ŞEHİT VERİ TABANI — Resim URL'leri dahil
══════════════════════════════════════════════════ */
/* Gerçek resim kaynağı — proxy üzerinden servis edilir */
if (!defined('VKD_IMG_BASE')) define('VKD_IMG_BASE', 'https://www.mehmetcik.org.tr/uploads/sayfaResim/');
/* Proxy endpoint — hotlink korumasını sunucu tarafında aşar */
define('VKD_PROXY_URL', rest_url('vkv/v1/img'));
function vkd_sehit_listesi() {
    return [
        /* ad | rutbe | tarih | şehir | yıl | resim_dosyası */
        // ── 2025 ──────────────────────────────────────────
        ['ad'=>'Eyüp GÜNER',                    'rutbe'=>'P. Er',          'tarih'=>'17/10/2025','sehir'=>'GAZİANTEP',       'yil'=>2025,'img'=>'952383-p.-er-eyup-guner-17.10.2025-gaziantep.jpg'],
        ['ad'=>'Hayrullah Halit KARAMAN',        'rutbe'=>'Mhf. Er',        'tarih'=>'25/07/2025','sehir'=>'İSTANBUL',        'yil'=>2025,'img'=>'287243-mhf.-er-hayrullah-halit-karaman-25.07.2025-.jpg'],
        ['ad'=>'Semih ERDOĞAN',                  'rutbe'=>'İkm. Er',        'tarih'=>'25/07/2025','sehir'=>'GİRESUN',         'yil'=>2025,'img'=>'645045-km.-er-semih-erdogan-25.07.2025-giresun.jpg'],
        // ── 2024 ──────────────────────────────────────────
        ['ad'=>'Uğurcan IŞIK',                   'rutbe'=>'P. Er',          'tarih'=>'22/08/2024','sehir'=>'MALATYA',         'yil'=>2024,'img'=>'110728-p.-er-ugurcan-isik-22.08.2024-malatya.png'],
        // ── 2023 ──────────────────────────────────────────
        ['ad'=>'Eren TAŞKIN',                    'rutbe'=>'P. Er',          'tarih'=>'06/02/2023','sehir'=>'İZMİR',           'yil'=>2023,'img'=>'653118-erentaskin06022023.jpeg'],
        ['ad'=>'Mert Can SÜMBÜL',                'rutbe'=>'P. Er',          'tarih'=>'06/02/2023','sehir'=>'ÇORUM',           'yil'=>2023,'img'=>'117927-mertcansunbul06022023.jpeg'],
        ['ad'=>'Halil SELTAN',                   'rutbe'=>'İkm. Er',        'tarih'=>'04/01/2023','sehir'=>'HATAY',           'yil'=>2023,'img'=>'491690-halilseltan05012023.jpeg'],
        // ── 2022 ──────────────────────────────────────────
        ['ad'=>'Yusuf SOFİOĞLU',                 'rutbe'=>'P. Er',          'tarih'=>'02/08/2022','sehir'=>'DİYARBAKIR',      'yil'=>2022,'img'=>'354361-yusuf_sofio__lu_02082022_diyarbakir.jpeg'],
        ['ad'=>'Yusuf GÜRLER',                   'rutbe'=>'P. Er',          'tarih'=>'05/07/2022','sehir'=>'ŞANLIURFA',       'yil'=>2022,'img'=>'394792-yusuf_gurler_05072022_sanliurfa.jpeg'],
        ['ad'=>'Oktay SALAR',                    'rutbe'=>'P. Er',          'tarih'=>'12/05/2022','sehir'=>'BALIKESİR',       'yil'=>2022,'img'=>'355482-oktay_salar_12052022_balikesir.jpeg'],
        ['ad'=>'Tarık TARCAN',                   'rutbe'=>'P. Er',          'tarih'=>'02/02/2022','sehir'=>'ESKİŞEHİR',       'yil'=>2022,'img'=>'42229-tarik_tarcan_02022022_eskisehir.jpeg'],
        ['ad'=>'Enes KOÇ',                       'rutbe'=>'P. Onb.',        'tarih'=>'09/01/2022','sehir'=>'İSTANBUL',        'yil'=>2022,'img'=>'848072-enes_koc_08012022_istanbul.jpeg'],
        // ── 2021 ──────────────────────────────────────────
        ['ad'=>'Rıdvan SAĞDIÇ',                  'rutbe'=>'P. Er',          'tarih'=>'10/06/2021','sehir'=>'TEKİRDAĞ',        'yil'=>2021,'img'=>'322533-ridvan_sagdic_10062021_tekirdag.jpeg'],
        ['ad'=>'Tevfik Yasin KESER',             'rutbe'=>'Ulş. Er',        'tarih'=>'08/04/2021','sehir'=>'İZMİR',           'yil'=>2021,'img'=>'821882-tevfik_yasin_keser_08042021_izmir.jpeg'],
        ['ad'=>'Müslüm ALTINTAŞ',                'rutbe'=>'P. Er',          'tarih'=>'14/02/2021','sehir'=>'ŞANLIURFA',       'yil'=>2021,'img'=>'201077-muslum_altintas_14022021_gaziantep.jpeg'],
        ['ad'=>'Adil KABAKLI',                   'rutbe'=>'Tnk. Er',        'tarih'=>'14/02/2021','sehir'=>'OSMANİYE',        'yil'=>2021,'img'=>'240585-adil_kabakli_14022021_gaziantep.jpeg'],
        ['ad'=>'Sedat SORGUN',                   'rutbe'=>'J. Er',          'tarih'=>'14/02/2021','sehir'=>'ERZURUM',         'yil'=>2021,'img'=>'922129-sedat_sorgun_14022021_erzurum.jpeg'],
        ['ad'=>'Süleyman SUNGUR',                'rutbe'=>'J. Er',          'tarih'=>'14/02/2021','sehir'=>'SİİRT',           'yil'=>2021,'img'=>'645359-suleyman_sungur_14022021_siirt.jpeg'],
        ['ad'=>'Selim GEDİK',                    'rutbe'=>'P. Er',          'tarih'=>'24/01/2021','sehir'=>'SAKARYA',         'yil'=>2021,'img'=>'274172-selim_gedik_24012021_sakarya.jpeg'],
        // ── 2020 ──────────────────────────────────────────
        ['ad'=>'Volkan SOY',                     'rutbe'=>'Dz. Elk.',       'tarih'=>'14/10/2020','sehir'=>'KARS',            'yil'=>2020,'img'=>'984780-volkan_soy_14102020_kars.jpeg'],
        ['ad'=>'Cihat ŞENGİL',                   'rutbe'=>'Ulş. Er',        'tarih'=>'26/08/2020','sehir'=>'SAMSUN',          'yil'=>2020,'img'=>'109886-cihat_sendil_26082020_samsun.jpeg'],
        ['ad'=>'Caner MAYENDAĞI',                'rutbe'=>'Ulş. Er',        'tarih'=>'27/07/2020','sehir'=>'SAMSUN',          'yil'=>2020,'img'=>'23780-caner_mayendagi_27072020_samsun_.jpeg'],
        ['ad'=>'Kerim ARSLAN',                   'rutbe'=>'Ulş. Er',        'tarih'=>'27/07/2020','sehir'=>'KIRIKKALE',       'yil'=>2020,'img'=>'872496-kerim_arslan_27072020_k__r__kkale.jpeg'],
        ['ad'=>'Mustafa DAĞLI',                  'rutbe'=>'Ulş. Er',        'tarih'=>'27/07/2020','sehir'=>'MERSİN',          'yil'=>2020,'img'=>'332141-mustafa_dagli_27072020_mersin.jpeg'],
        ['ad'=>'Samet ÇALDIR',                   'rutbe'=>'Ulş. Er',        'tarih'=>'27/07/2020','sehir'=>'MUŞ',             'yil'=>2020,'img'=>'655715-samet_caldir_27072020_mus.jpeg'],
        ['ad'=>'Mehmet GÜNAY',                   'rutbe'=>'P. Er',          'tarih'=>'30/05/2020','sehir'=>'HATAY',           'yil'=>2020,'img'=>'811182-mehmet_gunay_30_05_2020_hatay.jpeg'],
        ['ad'=>'Abdullah ÇAM',                   'rutbe'=>'P. Er',          'tarih'=>'18/04/2020','sehir'=>'MARDİN',          'yil'=>2020,'img'=>'163640-abdullah___am_18_04_2020_mard__n.jpeg'],
        // ── 2019 ──────────────────────────────────────────
        ['ad'=>'Zekeriya ALTUNOK',               'rutbe'=>'İs. Er',         'tarih'=>'22/10/2019','sehir'=>'YOZGAT',          'yil'=>2019,'img'=>'670469-zekeriya_altunok__22_10_2019__yozgat.png'],
        ['ad'=>'Sezai EKŞİOĞLU',                 'rutbe'=>'P. Er',          'tarih'=>'20/10/2019','sehir'=>'ERZURUM',         'yil'=>2019,'img'=>'966632-sezaie__k__o__lu20_10_2019erzurum.jpeg'],
        ['ad'=>'Onur YAVAN',                     'rutbe'=>'P. Onb.',        'tarih'=>'13/10/2019','sehir'=>'SAMSUN',          'yil'=>2019,'img'=>'736250-onur_yavan__13_10_2019__samsun.jpeg'],
        ['ad'=>'Oğuzhan ERDOĞAN',                'rutbe'=>'Ulş. Er',        'tarih'=>'10/10/2019','sehir'=>'BALIKESİR',       'yil'=>2019,'img'=>'751947-o__uzhan_erdo__an__10_ekim_2019__s__vas.png'],
        ['ad'=>'Mehmet Emin KOTANOĞLU',          'rutbe'=>'P. Er',          'tarih'=>'07/10/2019','sehir'=>'ERZURUM',         'yil'=>2019,'img'=>'653726-mehmet_emin_kotano__lu__07_10_2019__erzurum.jpeg'],
        ['ad'=>'Erhan GÜRBÜZ',                   'rutbe'=>'P. Er',          'tarih'=>'04/10/2019','sehir'=>'AĞRI',            'yil'=>2019,'img'=>'360556-erhan_g__rb__z__04_10_2019__a__ri.jpeg'],
        ['ad'=>'Mustafa ÖNLEMEÇ',                'rutbe'=>'P. Onb.',        'tarih'=>'27/06/2019','sehir'=>'ISPARTA',         'yil'=>2019,'img'=>'225715-mustafa_inlemec_27062019_isparta.png'],
        ['ad'=>'Muhammed İslam ALTUĞ',           'rutbe'=>'J. Onb.',        'tarih'=>'24/06/2019','sehir'=>'YALOVA',          'yil'=>2019,'img'=>'270814-muhammed_islam_altug_24062019_yalova.png'],
        ['ad'=>'Mehmet KAYA',                    'rutbe'=>'P. Er',          'tarih'=>'06/04/2019','sehir'=>'SİİRT',           'yil'=>2019,'img'=>'864368-mehmet_kaya_06042019_siirt.jpeg'],
        ['ad'=>'Uğur ÇAKMAK',                    'rutbe'=>'P. Er',          'tarih'=>'04/03/2019','sehir'=>'BALIKESİR',       'yil'=>2019,'img'=>'750947-ugur___akmak__04_03_2019__balikes__r.jpeg'],
        // ── 2018 ──────────────────────────────────────────
        ['ad'=>'Melih SANCAR',                   'rutbe'=>'Top. Er',        'tarih'=>'09/11/2018','sehir'=>'ARTVİN',          'yil'=>2018,'img'=>'723175-melih_sancar__09_11_20018__artv_n.118x142.jpeg'],
        ['ad'=>'Menduh ÇELİK',                   'rutbe'=>'Top. Er',        'tarih'=>'09/11/2018','sehir'=>'ŞANLIURFA',       'yil'=>2018,'img'=>'624913-menduh_cel_k__09_11_20018__anliurfa.118x142.jpeg'],
        ['ad'=>'Samat KAYMAKÇI',                 'rutbe'=>'Top. Er',        'tarih'=>'09/11/2018','sehir'=>'GAZİANTEP',       'yil'=>2018,'img'=>'188228-samat_kaymakci__09_11_20018_gaz_antep.118x142.jpeg'],
        ['ad'=>'Mehmet KAŞIK',                   'rutbe'=>'Top. Çvş.',      'tarih'=>'09/11/2018','sehir'=>'KAHRAMANMARAŞ',   'yil'=>2018,'img'=>'794887-mehmet_ka_ik__09_11_20018__kahramanmara.118x142.jpeg'],
        ['ad'=>'İbrahim ÖZKUR',                  'rutbe'=>'Top. Er',        'tarih'=>'09/11/2018','sehir'=>'MUŞ',             'yil'=>2018,'img'=>'133510-ibrahim_uzkur__09_11_20018__mu.118x142.jpeg'],
        ['ad'=>'Yusuf ÖNDER',                    'rutbe'=>'Top. Er',        'tarih'=>'09/11/2018','sehir'=>'BURSA',           'yil'=>2018,'img'=>'833509-yusuf_under__09_11_20018__bursa.118x142.jpeg'],
        ['ad'=>'Hakan ATAN',                     'rutbe'=>'P. Er',          'tarih'=>'19/10/2018','sehir'=>'ADANA',           'yil'=>2018,'img'=>'350820-hakan_atan__19_10_2018__adana.118x142.jpeg'],
        ['ad'=>'Ebuzer ÖZYOLCİ',                 'rutbe'=>'Hv. Ulş. Onb.', 'tarih'=>'15/10/2018','sehir'=>'AĞRI',            'yil'=>2018,'img'=>'429228-ebuzer_ozyolci__15_10_2018__a_ri.118x142.jpeg'],
        ['ad'=>'Osman KARAĞLI',                  'rutbe'=>'P. Er',          'tarih'=>'28/08/2018','sehir'=>'KONYA',           'yil'=>2018,'img'=>'514174-osman_kara_li__28_08_2018__konya.118x142.jpeg'],
        ['ad'=>'İsa ERÇETİN',                    'rutbe'=>'Mu. Er',         'tarih'=>'28/08/2018','sehir'=>'İSTANBUL',        'yil'=>2018,'img'=>'923286-11__mu__er__isa_ercetin__28_08_2018__istanbul.118x142.jpeg'],
        ['ad'=>'Orhan Faruk BAYTEKİN',           'rutbe'=>'P. Er',          'tarih'=>'20/06/2018','sehir'=>'BALIKESİR',       'yil'=>2018,'img'=>'841468-orhan_faruk_baytekin__20_06_2018__balikesir.118x142.jpeg'],
        ['ad'=>'Çağatay Necati DİNÇ',            'rutbe'=>'İs. Onb.',       'tarih'=>'19/06/2018','sehir'=>'İZMİR',           'yil'=>2018,'img'=>'776493-ca_atay_necati_dinc__19_06_2018__izmir.118x142.jpeg'],
        ['ad'=>'Abdulselam HALAT',               'rutbe'=>'Top. Onb.',      'tarih'=>'14/06/2018','sehir'=>'ŞANLIURFA',       'yil'=>2018,'img'=>'411018-abdulselam_halat__14_06_2018__anliurfa.118x142.jpeg'],
        ['ad'=>'Şevki Eren YATKIN',              'rutbe'=>'P. Er',          'tarih'=>'08/06/2018','sehir'=>'KASTAMONU',       'yil'=>2018,'img'=>'762890-sevki_eren_yatkin__08_06_2018__kastamonu.118x142.jpeg'],
        ['ad'=>'Recep YILDIRIM',                 'rutbe'=>'Ulş. Er',        'tarih'=>'20/05/2018','sehir'=>'TOKAT',           'yil'=>2018,'img'=>'589455-recep_yildirim__20_05_2018_tokat.118x142.jpeg'],
        ['ad'=>'Sedat MEKAN',                    'rutbe'=>'P. Er',          'tarih'=>'29/04/2018','sehir'=>'SAMSUN',          'yil'=>2018,'img'=>'945876-sedat_mekan__29_04_2018__samsun.118x142.jpeg'],
        ['ad'=>'İlhami ÇELEBİ',                  'rutbe'=>'Mu. Er',         'tarih'=>'18/04/2018','sehir'=>'DİYARBAKIR',      'yil'=>2018,'img'=>'655020-ilhami_celebi__18_04_2018__diyarbakir.118x142.jpeg'],
        ['ad'=>'Baki AFŞAR',                     'rutbe'=>'P. Er',          'tarih'=>'16/04/2018','sehir'=>'ÇORUM',           'yil'=>2018,'img'=>'332411-baki_af_ar__16_04_2018__corum.118x142.jpeg'],
        ['ad'=>'Mehmet VOLKAN',                  'rutbe'=>'P. Onb.',        'tarih'=>'16/04/2018','sehir'=>'ADIYAMAN',        'yil'=>2018,'img'=>'494127-mehmet_volkan__16_04_2018__adiyaman.118x142.jpeg'],
        ['ad'=>'Yusuf YAVUZ',                    'rutbe'=>'P. Çvş.',        'tarih'=>'14/03/2018','sehir'=>'NİĞDE',           'yil'=>2018,'img'=>'802631-yusuf_yavuz__14_03_2018__ni_de.118x142.jpeg'],
        ['ad'=>'Ömer SARI',                      'rutbe'=>'J. Komd. Er',    'tarih'=>'02/03/2018','sehir'=>'AĞRI',            'yil'=>2018,'img'=>'709387-omersari.jpeg'],
        ['ad'=>'Ali AYDAR',                      'rutbe'=>'P. Onb.',        'tarih'=>'31/01/2018','sehir'=>'ŞANLIURFA',       'yil'=>2018,'img'=>'926440-ali_aydar_31012018_sanliurfa.118x142.jpeg'],
        // ── 2017 ──────────────────────────────────────────
        ['ad'=>'İdris GÜLEK',                    'rutbe'=>'J. Er',          'tarih'=>'25/12/2017','sehir'=>'VAN',             'yil'=>2017,'img'=>'916593-sehitjeridrisgulek25122017van.118x142.jpeg'],
        ['ad'=>'Ömer ÖZAVCI',                    'rutbe'=>'J. Er',          'tarih'=>'27/11/2017','sehir'=>'KOCAELİ',         'yil'=>2017,'img'=>'613667-sehitjeromerozavcikocaeli27112017.118x142.jpeg'],
        ['ad'=>'Suat SURKİ',                     'rutbe'=>'Tnk. Er',        'tarih'=>'15/11/2017','sehir'=>'VAN',             'yil'=>2017,'img'=>'821808-sehitersuatsurkivan15112017.118x142.jpeg'],
        ['ad'=>'Sefanur PARHAN',                 'rutbe'=>'Topçu Onb.',     'tarih'=>'25/10/2017','sehir'=>'ŞANLIURFA',       'yil'=>2017,'img'=>'167242-sehittoponbsefanurparhan25102017sanliurfa.118x142.jpeg'],
        ['ad'=>'Daha ÇELİK',                     'rutbe'=>'Mu. Onb.',       'tarih'=>'11/10/2017','sehir'=>'ERZURUM',         'yil'=>2017,'img'=>'496545-mu__onb__daha_celik__11_10_2017__erzurum.118x142.jpeg'],
        ['ad'=>'Ramazan ÖZMEN',                  'rutbe'=>'Ulş. Er',        'tarih'=>'08/10/2017','sehir'=>'KONYA',           'yil'=>2017,'img'=>'295661-ul___er_ramazan_ozmen__08_10_2017__konya.118x142.jpeg'],
        ['ad'=>'Onur SÜNNÜOĞLU',                 'rutbe'=>'J. Er',          'tarih'=>'11/07/2017','sehir'=>'GAZİANTEP',       'yil'=>2017,'img'=>'427948-j__er_onur_s_nn_oa_lu__11_07_2017__gaza_antep.118x142.jpeg'],
        ['ad'=>'Mümin PINARDAĞ',                 'rutbe'=>'J. Er',          'tarih'=>'11/07/2017','sehir'=>'BURSA',           'yil'=>2017,'img'=>'273340-j__er_m_1_4_min_pinardaa__11_07_2017__bursa.118x142.jpeg'],
        ['ad'=>'Hüseyin Tolga HEPGÜL',           'rutbe'=>'J. Er',          'tarih'=>'11/07/2017','sehir'=>'İZMİR',           'yil'=>2017,'img'=>'723441-j__er_h_1_4_seyin_tolga_hepg_l__11_07_2017__a_zma_r.118x142.jpeg'],
        ['ad'=>'Çınar TAŞ',                      'rutbe'=>'J. Er',          'tarih'=>'10/07/2017','sehir'=>'KAHRAMANMARAŞ',   'yil'=>2017,'img'=>'511276-j__er_a_nar_taa__10_07_2017__kahramanmaraa.118x142.jpeg'],
        ['ad'=>'Sinan HAMZA',                    'rutbe'=>'J. Komd. Er',    'tarih'=>'27/06/2017','sehir'=>'SAMSUN',          'yil'=>2017,'img'=>'369167-j__komd__er_sinan_hamza__27_06_2017__samsun.118x142.jpeg'],
        ['ad'=>'Muhammed Furkan DEMİREL',        'rutbe'=>'J. Komd. Er',    'tarih'=>'27/06/2017','sehir'=>'ANKARA',          'yil'=>2017,'img'=>'960965-j__komd__er_muhammed_furkan_demirel__27_06_2017__ankara.118x142.jpeg'],
        ['ad'=>'Harun AYDIN',                    'rutbe'=>'P. Onb.',        'tarih'=>'16/06/2017','sehir'=>'ANKARA',          'yil'=>2017,'img'=>'530656-sehitharunaydin16062017ankara.118x142.jpeg'],
        ['ad'=>'Sabır BİNEN',                    'rutbe'=>'P. Er',          'tarih'=>'14/06/2017','sehir'=>'DİYARBAKIR',      'yil'=>2017,'img'=>'455978-sehitsabirbinendiyarbakir14062017.118x142.jpeg'],
        ['ad'=>'Onur YAMAN',                     'rutbe'=>'Ulş. Er',        'tarih'=>'10/06/2017','sehir'=>'ANKARA',          'yil'=>2017,'img'=>'215836-sehiteronuryamanankara10062017.118x142.jpeg'],
        ['ad'=>'Hüsnü ÖZEL',                     'rutbe'=>'P. Er',          'tarih'=>'25/05/2017','sehir'=>'KIRŞEHİR',        'yil'=>2017,'img'=>'39170-sehitperhusnuozel25052017kirsehir.118x142.jpeg'],
        ['ad'=>'Reşit YILDIZ',                   'rutbe'=>'Tnk. Er',        'tarih'=>'24/05/2017','sehir'=>'DİYARBAKIR',      'yil'=>2017,'img'=>'95736-sehiterresityildiz24052017diyarbakir.118x142.jpeg'],
        ['ad'=>'Ümit ÇELİK',                     'rutbe'=>'P. Çvş.',        'tarih'=>'06/05/2017','sehir'=>'KIRIKKALE',       'yil'=>2017,'img'=>'188017-sehitpcvsumitcelik06052017kirikkale.118x142.jpeg'],
        ['ad'=>'Hüseyin KOROÇ',                  'rutbe'=>'P. Er',          'tarih'=>'22/03/2017','sehir'=>'ŞANLIURFA',       'yil'=>2017,'img'=>'598667-sehitperhuseyinkorocsanliurfa22032017.118x142.jpeg'],
        ['ad'=>'Hüseyin KARACA',                 'rutbe'=>'Dz. Er',         'tarih'=>'18/02/2017','sehir'=>'BURDUR',          'yil'=>2017,'img'=>'623514-sehitdzerhuseyinkaracaburdur18022017.118x142.jpeg'],
        ['ad'=>'Mesut YAŞAR',                    'rutbe'=>'Ulş. Er',        'tarih'=>'03/02/2017','sehir'=>'GAZİANTEP',       'yil'=>2017,'img'=>'784829-sehitulsermesutyasargaziantep03022017.118x142.jpeg'],
        // ── 2016 ──────────────────────────────────────────
        ['ad'=>'Ahmet TAŞ',                      'rutbe'=>'P. Onb.',        'tarih'=>'17/12/2016','sehir'=>'KIRŞEHİR',        'yil'=>2016,'img'=>'460797-sehitponbahmettaskirsehir171220161.118x142.jpeg'],
        ['ad'=>'Muhammed Ali OCAK',              'rutbe'=>'P. Onb.',        'tarih'=>'17/12/2016','sehir'=>'YOZGAT',          'yil'=>2016,'img'=>'69847-sehitponbaliocakyozgat17122016.118x142.jpeg'],
        ['ad'=>'Mustafa CİHAN',                  'rutbe'=>'P. Onb.',        'tarih'=>'17/12/2016','sehir'=>'OSMANİYE',        'yil'=>2016,'img'=>'381596-sehitponbmustafacihanosmaniye17122016.118x142.jpeg'],
        ['ad'=>'Hasan İLHAN',                    'rutbe'=>'Shh. Er',        'tarih'=>'17/12/2016','sehir'=>'DENİZLİ',         'yil'=>2016,'img'=>'484628-sehitshherhasanilhandenizli17122016.118x142.jpeg'],
        ['ad'=>'Kenan DÖNGEL',                   'rutbe'=>'İs. Er',         'tarih'=>'17/12/2016','sehir'=>'SİNOP',           'yil'=>2016,'img'=>'771443-sehitiserkenandongelsinop17122016.118x142.jpeg'],
        ['ad'=>'Kamil TUNÇ',                     'rutbe'=>'Shh. Er',        'tarih'=>'17/12/2016','sehir'=>'AFYONKARAHİSAR',  'yil'=>2016,'img'=>'953025-sehitshherkamiltuncafyon17122016.118x142.jpeg'],
        ['ad'=>'Uğur KORKMAZ',                   'rutbe'=>'İs. Er',         'tarih'=>'17/12/2016','sehir'=>'RİZE',            'yil'=>2016,'img'=>'632704-sehitiserugurkorkmazrize17122016.118x142.jpeg'],
        ['ad'=>'Göksal Mustafa AĞAÇYETİŞTİREN', 'rutbe'=>'Ulş. Çvş.',      'tarih'=>'17/12/2016','sehir'=>'SİNOP',           'yil'=>2016,'img'=>'331306-sehitulscvsmustafaagacyetistirensinop17122016.118x142.jpeg'],
        ['ad'=>'Abdulsamet ÖZEN',                'rutbe'=>'Mu. Onb.',       'tarih'=>'17/12/2016','sehir'=>'KOCAELİ',         'yil'=>2016,'img'=>'154111-sehitmuonbabdulsametozenkocaeli17122016.118x142.jpeg'],
        ['ad'=>'Raşit YÜCEL',                    'rutbe'=>'Ulş. Er',        'tarih'=>'17/12/2016','sehir'=>'ANKARA',          'yil'=>2016,'img'=>'970740-sehitulserrasityucelankara17122016.118x142.jpeg'],
        ['ad'=>'Arif TUĞ',                       'rutbe'=>'P. Çvş.',        'tarih'=>'17/12/2016','sehir'=>'ERZURUM',         'yil'=>2016,'img'=>'221885-sehitpcvsariftugerzurum17122016.118x142.jpeg'],
        ['ad'=>'Fehmi BARCIN',                   'rutbe'=>'P. Çvş.',        'tarih'=>'17/12/2016','sehir'=>'BURSA',           'yil'=>2016,'img'=>'946656-sehitpcvsfehmibarcinbursa17122016.118x142.jpeg'],
        ['ad'=>'Yunus Emre DURAN',               'rutbe'=>'P. Er',          'tarih'=>'17/12/2016','sehir'=>'KIRŞEHİR',        'yil'=>2016,'img'=>'227135-sehitperemredurankirsehir17122016.118x142.jpeg'],
        ['ad'=>'Serdar AMAK',                    'rutbe'=>'P. Er',          'tarih'=>'17/12/2016','sehir'=>'İZMİR',           'yil'=>2016,'img'=>'444605-sehitperserdaramakizmir17122016.118x142.jpeg'],
        ['ad'=>'İsa NAZLIM',                     'rutbe'=>'P. Er',          'tarih'=>'30/11/2016','sehir'=>'KIRIKKALE',       'yil'=>2016,'img'=>'997529-sehitisanazlimkirikkale30112016.118x142.jpeg'],
        ['ad'=>'Oğuz Han KARACA',                'rutbe'=>'Tnk. Er',        'tarih'=>'23/11/2016','sehir'=>'ERZURUM',         'yil'=>2016,'img'=>'50420-sehitoguzhankaraca23112016erzurum.118x142.jpeg'],
        ['ad'=>'Oğuzhan DEMİR',                  'rutbe'=>'Topçu Er',       'tarih'=>'19/11/2016','sehir'=>'KOCAELİ',         'yil'=>2016,'img'=>'400078-sehitoguzhandemirkocaeli19112016.118x142.jpeg'],
        ['ad'=>'Bayram KARDAŞ',                  'rutbe'=>'P. Er',          'tarih'=>'07/11/2016','sehir'=>'BİTLİS',          'yil'=>2016,'img'=>'974427-sehitbayramkardasbitlis07112016.118x142.jpeg'],
        ['ad'=>'Yılmaz Oğuzhan KULA',            'rutbe'=>'Mu. Onb.',       'tarih'=>'29/10/2016','sehir'=>'YOZGAT',          'yil'=>2016,'img'=>'256502-sehityilmazkulayozgat291020161.118x142.jpeg'],
        ['ad'=>'Süleyman ALTINDAĞ',              'rutbe'=>'P. Onb.',        'tarih'=>'29/10/2016','sehir'=>'UŞAK',            'yil'=>2016,'img'=>'880219-sehitsuleymanaltindagusak291020161.118x142.jpeg'],
        ['ad'=>'Barbaros YILMAZ',                'rutbe'=>'P. Onb.',        'tarih'=>'29/10/2016','sehir'=>'MERSİN',          'yil'=>2016,'img'=>'848915-sehitbarbarosyilmazmersin29102016.118x142.jpeg'],
        ['ad'=>'Fuat KINAY',                     'rutbe'=>'J. Er',          'tarih'=>'27/10/2016','sehir'=>'DİYARBAKIR',      'yil'=>2016,'img'=>'671698-sehitjerfuatkinaydiyarbakir27102016.118x142.jpeg'],
        ['ad'=>'Uğur İPEK',                      'rutbe'=>'J. Er',          'tarih'=>'23/10/2016','sehir'=>'NEVŞEHİR',        'yil'=>2016,'img'=>'36549-sehituguripeknevsehir23102016.118x142.jpeg'],
        ['ad'=>'Yunus KAYMAK',                   'rutbe'=>'P. Er',          'tarih'=>'14/10/2016','sehir'=>'ORDU',            'yil'=>2016,'img'=>'775063-sehityunuskaymakordu14102016.118x142.jpeg'],
        ['ad'=>'Erkan ÖZDEMİR',                  'rutbe'=>'J. Er',          'tarih'=>'09/10/2016','sehir'=>'DÜZCE',           'yil'=>2016,'img'=>'605-sehiterkanozdemirduzce09102016.118x142.jpeg'],
        ['ad'=>'Evren KARA',                     'rutbe'=>'J. Onb.',        'tarih'=>'09/10/2016','sehir'=>'MANİSA',          'yil'=>2016,'img'=>'965353-sehitevrenkaramanisa09102016.118x142.jpeg'],
        ['ad'=>'Eyüp HACİOĞLU',                  'rutbe'=>'J. Er',          'tarih'=>'09/10/2016','sehir'=>'MALATYA',         'yil'=>2016,'img'=>'77922-sehiteyuphacioglumalatya09102016.118x142.jpeg'],
        ['ad'=>'Latif AŞIKMUSLU',                'rutbe'=>'J. Er',          'tarih'=>'09/10/2016','sehir'=>'ÇANKIRI',         'yil'=>2016,'img'=>'683122-sehitlatifasikmuslucankiri09102016.118x142.jpeg'],
        ['ad'=>'Orhan İRKARLI',                  'rutbe'=>'İs. Er',         'tarih'=>'03/10/2016','sehir'=>'ŞANLIURFA',       'yil'=>2016,'img'=>'330646-sehitiserorhanirkarlisanliurfa03102016.118x142.jpeg'],
        ['ad'=>'Gökhan AYDER',                   'rutbe'=>'P. Er',          'tarih'=>'01/10/2016','sehir'=>'SAKARYA',         'yil'=>2016,'img'=>'354072-sehitpergokhanaydersakarya01102016.118x142.jpeg'],
        ['ad'=>'Ahmet TEZCAN',                   'rutbe'=>'J. Er',          'tarih'=>'16/09/2016','sehir'=>'MANİSA',          'yil'=>2016,'img'=>'647024-sehitjerahmettezcanmanisa16092016.118x142.jpeg'],
        ['ad'=>'Tunahan DOKTUR',                 'rutbe'=>'İs. Er',         'tarih'=>'28/08/2016','sehir'=>'ANKARA',          'yil'=>2016,'img'=>'521229-sehittunahandokturankara28082016.118x142.jpeg'],
        ['ad'=>'Fatih ÇAYBAŞI',                  'rutbe'=>'J. Er',          'tarih'=>'25/08/2016','sehir'=>'ERZİNCAN',        'yil'=>2016,'img'=>'376402-sehitfatihcaybasierzincan25082016.118x142.jpeg'],
        ['ad'=>'Hüseyin KAVALBACAK',             'rutbe'=>'P. Onb.',        'tarih'=>'23/08/2016','sehir'=>'KONYA',           'yil'=>2016,'img'=>'205832-sehithuseyinkavalbacakkonya23082016.118x142.jpeg'],
        ['ad'=>'Sinan GÖKTAŞ',                   'rutbe'=>'Sg. Er',         'tarih'=>'17/08/2016','sehir'=>'SİVAS',           'yil'=>2016,'img'=>'666762-sehitersinangoktas17082016sivas.118x142.jpeg'],
        ['ad'=>'Tayfur ÇANKAYA',                 'rutbe'=>'P. Er',          'tarih'=>'10/08/2016','sehir'=>'AFYONKARAHİSAR',  'yil'=>2016,'img'=>'436089-sehittayfurcankaya10082016afyon.118x142.jpeg'],
        ['ad'=>'Bayram KAVCI',                   'rutbe'=>'P. Er',          'tarih'=>'10/08/2016','sehir'=>'ÇORUM',           'yil'=>2016,'img'=>'144304-sehitbayramkavci10082016corum.118x142.jpeg'],
        ['ad'=>'Ahmet SUNA',                     'rutbe'=>'Tnk. Çvş.',      'tarih'=>'10/08/2016','sehir'=>'KAHRAMANMARAŞ',   'yil'=>2016,'img'=>'586387-sehitahmetsuna10082016kahramanmaras.118x142.jpeg'],
        ['ad'=>'Mehmet BAKAN',                   'rutbe'=>'Dz. Mhf. Er',   'tarih'=>'04/08/2016','sehir'=>'GAZİANTEP',       'yil'=>2016,'img'=>'27197-5c5950a27fbb8.jpeg'],
        ['ad'=>'İsmail ÇİL',                     'rutbe'=>'P. Er',          'tarih'=>'02/08/2016','sehir'=>'TRABZON',         'yil'=>2016,'img'=>'808816-sehitismailciltrabzon02082016.118x142.jpeg'],
        ['ad'=>'Muhammed Ali SARI',              'rutbe'=>'J. Komd. Er',    'tarih'=>'31/07/2016','sehir'=>'KIRŞEHİR',        'yil'=>2016,'img'=>'851448-sehitalisarikirsehir31072016.118x142.jpeg'],
        ['ad'=>'Doğan KAYA',                     'rutbe'=>'J. Komd. Er',    'tarih'=>'31/07/2016','sehir'=>'SİVAS',           'yil'=>2016,'img'=>'804758-sehitdogankayasivas31072016.118x142.jpeg'],
        ['ad'=>'Mikail KAYA',                    'rutbe'=>'P. Er',          'tarih'=>'27/07/2016','sehir'=>'MALATYA',         'yil'=>2016,'img'=>'370114-sehitmikailyasa27072016malatya.118x142.jpeg'],
        ['ad'=>'Ömer ÖNER',                      'rutbe'=>'P. Onb.',        'tarih'=>'26/07/2016','sehir'=>'İSTANBUL',        'yil'=>2016,'img'=>'298312-sehitomeroneristanbul26072016.118x142.jpeg'],
        ['ad'=>'Sedat KAYA',                     'rutbe'=>'Ulş. Er',        'tarih'=>'21/07/2016','sehir'=>'İSTANBUL',        'yil'=>2016,'img'=>'991175-sehitsedatkayaistanbul21072016.118x142.jpeg'],
        ['ad'=>'Ahmet ALTUN',                    'rutbe'=>'J. Er',          'tarih'=>'19/07/2016','sehir'=>'ERZURUM',         'yil'=>2016,'img'=>'926281-sehitahmetaltunerzurum19072016.118x142.jpeg'],
        ['ad'=>'Eyüp ÖKSÜZ',                     'rutbe'=>'J. Er',          'tarih'=>'10/07/2016','sehir'=>'SAMSUN',          'yil'=>2016,'img'=>'107563-sehiteyupoksuzsamsun10072016.118x142.jpeg'],
        ['ad'=>'Osman ER',                       'rutbe'=>'P. Er',          'tarih'=>'10/07/2016','sehir'=>'BİLECİK',         'yil'=>2016,'img'=>'955049-sehitosmanerbilecik10072016.118x142.jpeg'],
        ['ad'=>'Orkun Alp ARSLAN',               'rutbe'=>'J. Er',          'tarih'=>'10/07/2016','sehir'=>'AYDIN',           'yil'=>2016,'img'=>'48416-sehitoalparslanaydin10072016.118x142.jpeg'],
        ['ad'=>'Soner SÜYLÜ',                    'rutbe'=>'P. Er',          'tarih'=>'05/07/2016','sehir'=>'SAMSUN',          'yil'=>2016,'img'=>'607304-sehitsonersuylusamsun05072016.118x142.jpeg'],
        ['ad'=>'Murat GÖZAL',                    'rutbe'=>'J. Er',          'tarih'=>'30/06/2016','sehir'=>'MARDİN',          'yil'=>2016,'img'=>'500640-23__j__er_murat_gozal__30_06_2016__mardin.118x142.jpeg'],
        ['ad'=>'Mücahit ŞİMŞEK',                 'rutbe'=>'J. Er',          'tarih'=>'25/06/2016','sehir'=>'KAHRAMANMARAŞ',   'yil'=>2016,'img'=>'275845-22__j__er_mucahit_im_ek__25_06_2016__kahramanmara.118x142.jpeg'],
        ['ad'=>'Ferhat YILDIRIM',                'rutbe'=>'İkm. Er',        'tarih'=>'17/06/2016','sehir'=>'DİYARBAKIR',      'yil'=>2016,'img'=>'913782-21__ikm__er_ferhat_yildirim__17_06_2016__diyarbakir.118x142.jpeg'],
        ['ad'=>'Salih BULUT',                    'rutbe'=>'J. Er',          'tarih'=>'06/06/2016','sehir'=>'SİVAS',           'yil'=>2016,'img'=>'650628-20__j__er_salih_bulut__06_06_2016__sivas.118x142.jpeg'],
        ['ad'=>'Sefa UZUN',                      'rutbe'=>'J. Er',          'tarih'=>'07/05/2016','sehir'=>'BURSA',           'yil'=>2016,'img'=>'266593-19__j__er_sefa_uzun__07_05_2016__bursa.118x142.jpeg'],
        ['ad'=>'Adem GÜL',                       'rutbe'=>'J. Er',          'tarih'=>'02/05/2016','sehir'=>'TEKİRDAĞ',        'yil'=>2016,'img'=>'743562-18__j__er_adem_gul__02_05_2016__tekirda.118x142.jpeg'],
        ['ad'=>'Ayhan ERDOĞAN',                  'rutbe'=>'P. Er',          'tarih'=>'02/05/2016','sehir'=>'BARTIN',          'yil'=>2016,'img'=>'811510-17__p__er_ayhan_erdo_an__02_05_2016__bartin.118x142.jpeg'],
        ['ad'=>'Muttalip SOYLU',                 'rutbe'=>'P. Onb.',        'tarih'=>'02/05/2016','sehir'=>'NİĞDE',           'yil'=>2016,'img'=>'440872-16__p__onb__muttalip_soylu__02_05_2016__ni_de.118x142.jpeg'],
        ['ad'=>'Celal MUNGAN',                   'rutbe'=>'İs. Er',         'tarih'=>'30/04/2016','sehir'=>'ŞIRNAK',          'yil'=>2016,'img'=>'194540-15__is__er_celal_mungan__30_04_2016__irnak.118x142.jpeg'],
        ['ad'=>'Özkan ÖZDEN',                    'rutbe'=>'J. Er',          'tarih'=>'22/04/2016','sehir'=>'SAMSUN',          'yil'=>2016,'img'=>'444377-14__j__er_ozkan_ozden__22_04_2016__samsun.118x142.jpeg'],
        ['ad'=>'Volkan KARATEPE',                'rutbe'=>'J. Onb.',        'tarih'=>'22/04/2016','sehir'=>'SİVAS',           'yil'=>2016,'img'=>'13884-13__j__onb__volkan_karatepe__22_04_2016__sivas.118x142.jpeg'],
        ['ad'=>'Mustafa ÖZEL',                   'rutbe'=>'J. Er',          'tarih'=>'15/04/2016','sehir'=>'TRABZON',         'yil'=>2016,'img'=>'892602-12__j__er_mustafa_ozel__15_04_2016__trabzon.118x142.jpeg'],
        ['ad'=>'Ferhat ERSECEN',                 'rutbe'=>'İkm. Er',        'tarih'=>'28/02/2016','sehir'=>'ERZİNCAN',        'yil'=>2016,'img'=>'641471-11__ikm__er_ferhat_ersecen__28_02_2016__erzincan.118x142.jpeg'],
        ['ad'=>'Oğuz ARSLAN',                    'rutbe'=>'J. Ulş. Er',     'tarih'=>'21/02/2016','sehir'=>'AYDIN',           'yil'=>2016,'img'=>'707001-10__j__ul___er_o_uz_arslan__21_02_2016__aydin.118x142.jpeg'],
        ['ad'=>'Recep BODUR',                    'rutbe'=>'J. Er',          'tarih'=>'18/02/2016','sehir'=>'AMASYA',          'yil'=>2016,'img'=>'80258-9__j__er_recep_bodur__18_02_2016__amasya.118x142.jpeg'],
        ['ad'=>'Mustafa NERKİS',                 'rutbe'=>'J. Er',          'tarih'=>'18/02/2016','sehir'=>'KÜTAHYA',         'yil'=>2016,'img'=>'73020-5c594fc2f3ff2.jpeg'],
        ['ad'=>'Mustafa BİLGİLİ',                'rutbe'=>'J. Er',          'tarih'=>'18/02/2016','sehir'=>'AMASYA',          'yil'=>2016,'img'=>'824757-7__j__er_mustafa_bilgili__18_02_2016__amasya.118x142.jpeg'],
        ['ad'=>'Fatih YENİAY',                   'rutbe'=>'J. Er',          'tarih'=>'18/02/2016','sehir'=>'MARDİN',          'yil'=>2016,'img'=>'656497-5__j__er_fatih_yeniay__18_02_2016_mardin.118x142.jpeg'],
        ['ad'=>'Ali ÖZTAŞ',                      'rutbe'=>'Hv. Ulş. Er',   'tarih'=>'17/02/2016','sehir'=>'ADANA',           'yil'=>2016,'img'=>'543791-4__hv__ul___er_ali_ozta__17_02_2016__adana.118x142.jpeg'],
        ['ad'=>'Vedat DOLANÇAY',                 'rutbe'=>'P. Er',          'tarih'=>'09/02/2016','sehir'=>'VAN',             'yil'=>2016,'img'=>'451637-3__p__er_vedat_dolancay__09_02_2016__van.118x142.jpeg'],
        ['ad'=>'Arif SUBAŞOĞLU',                 'rutbe'=>'P. Er',          'tarih'=>'09/02/2016','sehir'=>'KOCAELİ',         'yil'=>2016,'img'=>'15180-2__p__er_arif_suba_o_lu__09_02_2016__kocaeli.118x142.jpeg'],
        ['ad'=>'Kadir GÖRGÜLÜ',                  'rutbe'=>'J. Er',          'tarih'=>'18/02/2016','sehir'=>'ŞANLIURFA',       'yil'=>2016,'img'=>'238831-6__j__er_kadir_gorgulu__18_02_2016__anliurfa.118x142.jpeg'],
        ['ad'=>'Mustafa BERBER',                 'rutbe'=>'P. Onb.',        'tarih'=>'07/01/2016','sehir'=>'İSTANBUL',        'yil'=>2016,'img'=>'855785-1__p__onb__mustafa_berber__07_01_2016__istanbul.118x142.jpeg'],
        // ── 2015 ──────────────────────────────────────────
        ['ad'=>'Gürkan Necati YENİKAPI',         'rutbe'=>'P. Er',          'tarih'=>'27/12/2015','sehir'=>'İZMİR',           'yil'=>2015,'img'=>'541155-30__p__er_gurkan_necati_yenikapi__27_12_2015__izmir.118x142.jpeg'],
        ['ad'=>'İsa KARAKAŞ',                    'rutbe'=>'J. Er',          'tarih'=>'25/12/2015','sehir'=>'GAZİANTEP',       'yil'=>2015,'img'=>'452564-29__j__er_isa_karaka__25_12_2015__gaziantep.118x142.jpeg'],
        ['ad'=>'Çağlar İNAN',                    'rutbe'=>'P. Çvş.',        'tarih'=>'13/12/2015','sehir'=>'TEKİRDAĞ',        'yil'=>2015,'img'=>'298639-28__p__cv___ca_lar_inan__13_12_2015__tekirda.118x142.jpeg'],
        ['ad'=>'Gökhan ÇAKIR',                   'rutbe'=>'P. Er',          'tarih'=>'09/10/2015','sehir'=>'MUŞ',             'yil'=>2015,'img'=>'324026-26__p__er_gokhan_cakir__10_09_2015__mu.118x142.jpeg'],
        ['ad'=>'Mustafa TURUL',                  'rutbe'=>'P. Er',          'tarih'=>'02/10/2015','sehir'=>'SAKARYA',         'yil'=>2015,'img'=>'946263-27__p__er_mustafa_turul__02_10_2015__sakarya.118x142.jpeg'],
        ['ad'=>'Muharrem ÖKSÜZ',                 'rutbe'=>'P. Er',          'tarih'=>'06/09/2015','sehir'=>'KONYA',           'yil'=>2015,'img'=>'599121-25__p__er_muharrem_oksuz__06_09_2015__konya.118x142.jpeg'],
        ['ad'=>'Yusuf BEYLEM',                   'rutbe'=>'P. Onb.',        'tarih'=>'02/09/2015','sehir'=>'ŞANLIURFA',       'yil'=>2015,'img'=>'111284-24__p__onb__yusuf_beylem__02_09_2015__anliurfa.118x142.jpeg'],
        ['ad'=>'Sefter TAŞ',                     'rutbe'=>'P. Er',          'tarih'=>'01/09/2015','sehir'=>'IĞDIR',           'yil'=>2015,'img'=>'391265-p__er_sefter_ta__01_09_2015__i_dir.118x142.jpeg'],
        ['ad'=>'Recep BEYCUR',                   'rutbe'=>'J. Er',          'tarih'=>'19/08/2015','sehir'=>'ERZURUM',         'yil'=>2015,'img'=>'310487-23__j__er_recep_beycur__19_08_2015__erzurum.118x142.jpeg'],
        ['ad'=>'Ömer ERÜSTÜN',                   'rutbe'=>'J. Er',          'tarih'=>'19/08/2015','sehir'=>'KAHRAMANMARAŞ',   'yil'=>2015,'img'=>'758576-22__j__er_omer_erustun__19_08_2015__kahramanmara.118x142.jpeg'],
        ['ad'=>'Mehmet Halil BARKIN',            'rutbe'=>'J. Er',          'tarih'=>'19/08/2015','sehir'=>'ŞIRNAK',          'yil'=>2015,'img'=>'735495-21__j__er_mehmet_halil_barkin__19_08_2015__irnak.118x142.jpeg'],
        ['ad'=>'Emre Kaan ARLI',                 'rutbe'=>'J. Er',          'tarih'=>'19/08/2015','sehir'=>'KOCAELİ',         'yil'=>2015,'img'=>'412450-20__j__er_emre_kaan_arli__19_08_2015__kocaeli.118x142.jpeg'],
        ['ad'=>'Bahadır AYDIN',                  'rutbe'=>'J. Çvş.',        'tarih'=>'19/08/2015','sehir'=>'BURSA',           'yil'=>2015,'img'=>'10957-19__j__cv___bahad_r_aydin__19_08_2015__bursa.118x142.jpeg'],
        ['ad'=>'Barış AYBEK',                    'rutbe'=>'P. Onb.',        'tarih'=>'11/08/2015','sehir'=>'MALATYA',         'yil'=>2015,'img'=>'554293-18__p__onb__bar_aybek__11_08_2015__malatya.118x142.jpeg'],
        ['ad'=>'Doğan ACAR',                     'rutbe'=>'J. Ulş. Er',    'tarih'=>'10/08/2015','sehir'=>'DENİZLİ',         'yil'=>2015,'img'=>'10254-17__j__ul___er_do_an_acar__10_08_2015__denizli.118x142.jpeg'],
        ['ad'=>'Abdulhalık ARAZ',                'rutbe'=>'Tnk. Er',        'tarih'=>'04/08/2015','sehir'=>'VAN',             'yil'=>2015,'img'=>'157261-16__tnk__er_abdulhal_k_araz__04_08_2015__van.118x142.jpeg'],
        ['ad'=>'Abdulkadir PEKTAŞ',              'rutbe'=>'J. Er',          'tarih'=>'04/08/2015','sehir'=>'DİYARBAKIR',      'yil'=>2015,'img'=>'325297-15__j__er_abdulkadir_pekta__04_08_2015__diyarbakir.118x142.jpeg'],
        ['ad'=>'Mansur CENGİZ',                  'rutbe'=>'J. Er',          'tarih'=>'02/08/2015','sehir'=>'SİİRT',           'yil'=>2015,'img'=>'846534-14__j__er_mansur_cengiz__02_08_2015__siirt.118x142.jpeg'],
        ['ad'=>'Medet MAT',                      'rutbe'=>'J. Er',          'tarih'=>'02/08/2015','sehir'=>'ADIYAMAN',        'yil'=>2015,'img'=>'646315-13__j__er_medet_mat__02_08_2015__adiyaman.118x142.jpeg'],
        ['ad'=>'Barış AKKABAK',                  'rutbe'=>'J. Er',          'tarih'=>'01/08/2015','sehir'=>'ANTALYA',         'yil'=>2015,'img'=>'165832-12__j__er_bar_akkabak__01_08_2015__antalya.118x142.jpeg'],
        ['ad'=>'Ömer Kağan KANDEMİR',           'rutbe'=>'P. Er',          'tarih'=>'30/07/2015','sehir'=>'DENİZLİ',         'yil'=>2015,'img'=>'503576-11__p__er_omer_ka_an_kandemir__30_07_2015__denizli.118x142.jpeg'],
        ['ad'=>'Hamza YILDIRIM',                 'rutbe'=>'P. Onb.',        'tarih'=>'30/07/2015','sehir'=>'ANKARA',          'yil'=>2015,'img'=>'427848-10__p__onb__hamza_yildirim__30_07_2015__ankara.118x142.jpeg'],
        ['ad'=>'Faik YÜCE',                      'rutbe'=>'P. Er',          'tarih'=>'06/07/2015','sehir'=>'İSTANBUL',        'yil'=>2015,'img'=>'427329-9__p__er_faik_yuce__06_07_2015__istanbul.118x142.jpeg'],
        ['ad'=>'Şahabettin ATAK',                'rutbe'=>'İs. Er',         'tarih'=>'05/07/2015','sehir'=>'ŞIRNAK',          'yil'=>2015,'img'=>'760254-8__is__er_ahabettin_atak__05_07_2015__irnak.118x142.jpeg'],
        ['ad'=>'Coşkun SEKMEN',                  'rutbe'=>'P. Er',          'tarih'=>'30/06/2015','sehir'=>'SAMSUN',          'yil'=>2015,'img'=>'768873-7__p__er_co_kun_sekmen__30_06_2015__samsun.118x142.jpeg'],
        ['ad'=>'Muhammed CAN',                   'rutbe'=>'P. Onb.',        'tarih'=>'26/02/2015','sehir'=>'KIRŞEHİR',        'yil'=>2015,'img'=>'305894-6__p__onb__muhammed_can__26_02_2015__kir_ehir.118x142.jpeg'],
        ['ad'=>'Akın BULUŞ',                     'rutbe'=>'P. Er',          'tarih'=>'26/02/2015','sehir'=>'EDİRNE',          'yil'=>2015,'img'=>'620293-5__p__er_ak_n_bulu__26_02_2015__edirne.118x142.jpeg'],
        ['ad'=>'Ömer YALÇIN',                    'rutbe'=>'P. Er',          'tarih'=>'13/02/2015','sehir'=>'BİTLİS',          'yil'=>2015,'img'=>'182910-4__p__er_omer_yalcin__13_02_2015__bitlis.118x142.jpeg'],
        ['ad'=>'Özgür BEDİR',                    'rutbe'=>'J. Er',          'tarih'=>'16/01/2015','sehir'=>'MARDİN',          'yil'=>2015,'img'=>'848663-3__j__er_ozgur_bedir__16_01_2015__mardin.118x142.jpeg'],
        ['ad'=>'Şahin TAŞKIN',                   'rutbe'=>'Hv. Ulş. Er',   'tarih'=>'04/01/2015','sehir'=>'BURSA',           'yil'=>2015,'img'=>'849310-2__hv__ul___er_ahin_ta_kin__04_01_2015__bursa.118x142.jpeg'],
        ['ad'=>'Emrah ÇALKIN',                   'rutbe'=>'P. Er',          'tarih'=>'03/01/2015','sehir'=>'TEKİRDAĞ',        'yil'=>2015,'img'=>'330777-1__p__er_emrah_calkin__03_01_2015__tekirda.118x142.jpeg'],
        // ── 2014 ──────────────────────────────────────────
        ['ad'=>'Emre GÜNALAY',                   'rutbe'=>'Dz. P. Er',      'tarih'=>'25/12/2014','sehir'=>'KÜTAHYA',         'yil'=>2014,'img'=>'917671-19__dz__p__er_emre_gunalay__25_12_2014__kutahya.118x142.jpeg'],
        ['ad'=>'Kadir YILDIZ',                   'rutbe'=>'P. Onb.',        'tarih'=>'09/12/2014','sehir'=>'KASTAMONU',       'yil'=>2014,'img'=>'695670-18__p__onb__kadir_yildiz__09_12_2014__kastamonu.118x142.jpeg'],
        ['ad'=>'Ramazan YEL',                    'rutbe'=>'P. Çvş.',        'tarih'=>'09/12/2014','sehir'=>'KÜTAHYA',         'yil'=>2014,'img'=>'163087-17__p__cv___ramazan_yel__09_12_2014__kutahya.118x142.jpeg'],
        ['ad'=>'Taner KAYA',                     'rutbe'=>'P. Er',          'tarih'=>'06/12/2014','sehir'=>'MARDİN',          'yil'=>2014,'img'=>'649103-16__p__er_taner_kaya__06_12_2014__mardin.118x142.jpeg'],
        ['ad'=>'Muhammet Can BİÇİCİ',            'rutbe'=>'J. Onb.',        'tarih'=>'28/11/2014','sehir'=>'NEVŞEHİR',        'yil'=>2014,'img'=>'398430-15__j__onb__muhammet_can_bicici__28_11_2014__nev_ehir.118x142.jpeg'],
        ['ad'=>'Vedat SARIKAYA',                 'rutbe'=>'P. Er',          'tarih'=>'26/11/2014','sehir'=>'KAHRAMANMARAŞ',   'yil'=>2014,'img'=>'165241-14__p__er_vedat_sarikaya_26_11_2014__kahramanmara.118x142.jpeg'],
        ['ad'=>'Mustafa KARAKURT',               'rutbe'=>'J. Er',          'tarih'=>'31/10/2014','sehir'=>'SİVAS',           'yil'=>2014,'img'=>'239727-13__j__er_mustafa_karakurt__31_10_2014__sivas.118x142.jpeg'],
        ['ad'=>'Yunus YILMAZ',                   'rutbe'=>'J. Er',          'tarih'=>'25/10/2014','sehir'=>'BİNGÖL',          'yil'=>2014,'img'=>'381359-12__j__er_yunus_yilmaz__25_10_2014__bingol.118x142.jpeg'],
        ['ad'=>'Ramazan KÖSE',                   'rutbe'=>'J. Er',          'tarih'=>'25/10/2014','sehir'=>'ARTVİN',          'yil'=>2014,'img'=>'590800-11__j__er_ramazan_kose__25_10_2014__artvin.118x142.jpeg'],
        ['ad'=>'Kadir BOZAN',                    'rutbe'=>'J. Ulş.',        'tarih'=>'20/10/2014','sehir'=>'NİĞDE',           'yil'=>2014,'img'=>'239919-10__j__ul___er_kadir_bozan__20_10_2014__ni_de.118x142.jpeg'],
        ['ad'=>'Ramazan FAKÇI',                  'rutbe'=>'Sg. Er',         'tarih'=>'17/08/2014','sehir'=>'GAZİANTEP',       'yil'=>2014,'img'=>'789657-9__sg_er_ramazan_fakci__17_08_2014__gaziantep.118x142.jpeg'],
        ['ad'=>'Emin DAŞCI',                     'rutbe'=>'P. Er',          'tarih'=>'28/07/2014','sehir'=>'UŞAK',            'yil'=>2014,'img'=>'233075-8__p__er_emin_da_ci__28_07_2014__u_ak.118x142.jpeg'],
        ['ad'=>'Yiğit ŞAHAN',                    'rutbe'=>'Shh. Onb.',      'tarih'=>'22/07/2014','sehir'=>'İZMİR',           'yil'=>2014,'img'=>'313368-6__shh__onb__yi_it_ahan__22_07_2014__izmir.118x142.jpeg'],
        ['ad'=>'Berat SAĞIRKAYA',                'rutbe'=>'P. Er',          'tarih'=>'21/07/2014','sehir'=>'NİĞDE',           'yil'=>2014,'img'=>'381079-5__p__er_berat_sa_irkaya__21_07_2014__ni_de.118x142.jpeg'],
        ['ad'=>'Adem DÖĞÜŞEN',                   'rutbe'=>'P. Er',          'tarih'=>'21/07/2014','sehir'=>'HATAY',           'yil'=>2014,'img'=>'213242-4__p__er_adem_do_u_en__21_07_2014__hatay.118x142.jpeg'],
        ['ad'=>'Gökhan DAĞBAY',                  'rutbe'=>'P. Er',          'tarih'=>'05/06/2014','sehir'=>'KOCAELİ',         'yil'=>2014,'img'=>'131776-3__p__er_gokhan_da_bay__05_06_2014__kocaeli.118x142.jpeg'],
        ['ad'=>'Recep MÜTEVELLİOĞLU',           'rutbe'=>'J. Er',          'tarih'=>'26/05/2014','sehir'=>'KONYA',           'yil'=>2014,'img'=>'858893-2__j__er_recep_mutevellio_lu__26_05_2014__konya.118x142.jpeg'],
        ['ad'=>'İdris SOLMAZ',                   'rutbe'=>'J. Er',          'tarih'=>'19/04/2014','sehir'=>'DİYARBAKIR',      'yil'=>2014,'img'=>'263067-1__j__er_idris_solmaz__19_04_2014__diyarbakir.118x142.jpeg'],
    ];
}
/* ─── Yıllara göre grupla ─── */
$tumSehitler = vkd_sehit_listesi();
$yillar = [];
foreach ($tumSehitler as $s) { $yillar[$s['yil']][] = $s; }
krsort($yillar);
$toplamSehit = count($tumSehitler);
$toplamYil   = count($yillar);
?>
<style>
:root{--r:#8C1A2E;--rd:#6E1222;--g:#C9A84C;--dk:#0A0C0E;--dk2:#141820;--wh:#FAFAF8;--of:#F5F1EB;--bd:#E4DDD5;--t1:#16181C;--t2:#3D4451;--t3:#6B7280;--t4:#9CA3AF;--fn:'Nunito Sans',system-ui,sans-serif;--fs:'Merriweather',Georgia,serif}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
#content,main,.site-content,.entry-content{max-width:100%!important;padding:0!important;width:100%!important}
/* ── HERO ── */
.sh-hero{position:relative;background:var(--dk);overflow:hidden}
.sh-hero-bg{position:absolute;inset:0;background:radial-gradient(ellipse 80% 60% at 110% 50%,rgba(140,26,46,.18) 0%,transparent 55%),radial-gradient(ellipse 40% 70% at -10% 60%,rgba(201,168,76,.06) 0%,transparent 50%),linear-gradient(160deg,#0A0C0E 0%,#141820 60%,#1a0a10 100%)}
.sh-hero-grid{position:absolute;inset:0;opacity:.04;background-image:linear-gradient(rgba(255,255,255,.12) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.12) 1px,transparent 1px);background-size:48px 48px}
.sh-hero-inner{position:relative;z-index:2;max-width:1400px;margin:0 auto;padding:72px 40px 64px;display:grid;grid-template-columns:1fr auto;gap:48px;align-items:center}
.sh-eyebrow{display:inline-flex;align-items:center;gap:10px;font-family:var(--fn);font-size:10px;font-weight:800;letter-spacing:4px;text-transform:uppercase;color:var(--g);margin-bottom:18px}
.sh-eyebrow::before{content:'';width:28px;height:2px;background:linear-gradient(90deg,var(--g),transparent)}
.sh-hero-h1{font-family:var(--fs);font-size:clamp(2.2rem,4.5vw,3.6rem);font-weight:700;color:#fff;line-height:1.05;margin-bottom:16px;letter-spacing:-.5px}
.sh-hero-h1 .accent{display:block;background:linear-gradient(135deg,#C9A84C,#e8c96a,#C9A84C);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;font-style:italic}
.sh-hero-desc{font-family:var(--fn);font-size:.95rem;color:rgba(255,255,255,.45);line-height:1.85;max-width:540px;margin-bottom:32px;font-weight:300}
.sh-hero-quote{display:flex;align-items:flex-start;gap:14px;background:rgba(140,26,46,.15);border:1px solid rgba(140,26,46,.3);border-left:3px solid var(--r);padding:16px 20px;max-width:540px}
.sh-hero-quote .qmark{font-family:var(--fs);font-size:3rem;color:rgba(140,26,46,.5);line-height:1;flex-shrink:0;margin-top:-6px}
.sh-hero-quote p{font-family:var(--fs);font-size:.88rem;font-style:italic;color:rgba(255,255,255,.6);line-height:1.7}
.sh-hero-quote .attr{font-family:var(--fn);font-style:normal;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--g);margin-top:8px;display:block}
.sh-stats-panel{display:flex;flex-direction:column;gap:10px;min-width:220px}
.sh-stat{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-left:3px solid var(--g);padding:16px 20px;transition:all .25s}
.sh-stat:hover{background:rgba(255,255,255,.08)}
.sh-stat-n{font-family:var(--fs);font-size:2.2rem;font-weight:700;color:var(--g);line-height:1;margin-bottom:4px}
.sh-stat-l{font-size:9px;font-weight:800;letter-spacing:2.5px;text-transform:uppercase;color:rgba(255,255,255,.35)}
.sh-star-divider{display:flex;align-items:center;gap:8px;padding:14px 20px;background:rgba(140,26,46,.1);border:1px solid rgba(140,26,46,.2)}
.sh-star-divider span{font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,.3)}
.sh-star{width:6px;height:6px;background:var(--r);clip-path:polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%);flex-shrink:0}
/* ── NAV ── */
.sh-nav{background:#fff;border-bottom:1px solid var(--bd);position:sticky;top:0;z-index:200;box-shadow:0 2px 12px rgba(0,0,0,.06)}
.sh-nav-inner{max-width:1400px;margin:0 auto;padding:0 40px;display:flex;align-items:center;justify-content:space-between;gap:20px}
.sh-nav-years{display:flex;overflow-x:auto;gap:2px;scrollbar-width:none;flex:1}
.sh-nav-years::-webkit-scrollbar{display:none}
.sh-nav-y{display:inline-flex;align-items:center;gap:6px;padding:14px 18px;font-family:var(--fn);font-size:12px;font-weight:700;color:var(--t3);white-space:nowrap;border:none;background:none;cursor:pointer;border-bottom:3px solid transparent;margin-bottom:-1px;transition:all .2s}
.sh-nav-y:hover{color:var(--r)}
.sh-nav-y.active{color:var(--r);border-bottom-color:var(--r)}
.sh-nav-y .badge{background:var(--of);color:var(--t3);font-size:9px;font-weight:800;padding:2px 6px;border-radius:20px;min-width:22px;text-align:center}
.sh-nav-y.active .badge{background:rgba(140,26,46,.12);color:var(--r)}
.sh-nav-search{display:flex;align-items:center;gap:8px;background:var(--of);border:1px solid var(--bd);padding:8px 14px;border-radius:4px;flex-shrink:0}
.sh-nav-search input{border:none;background:none;outline:none;font-family:var(--fn);font-size:12px;color:var(--t1);width:180px}
.sh-nav-search input::placeholder{color:var(--t4)}
.sh-nav-search svg{color:var(--t4);flex-shrink:0}
/* ── ANA İÇERİK ── */
.sh-main{background:var(--of);min-height:100vh;padding:0 0 80px}
.sh-year-section{max-width:1400px;margin:0 auto;padding:0 40px;display:none}
.sh-year-section.show{display:block}
.sh-year-header{padding:56px 0 36px;display:flex;align-items:flex-end;justify-content:space-between;gap:24px;border-bottom:1px solid var(--bd);margin-bottom:32px}
.sh-year-badge{display:inline-flex;align-items:center;gap:8px;font-size:9px;font-weight:800;letter-spacing:3px;text-transform:uppercase;color:var(--r);margin-bottom:10px}
.sh-year-badge::before{content:'';width:16px;height:2px;background:var(--r)}
.sh-year-h2{font-family:var(--fs);font-size:clamp(1.6rem,3vw,2.4rem);font-weight:700;color:var(--t1);letter-spacing:-.3px}
.sh-year-h2 .yno{color:var(--r)}
.sh-year-count{flex-shrink:0;text-align:right}
.sh-year-count-n{font-family:var(--fs);font-size:2.8rem;font-weight:700;color:var(--r);line-height:1}
.sh-year-count-l{font-size:9px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:var(--t4);margin-top:4px}
/* ── KART GRID ── */
.sh-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px;margin-bottom:32px}
/* Şehit Kartı */
.sh-card{background:#fff;border:1px solid var(--bd);overflow:hidden;transition:all .25s;cursor:default;position:relative}
.sh-card:hover{border-color:var(--r);box-shadow:0 8px 32px rgba(0,0,0,.12);transform:translateY(-3px)}
.sh-card-img-wrap{position:relative;background:var(--dk2);overflow:hidden;aspect-ratio:4/5}
.sh-card-img{width:100%;height:100%;object-fit:cover;object-position:top center;display:block;filter:grayscale(20%);transition:filter .3s}
.sh-card:hover .sh-card-img{filter:grayscale(0%)}
.sh-card-overlay{position:absolute;inset:0;background:linear-gradient(0deg,rgba(10,12,14,.85) 0%,transparent 55%);pointer-events:none}
.sh-card-date{position:absolute;bottom:8px;left:0;right:0;text-align:center;font-family:var(--fn);font-size:10px;font-weight:700;color:rgba(255,255,255,.7);letter-spacing:.8px;z-index:2}
.sh-card-body{padding:12px 10px 14px}
.sh-card-name{font-family:var(--fn);font-size:.78rem;font-weight:800;color:var(--t1);line-height:1.3;margin-bottom:6px}
.sh-card-meta{display:flex;align-items:center;justify-content:space-between;gap:4px}
.sh-card-rutbe{font-size:9.5px;font-weight:700;color:var(--t3);background:var(--of);padding:2px 7px;border-radius:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:80px}
.sh-card-sehir{font-size:9px;font-weight:800;color:var(--t4);letter-spacing:.8px;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
/* Aynı gün birden fazla şehit — ince kırmızı çizgi */
.sh-card.same-date::after{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:var(--r)}
/* ── ÖZET ── */
.sh-year-summary{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:10px;margin-bottom:48px;padding-top:20px;border-top:1px solid var(--bd)}
.sh-sum-item{background:#fff;border:1px solid var(--bd);padding:14px 16px;display:flex;align-items:center;gap:12px}
.sh-sum-item svg{color:var(--r);flex-shrink:0}
.sh-sum-item-txt{font-size:11px;color:var(--t3);font-weight:600}
.sh-sum-item-n{font-size:1.1rem;font-weight:800;color:var(--t1);display:block}
/* ── ARAMA BULUNAMADI ── */
.sh-no-result{display:none;text-align:center;padding:80px 40px;font-family:var(--fn)}
.sh-no-result.show{display:block}
.sh-no-result-icon{font-size:3rem;margin-bottom:16px;opacity:.4}
.sh-no-result h3{font-family:var(--fs);font-size:1.3rem;color:var(--t2);margin-bottom:8px}
.sh-no-result p{font-size:.9rem;color:var(--t4)}
.sh-card.hidden{display:none}
/* ── ALT BANT ── */
.sh-bottom{background:var(--dk);padding:64px 40px;position:relative;overflow:hidden}
.sh-bottom::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse 60% 80% at 50% 50%,rgba(140,26,46,.2) 0%,transparent 65%)}
.sh-bottom-inner{max-width:860px;margin:0 auto;text-align:center;position:relative;z-index:1}
.sh-bottom-star{display:flex;align-items:center;justify-content:center;gap:12px;margin-bottom:24px}
.sh-bottom-star span{font-size:24px;line-height:1;filter:drop-shadow(0 0 8px rgba(140,26,46,.6))}
.sh-bottom-h{font-family:var(--fs);font-size:clamp(1.5rem,3vw,2.2rem);font-weight:700;color:#fff;margin-bottom:16px;letter-spacing:-.3px}
.sh-bottom-p{font-size:.95rem;color:rgba(255,255,255,.45);line-height:1.9;max-width:600px;margin:0 auto 28px}
.sh-bottom-line{width:64px;height:2px;margin:0 auto 28px;background:linear-gradient(90deg,transparent,var(--r),transparent)}
.sh-bottom-hadis{font-family:var(--fs);font-style:italic;font-size:1rem;color:var(--g);line-height:1.75}
.sh-bottom-hadis small{display:block;font-style:normal;font-family:var(--fn);font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:rgba(201,168,76,.5);margin-top:8px}
/* ── RESPONSIVE ── */
@media(max-width:1024px){.sh-hero-inner{grid-template-columns:1fr;padding:56px 24px 48px}.sh-stats-panel{flex-direction:row;flex-wrap:wrap;min-width:auto}.sh-stat{flex:1;min-width:140px}.sh-year-section{padding:0 24px}.sh-nav-inner{padding:0 20px}.sh-grid{grid-template-columns:repeat(auto-fill,minmax(140px,1fr))}}
@media(max-width:768px){.sh-hero-inner{padding:40px 20px 36px}.sh-year-section{padding:0 16px}.sh-year-header{flex-direction:column;align-items:flex-start;padding:36px 0 24px}.sh-grid{grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px}.sh-nav-search input{width:120px}.sh-bottom{padding:48px 20px}}
@media(max-width:480px){.sh-nav-search{display:none}.sh-hero-desc,.sh-hero-quote{display:none}.sh-grid{grid-template-columns:repeat(3,1fr)}}
@media print{.sh-nav{position:static}.sh-year-section{display:block!important}.sh-hero-bg,.sh-hero-grid{display:none}.sh-hero{background:#fff!important}.sh-hero-h1{color:#000!important}.sh-hero-h1 .accent{-webkit-text-fill-color:#8C1A2E!important}}
</style>
<div style="font-family:'Nunito Sans',system-ui,sans-serif">
<!-- HERO -->
<section class="sh-hero">
    <div class="sh-hero-bg"></div>
    <div class="sh-hero-grid"></div>
    <div class="sh-hero-inner">
        <div class="sh-hero-left">
            <div class="sh-eyebrow">Vatan Kahramanları Derneği</div>
            <h1 class="sh-hero-h1">
                Şehitlerimizi<br>
                <em class="accent">Minnetle Anıyoruz</em>
            </h1>
            <p class="sh-hero-desc">Türkiye Cumhuriyeti'nin güvenliği ve vatanın korunması uğruna canlarını feda eden Mehmetçiklerimizin kutsal hatırası önünde saygıyla eğiliyoruz.</p>
            <div class="sh-hero-quote">
                <span class="qmark">"</span>
                <div>
                    <p>Ne mutlu Türk milletinin bir ferdi olarak bu vatan için canını verebilen kahramanlara.</p>
                    <span class="attr">— Gazi Mustafa Kemal Atatürk</span>
                </div>
            </div>
        </div>
        <div class="sh-stats-panel">
            <div class="sh-stat">
                <div class="sh-stat-n"><?php echo $toplamSehit; ?></div>
                <div class="sh-stat-l">Kayıtlı Şehit</div>
            </div>
            <div class="sh-stat">
                <div class="sh-stat-n"><?php echo $toplamYil; ?></div>
                <div class="sh-stat-l">Yıl Kapsamı</div>
            </div>
            <div class="sh-star-divider">
                <div class="sh-star"></div>
                <span><?php echo min(array_keys($yillar)); ?> – <?php echo max(array_keys($yillar)); ?></span>
                <div class="sh-star"></div>
            </div>
            <div class="sh-stat" style="border-left-color:var(--r)">
                <div class="sh-stat-n" style="color:var(--r)"><?php
                    $maxYilCount = max(array_map('count', $yillar));
                    echo array_search($maxYilCount, array_map('count', $yillar));
                ?></div>
                <div class="sh-stat-l">En Yoğun Yıl</div>
            </div>
        </div>
    </div>
</section>
<!-- NAV -->
<nav class="sh-nav" id="shNav">
    <div class="sh-nav-inner">
        <div class="sh-nav-years">
            <button class="sh-nav-y active" data-year="all" onclick="vkdFilter('all',this)">
                Tümü <span class="badge"><?php echo $toplamSehit; ?></span>
            </button>
            <?php foreach ($yillar as $y => $ys): ?>
            <button class="sh-nav-y" data-year="<?php echo $y; ?>" onclick="vkdFilter(<?php echo $y; ?>,this)">
                <?php echo $y; ?> <span class="badge"><?php echo count($ys); ?></span>
            </button>
            <?php endforeach; ?>
        </div>
        <div class="sh-nav-search">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input type="text" id="shSearch" placeholder="İsim ara…" oninput="vkdSearch(this.value)">
        </div>
    </div>
</nav>
<!-- İÇERİK -->
<div class="sh-main">
    <div class="sh-no-result" id="shNoResult">
        <div class="sh-no-result-icon">🔍</div>
        <h3>Sonuç bulunamadı</h3>
        <p>Aradığınız isimde kayıt bulunmuyor.</p>
    </div>
    <?php
    $ay_tr = ['','Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
    foreach ($yillar as $y => $ys):
        /* Tarih grupları */
        $tarihGruplari = [];
        foreach ($ys as $s) { $tarihGruplari[$s['tarih']][] = $s; }
        $cogulTarihler = array_keys(array_filter($tarihGruplari, function($g){ return count($g) > 1; }));
        $sehirler = count(array_unique(array_column($ys, 'sehir')));
    ?>
    <section class="sh-year-section <?php echo $y === array_key_first($yillar) ? 'show' : ''; ?>"
             id="sec-<?php echo $y; ?>" data-year="<?php echo $y; ?>">
        <div class="sh-year-header">
            <div>
                <div class="sh-year-badge"><?php echo $y; ?></div>
                <h2 class="sh-year-h2"><span class="yno"><?php echo $y; ?></span> Yılı Şehitlerimiz</h2>
            </div>
            <div class="sh-year-count">
                <div class="sh-year-count-n"><?php echo count($ys); ?></div>
                <div class="sh-year-count-l">Şehit</div>
            </div>
        </div>
        <!-- KART GRID -->
        <div class="sh-grid" id="grid-<?php echo $y; ?>">
        <?php foreach ($ys as $s):
            $imgUrl = VKD_PROXY_URL . '?f=' . rawurlencode($s['img']);
            $p      = explode('/', $s['tarih']);
            $tarihYazi = sprintf('%d %s %s', (int)$p[0], $ay_tr[(int)$p[1]], $p[2]);
            $isSameDate = in_array($s['tarih'], $cogulTarihler);
        ?>
            <div class="sh-card<?php echo $isSameDate ? ' same-date' : ''; ?>"
                 data-name="<?php echo mb_strtolower($s['ad']); ?>"
                 data-year="<?php echo $y; ?>"
                 title="<?php echo esc_attr($s['ad'].' — '.$s['rutbe'].' — '.$tarihYazi.' — '.esc_attr($s['sehir'])); ?>">
                <div class="sh-card-img-wrap">
                    <img class="sh-card-img"
                         src="<?php echo esc_url($imgUrl); ?>"
                         alt="<?php echo esc_attr($s['ad']); ?>"
                         loading="lazy"
                         width="160" height="200"
                         onerror="this.src='<?php echo get_template_directory_uri(); ?>/assets/images/placeholder-sehit.jpg'; this.onerror=null;">
                    <div class="sh-card-overlay"></div>
                    <div class="sh-card-date"><?php echo esc_html($tarihYazi); ?></div>
                </div>
                <div class="sh-card-body">
                    <div class="sh-card-name"><?php echo esc_html($s['ad']); ?></div>
                    <div class="sh-card-meta">
                        <span class="sh-card-rutbe"><?php echo esc_html($s['rutbe']); ?></span>
                        <span class="sh-card-sehir"><?php echo esc_html($s['sehir']); ?></span>
                    </div>
                </div>
            </div>
        <?php endforeach; ?>
        </div>
        <!-- YIL ÖZETİ -->
        <div class="sh-year-summary">
            <div class="sh-sum-item">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                <div><span class="sh-sum-item-n"><?php echo count($ys); ?></span><span class="sh-sum-item-txt">Bu yıl şehit</span></div>
            </div>
            <div class="sh-sum-item">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                <div><span class="sh-sum-item-n"><?php echo $sehirler; ?></span><span class="sh-sum-item-txt">Farklı şehir</span></div>
            </div>
            <?php
            $maxT = max(array_map('count', $tarihGruplari));
            $maxTarih = array_search($maxT, array_map('count', $tarihGruplari));
            if ($maxT > 1): $pt = explode('/', $maxTarih); ?>
            <div class="sh-sum-item">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                <div><span class="sh-sum-item-n"><?php echo $maxT; ?></span>
                <span class="sh-sum-item-txt"><?php echo sprintf('%d %s günü', (int)$pt[0], $ay_tr[(int)$pt[1]]); ?></span></div>
            </div>
            <?php endif; ?>
        </div>
    </section>
    <?php endforeach; ?>
</div>
<!-- ALT BANT -->
<div class="sh-bottom">
    <div class="sh-bottom-inner">
        <div class="sh-bottom-star"><span>☽</span><span>★</span><span>☽</span></div>
        <h2 class="sh-bottom-h">Ruhları Şad, Mekânları Cennet Olsun</h2>
        <div class="sh-bottom-line"></div>
        <p class="sh-bottom-p">Vatan Kahramanları Derneği olarak şehitlerimizin aziz hatırasını daima yaşatıyor, ailelerinin yanında olmayı en büyük görevlerimizden biri sayıyoruz.</p>
        <p class="sh-bottom-hadis">
            "Allah yolunda öldürülenleri sakın ölü sanmayın. Aksine onlar diridirler,<br>Rableri katında rızıklara nail olmaktadırlar."
            <small>— Âl-i İmrân Suresi, 169. Ayet</small>
        </p>
    </div>
</div>
</div>
<script>
(function(){
    var activeYear='all';
    window.vkdFilter=function(year,btn){
        activeYear=year;
        document.querySelectorAll('.sh-nav-y').forEach(function(b){b.classList.remove('active');});
        btn.classList.add('active');
        var si=document.getElementById('shSearch'); if(si) si.value='';
        document.querySelectorAll('.sh-year-section').forEach(function(s){
            s.classList.toggle('show',year==='all'||s.dataset.year==year);
        });
        document.querySelectorAll('.sh-card').forEach(function(c){c.classList.remove('hidden');});
        document.getElementById('shNoResult').classList.remove('show');
        var nav=document.getElementById('shNav');
        if(nav) window.scrollTo({top:nav.getBoundingClientRect().top+window.pageYOffset-10,behavior:'smooth'});
    };
    window.vkdSearch=function(val){
        val=val.trim().toLowerCase();
        if(val===''){
            document.querySelectorAll('.sh-year-section').forEach(function(s){
                s.classList.toggle('show',activeYear==='all'||s.dataset.year==activeYear);
            });
            document.querySelectorAll('.sh-card').forEach(function(c){c.classList.remove('hidden');});
            document.getElementById('shNoResult').classList.remove('show');
            return;
        }
        var anyMatch=false;
        document.querySelectorAll('.sh-year-section').forEach(function(sec){
            var match=false;
            sec.querySelectorAll('.sh-card').forEach(function(c){
                var hit=(c.dataset.name||'').indexOf(val)>=0;
                c.classList.toggle('hidden',!hit);
                if(hit){match=true;anyMatch=true;}
            });
            sec.classList.toggle('show',match);
        });
        document.getElementById('shNoResult').classList.toggle('show',!anyMatch);
    };
    document.addEventListener('DOMContentLoaded',function(){
        var f=document.querySelector('.sh-year-section');
        if(f) f.classList.add('show');
    });
}());
</script>
<?php get_footer(); ?>
