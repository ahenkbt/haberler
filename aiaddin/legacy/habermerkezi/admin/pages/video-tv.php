<?php
/**
 * AhenkPress — Video TV Yönetimi
 * Sub: kaynaklar | videolar | kategoriler | ayarlar
 */
defined('ROOT') or die();

// 'tab' parametresi için geriye dönük uyumluluk
$sub = preg_replace('/[^a-z]/', '', $_GET['sub'] ?? $_GET['tab'] ?? 'kaynaklar');
$allowed_subs = ['kaynaklar','videolar','kategoriler','ayarlar'];
if (!in_array($sub, $allowed_subs)) $sub = 'kaynaklar';

/* ── 60+ Hazır Türk YouTube Kanalı ──────────────────── */
$hazir_kanallar = [
    'Haberler' => [
        ['NTV',           'https://www.youtube.com/@NTV',          'UCovtFwMUAEJ1bFHoH4GdEOA'],
        ['CNN Türk',      'https://www.youtube.com/@cnnturk',      'UCHv9GN2hGNkQxhBFTBLK0gQ'],
        ['TRT Haber',     'https://www.youtube.com/@TRTHaber',     'UC6SWnpMPLOrGcSRPYf8SXKQ'],
        ['Sözcü',         'https://www.youtube.com/@sozcu',        'UCR5qnGJMKifQHlzJ8gRqc_Q'],
        ['Haber Global',  'https://www.youtube.com/@HaberGlobal',  'UCwNh7bvZlT7Gt0lHWfC9DcQ'],
        ['A Haber',       'https://www.youtube.com/@AHaber',       'UC1v6sQkc4bJ9hJj5pGVmmFQ'],
        ['Habertürk',     'https://www.youtube.com/@haberturk',    'UCkmMACUKpQCygzLIaXjHH2A'],
        ['TRT World',     'https://www.youtube.com/@TRTWorld',     'UC5_4fPNSMbGYIMX0D6BBLMQ'],
        ['Kanal D Haber', 'https://www.youtube.com/@KanalDHaber',  'UCPWlQ5-PkmMb2MKFG3AyE7A'],
        ['FOX Haber',     'https://www.youtube.com/@foxhaber',     'UCn5Xhs-Y3VHWS-6tKNK5h4A'],
    ],
    'Tarih' => [
        ['DFT Tarih',       'https://www.youtube.com/@DFTTarih',       'UCpKBF3sYm6GGQV3sqiUXuaA'],
        ['Evrim Ağacı',     'https://www.youtube.com/@evrimagaci',      'UC6o2sFGbFLBHD3MRKC2QILA'],
        ['Barış Doster',    'https://www.youtube.com/@barisdoster',     'UC8TGFgLjdC-8hO4Kl23qOaA'],
        ['History TR',      'https://www.youtube.com/@HistoryTR',       'UCbSM8YgKbCUnx8NXqGzNkEg'],
        ['Nexus Tarih',     'https://www.youtube.com/@nexustarih',      'UCRzh5TaVtVW0rIDsIFLb5gQ'],
        ['DFT Mini',        'https://www.youtube.com/@dftmini',         'UCTAqC5s0xzilCH5lx68tVGA'],
        ['Diriliş Tarihi',  'https://www.youtube.com/@DirilistTarihi',  'UC3YBLMJQ4g2jHQnZ8eIz4Hg'],
        ['Anatolia Tarih',  'https://www.youtube.com/@anatolia',        'UCE-nYQ1-2E4OGOu7F2Ep6Yg'],
        ['Kronikleri',      'https://www.youtube.com/@Kronikleri',      'UCiWRLsGHGgwOp4RZBWKLtxA'],
        ['Genel Kültür',    'https://www.youtube.com/@GenelKultur',     'UCIBnRo-1KBbvF9cFJC1xbMg'],
    ],
    'Bilim' => [
        ['Evrim Ağacı Bilim','https://www.youtube.com/@evrimagaci',       'UC6o2sFGbFLBHD3MRKC2QILA'],
        ['HT Bilim',          'https://www.youtube.com/@HTBilim',          'UCp4WPRVGIXcU5H9mAzaIKLg'],
        ['TÜBİTAK',           'https://www.youtube.com/@tubitak',           'UC_RnhQOEQRCf2cEYA8Jn2xA'],
        ['Bilim Genç',        'https://www.youtube.com/@bilimgenc',         'UCUm1HYrSzm2qmHWWLFVlibA'],
        ['Düşünce TV',        'https://www.youtube.com/@dusuncetv',         'UCNP6GYfN0-g2JpLT6bJH9nA'],
        ['Dokunmatik Bilim',  'https://www.youtube.com/@DokunmatikBilim',  'UC1dRYeWVPQHsNIq9GKrCThg'],
        ['Kuantum',           'https://www.youtube.com/@kuantum',           'UCHl3i03VHZwuY0vPJAi2KlQ'],
        ['Astronomi TR',      'https://www.youtube.com/@astronomitr',       'UCCuJp8n3m2nfxzQQ2S5ztHA'],
        ['Biyoloji TR',       'https://www.youtube.com/@biyoloji',          'UCxyJGNdxKVmGUF8gQGPjbgA'],
        ['Fizik TR',          'https://www.youtube.com/@fiziktr',           'UCyJ5mMFaTEQXo2VQrxWOGWA'],
    ],
    'Sağlık' => [
        ['Doktor Takvimi',  'https://www.youtube.com/@doktortakvimi',  'UCZ1ULwCq6pDXHaoBRlYQgMQ'],
        ['NTV Sağlık',      'https://www.youtube.com/@NTVSaglik',      'UCuGHqNHEAe7a6Xx2yBcJhNA'],
        ['Acıbadem',        'https://www.youtube.com/@acibadem',        'UCTQaFwMRglY8xWY8vxmHoQA'],
        ['Medicana',        'https://www.youtube.com/@medicana',        'UCNl9iKVIcxKXp1rMblvqL8Q'],
        ['Memorial',        'https://www.youtube.com/@memorial',        'UCbz3TpIMv82DJrmkfp_a3jQ'],
        ['Dünya Sağlık',    'https://www.youtube.com/@dunyasaglik',    'UCFhW7jGnB0b8TyOxD5uFbJA'],
        ['Sağlık TV',       'https://www.youtube.com/@saglik_tv',      'UCJPGVflJR6rHWmI8bFmB2Cg'],
        ['Beslenme TV',     'https://www.youtube.com/@beslenmeTR',     'UCy7RXPpHExUo1jOxzmh6P6Q'],
        ['Psikoloji TR',    'https://www.youtube.com/@psikolojitr',    'UC8EV2k3w1TBwj0cBj09E-Bg'],
        ['Diyet TV',        'https://www.youtube.com/@diyettv',        'UCH5wOSVCw7yNzV9rrAfh6GA'],
    ],
    'Eğlence' => [
        ['Tiwi',          'https://www.youtube.com/@tiwi',         'UCHu1G1JW0kxU8Z5JwCEz15g'],
        ['Kafalar',       'https://www.youtube.com/@kafalar',      'UCDhb95bLMqUBgIc-jSOxBRA'],
        ['Enes Batur',    'https://www.youtube.com/@EnesBatur',    'UCBPKi_kSm-FvTuHb8T1rqGg'],
        ['Orkun Işıtmak', 'https://www.youtube.com/@orkun',       'UCKkwxS2uTuAe8aFy9gtFYwA'],
        ['Oha Diyorum',   'https://www.youtube.com/@ohadiyorum',  'UC8KEI6cVJ1LU7sAoXQX7fGg'],
        ['NTV Yaşam',     'https://www.youtube.com/@NTVYasam',    'UCxgJRXECpH8T1i7H3N_d02g'],
        ['Kuzey Güney',   'https://www.youtube.com/@kuzeyguney',  'UCf6k0L3Bi7TxoOHBPOApE9A'],
        ['Danla Bilic',   'https://www.youtube.com/@danlabilic',  'UCQF_5LBw_pPsBhMdLmz0S7Q'],
        ['Reynmen',       'https://www.youtube.com/@reynmen',     'UCItbPvqKNFvBk8P3EOZR5Lw'],
        ['Sera Hobil',    'https://www.youtube.com/@serahobil',   'UC_CmG1dU4-fIBwGGSKa9ZUg'],
    ],
    'Spor' => [
        ['beIN Sports TR',  'https://www.youtube.com/@beINSportsTurkiye', 'UCwWcCqV8z2JFKVmfR5KJ1LQ'],
        ['TFF',             'https://www.youtube.com/@TFF',               'UCW0tEkLjwi9nZt1Fy5DkChg'],
        ['NTV Spor',        'https://www.youtube.com/@NTVSpor',           'UC4c2qeHY4xEXOTNUdK5dLuQ'],
        ['Fenerbahçe',      'https://www.youtube.com/@fenerbahce',        'UCVm3cxrR9qH8H6TLKrymzHg'],
        ['Galatasaray',     'https://www.youtube.com/@galatasaray',       'UCJ0GFfXtHx4RhIJnFOVm4Lg'],
        ['Beşiktaş',        'https://www.youtube.com/@besiktas',          'UCwNpGQ1JtXdmL3GgBOEGHTg'],
        ['Trabzonspor',     'https://www.youtube.com/@trabzonspor',       'UCo7S0jzMvKnpqFhI5yEqPeQ'],
        ['A Spor',          'https://www.youtube.com/@ASpor',             'UCaxD5XbVT_DPDz7bZ2ymejg'],
        ['S Sport',         'https://www.youtube.com/@ssport',            'UCG5rAiXIaV8B8JGl7jqsPsQ'],
        ['Spor Arena',      'https://www.youtube.com/@SporArena',         'UCzxqHuNkrYi0JFbPMdYCqDA'],
    ],
];

/* ── AJAX ────────────────────────────────────────────── */
if ($_SERVER['REQUEST_METHOD']==='POST' && !empty($_SERVER['HTTP_X_REQUESTED_WITH'])) {
    Security::verifyCsrf();
    $action = $_POST['action'] ?? '';

    if ($action === 'kanal_ekle') {
        $data = [
            'name'       => trim($_POST['vtv_isim'] ?? ''),
            'slug'       => ap_unique_slug(trim($_POST['vtv_isim']??''), DB::prefix().'video_channels'),
            'channel_id' => trim($_POST['vtv_kanal_id'] ?? ''),
            'platform'   => $_POST['vtv_platform'] ?? 'youtube',
            'stream_url' => trim($_POST['vtv_url'] ?? ''),
            'logo_url'   => trim($_POST['vtv_logo'] ?? ''),
            'category'   => trim($_POST['vtv_kategori'] ?? ''),
            'active'     => 1,
            'is_live'    => (int)($_POST['vtv_canli'] ?? 0),
        ];
        if (!$data['name']) ap_ajax_error('İsim zorunludur');
        DB::execute("INSERT INTO `{p}video_channels` (name,slug,channel_id,platform,stream_url,logo_url,category,active,is_live) VALUES(?,?,?,?,?,?,?,?,?)",
            [$data['name'],$data['slug'],$data['channel_id'],$data['platform'],$data['stream_url'],$data['logo_url'],$data['category'],$data['active'],$data['is_live']]);
        $id = (int)DB::lastInsertId();
        ap_ajax_success(['id' => $id], 'Kanal eklendi: ' . $data['name']);
    }

    if ($action === 'hazir_kanal_ekle') {
        $eklenecekler = json_decode($_POST['kanallar'] ?? '[]', true);
        $eklenen = 0;
        foreach ((array)$eklenecekler as $k) {
            $isim = trim($k['isim'] ?? '');
            $url  = trim($k['url'] ?? '');
            $cid  = trim($k['cid'] ?? '');
            $kat  = trim($k['kat'] ?? '');
            if (!$isim) continue;
            $var = DB::queryValue("SELECT id FROM `{p}video_channels` WHERE channel_id=? OR stream_url=?", [$cid, $url]);
            if (!$var) {
                $slug = ap_unique_slug($isim, DB::prefix().'video_channels');
                DB::execute("INSERT INTO `{p}video_channels` (name,slug,channel_id,platform,stream_url,category,active) VALUES(?,?,?,?,?,?,1)",
                    [$isim, $slug, $cid, 'youtube', $url, $kat]);
                $eklenen++;
            }
        }
        ap_ajax_success(['eklenen' => $eklenen], "{$eklenen} kanal eklendi");
    }

    if ($action === 'kanal_durum') {
        $id  = (int)($_POST['id'] ?? 0);
        $dur = (int)($_POST['active'] ?? 0);
        DB::execute("UPDATE `{p}video_channels` SET active=? WHERE id=?", [$dur, $id]);
        ap_ajax_success(['active' => $dur]);
    }

    if ($action === 'kanal_sil') {
        $id = (int)($_POST['id'] ?? 0);
        DB::execute("DELETE FROM `{p}video_channels` WHERE id=?", [$id]);
        ap_ajax_success(null, 'Kanal silindi');
    }

    if ($action === 'kat_ekle') {
        $name = trim($_POST['kat_isim'] ?? '');
        $color = trim($_POST['kat_renk'] ?? '#3b82f6');
        if (!$name) ap_ajax_error('İsim zorunludur');
        $slug = ap_unique_slug($name, DB::prefix().'video_cats');
        DB::execute("INSERT INTO `{p}video_cats`(name,slug,color) VALUES(?,?,?)", [$name,$slug,$color]);
        ap_ajax_success(['id'=>(int)DB::lastInsertId(),'name'=>$name,'slug'=>$slug,'color'=>$color]);
    }

    if ($action === 'kat_sil') {
        $id = (int)($_POST['id'] ?? 0);
        DB::execute("DELETE FROM `{p}video_cats` WHERE id=?", [$id]);
        ap_ajax_success(null, 'Kategori silindi');
    }

    if ($action === 'video_durum') {
        $id  = (int)($_POST['id'] ?? 0);
        $dur = (int)($_POST['published'] ?? 0);
        DB::execute("UPDATE `{p}videos` SET published=? WHERE id=?", [$dur, $id]);
        ap_ajax_success(['published' => $dur]);
    }

    if ($action === 'video_sil') {
        $id = (int)($_POST['id'] ?? 0);
        DB::execute("DELETE FROM `{p}videos` WHERE id=?", [$id]);
        ap_ajax_success(null, 'Video silindi');
    }

    if ($action === 'ayar_kaydet') {
        $keys = ['vtv_youtube_api_key','vtv_dailymotion_api_key','vtv_video_per_page','vtv_auto_fetch'];
        foreach ($keys as $k) {
            $val = trim($_POST[$k] ?? '');
            DB::execute("INSERT INTO `{p}settings`(`key`,`val`) VALUES(?,?) ON DUPLICATE KEY UPDATE `val`=?", [$k,$val,$val]);
        }
        ap_ajax_success(null, 'Ayarlar kaydedildi');
    }

    // ── YouTube Kanal Bilgisi Otomatik Çek ──────────────────────────
    if ($action === 'youtube_kanal_bilgi') {
        $rawUrl = trim($_POST['url'] ?? '');
        if (!$rawUrl) ap_ajax_error('URL boş bırakılamaz');

        // @handle veya channel URL'sinden handle/id çıkar
        $handle     = '';
        $channelId  = '';
        $playlistId = '';

        if (preg_match('/[?&]list=([A-Za-z0-9_-]+)/', $rawUrl, $m)) {
            // Playlist URL
            $playlistId = $m[1];
        } elseif (preg_match('#/channel/(UC[A-Za-z0-9_-]+)#', $rawUrl, $m)) {
            $channelId = $m[1];
        } elseif (preg_match('#/@([A-Za-z0-9_.-]+)#', $rawUrl, $m)) {
            $handle = $m[1];
        } elseif (preg_match('#/c/([A-Za-z0-9_.-]+)#', $rawUrl, $m)) {
            $handle = $m[1];
        } elseif (preg_match('#/user/([A-Za-z0-9_.-]+)#', $rawUrl, $m)) {
            $handle = $m[1];
        } elseif (preg_match('#@([A-Za-z0-9_.-]+)$#', $rawUrl, $m)) {
            $handle = $m[1];
        }

        // Playlist modunda
        if ($playlistId) {
            $apiKey = DB::setting('vtv_youtube_api_key', '');
            $title = '';
            $thumb = '';
            if ($apiKey) {
                $apiUrl = 'https://www.googleapis.com/youtube/v3/playlists?part=snippet&id=' . urlencode($playlistId) . '&key=' . urlencode($apiKey);
                $resp = @file_get_contents($apiUrl);
                if ($resp) {
                    $data = json_decode($resp, true);
                    $item = $data['items'][0] ?? null;
                    if ($item) {
                        $title = $item['snippet']['title'] ?? '';
                        $thumb = $item['snippet']['thumbnails']['high']['url'] ?? $item['snippet']['thumbnails']['default']['url'] ?? '';
                    }
                }
            }
            ap_ajax_success([
                'tur'        => 'playlist',
                'isim'       => $title ?: 'YouTube Playlist',
                'channel_id' => $playlistId,
                'logo_url'   => $thumb,
                'embed_url'  => 'https://www.youtube.com/embed?listType=playlist&list=' . $playlistId . '&autoplay=1',
                'aciklama'   => '',
            ]);
        }

        // Kanal modunda: önce YouTube Data API v3 dene
        $apiKey = DB::setting('vtv_youtube_api_key', '');
        if ($apiKey && ($channelId || $handle)) {
            $param  = $channelId ? 'id=' . urlencode($channelId) : 'forHandle=' . urlencode($handle);
            $apiUrl = 'https://www.googleapis.com/youtube/v3/channels?part=snippet&' . $param . '&key=' . urlencode($apiKey);
            $resp   = @file_get_contents($apiUrl);
            if ($resp) {
                $data = json_decode($resp, true);
                $item = $data['items'][0] ?? null;
                if ($item) {
                    $sn = $item['snippet'];
                    ap_ajax_success([
                        'tur'        => 'kanal',
                        'isim'       => $sn['title'] ?? '',
                        'channel_id' => $item['id'],
                        'logo_url'   => $sn['thumbnails']['high']['url'] ?? $sn['thumbnails']['medium']['url'] ?? $sn['thumbnails']['default']['url'] ?? '',
                        'aciklama'   => mb_substr($sn['description'] ?? '', 0, 200),
                    ]);
                }
            }
        }

        // API anahtarı yok veya başarısız → YouTube sayfasını scrape et
        $fetchUrl = $channelId
            ? 'https://www.youtube.com/channel/' . $channelId
            : 'https://www.youtube.com/@' . $handle;

        $ctx = stream_context_create(['http' => [
            'method'  => 'GET',
            'header'  => "User-Agent: Mozilla/5.0 (compatible; AhenkPress)\r\n",
            'timeout' => 8,
        ]]);
        $html = @file_get_contents($fetchUrl, false, $ctx);
        if (!$html) ap_ajax_error('YouTube sayfasına erişilemedi. Lütfen elle doldurun veya API anahtarı ekleyin.');

        // Kanal ID'yi çıkar
        if (!$channelId) {
            preg_match('#"externalId":"(UC[A-Za-z0-9_-]+)"#', $html, $m);
            $channelId = $m[1] ?? '';
            if (!$channelId) {
                preg_match('#/channel/(UC[A-Za-z0-9_-]+)#', $html, $m);
                $channelId = $m[1] ?? '';
            }
        }

        // Kanal adı
        preg_match('#"title":"([^"]{2,100})"#', $html, $mn);
        $isim = html_entity_decode($mn[1] ?? '');
        if (!$isim) {
            preg_match('#<meta property="og:title" content="([^"]+)"#', $html, $mn2);
            $isim = html_entity_decode($mn2[1] ?? '');
        }

        // Logo (profil resmi)
        preg_match('#"avatar"\s*:\s*\{"thumbnails":\[.*?"url":"([^"]+)"#', $html, $ml);
        $logo = $ml[1] ?? '';
        if (!$logo) {
            preg_match('#<meta property="og:image" content="([^"]+)"#', $html, $ml2);
            $logo = $ml2[1] ?? '';
        }
        // YouTube yt3 URL'leri bazen escaped unicode içerir
        $logo = stripcslashes($logo);

        // Açıklama
        preg_match('#"description":"([^"]{0,300})"#', $html, $md);
        $aciklama = html_entity_decode($md[1] ?? '');

        ap_ajax_success([
            'tur'        => 'kanal',
            'isim'       => $isim ?: ($handle ? '@' . $handle : 'YouTube Kanalı'),
            'channel_id' => $channelId,
            'logo_url'   => $logo,
            'aciklama'   => mb_substr($aciklama, 0, 200),
        ]);
    }

    ap_ajax_error('Bilinmeyen işlem');
}

/* ── Kanal/Video/Kategori Sil (GET) ─────────────────── */
if (isset($_GET['sil_kanal'])) {
    Security::verifyCsrf($_GET['_csrf'] ?? '');
    DB::execute("DELETE FROM `{p}video_channels` WHERE id=?", [(int)$_GET['sil_kanal']]);
    ap_redirect('/admin/?page=video-tv&sub=kaynaklar&silindi=1');
}
if (isset($_GET['sil_video'])) {
    Security::verifyCsrf($_GET['_csrf'] ?? '');
    DB::execute("DELETE FROM `{p}videos` WHERE id=?", [(int)$_GET['sil_video']]);
    ap_redirect('/admin/?page=video-tv&sub=videolar&silindi=1');
}

/* ─── NAV tabs helper ──────────────────────────────── */
function vtv_nav(string $current): string {
    $tabs = ['kaynaklar'=>'📡 Kaynaklar','videolar'=>'🎬 Videolar','kategoriler'=>'🗂 Kategoriler','ayarlar'=>'⚙ Ayarlar'];
    $html = '<div class="vtv-tabs">';
    foreach ($tabs as $k=>$l) {
        $cls = $k===$current ? 'vtv-tab active' : 'vtv-tab';
        $html .= '<a href="/admin/?page=video-tv&sub='.$k.'" class="'.$cls.'">'.$l.'</a>';
    }
    return $html . '</div>';
}

/* ═══════════════════════════════════════
   SAYFA: KAYNAKLAR
═══════════════════════════════════════ */
if ($sub === 'kaynaklar') {
    $kanallar = DB::query("SELECT * FROM `{p}video_channels` ORDER BY sort_order ASC, id DESC") ?: [];
    $cats     = DB::query("SELECT DISTINCT category FROM `{p}video_channels` WHERE category!='' ORDER BY category") ?: [];
    $fkat     = trim($_GET['kat'] ?? '');

    ap_admin_layout('Video TV — Kaynaklar', function() use ($kanallar,$cats,$fkat,$hazir_kanallar) {
?>
<style>
.ahbw{max-width:1300px}
.vtv-hd{background:linear-gradient(135deg,#0f0f23,#1a1a3e);color:#fff;padding:20px 24px;border-radius:10px;margin-bottom:14px}
.vtv-hd-logo{font-size:22px;font-weight:900;margin-bottom:4px}.vtv-red{color:#e94560}.vtv-blue{color:#3b82f6}
.vtv-hd h1{margin:0;font-size:17px;font-weight:700}
.vtv-tabs{display:flex;gap:0;margin-bottom:18px;border-bottom:2px solid #e5e7eb}
.vtv-tab{padding:10px 18px;font-size:13px;font-weight:600;color:#6b7280;text-decoration:none;border-bottom:2px solid transparent;margin-bottom:-2px;transition:.15s}
.vtv-tab:hover,.vtv-tab.active{color:#e94560;border-bottom-color:#e94560}
.vtv-grid{display:grid;grid-template-columns:350px 1fr;gap:18px}
@media(max-width:900px){.vtv-grid{grid-template-columns:1fr}}
.panel{background:#fff;border:1px solid #e5e7eb;border-radius:10px;margin-bottom:14px;overflow:hidden}
.ph{background:#f9fafb;border-bottom:1px solid #e5e7eb;padding:11px 16px;font-weight:700;font-size:14px;color:#374151;display:flex;align-items:center;justify-content:space-between}
.pb{padding:16px}
.f-row{margin-bottom:10px}
.f-row label{display:block;font-size:12px;font-weight:600;margin-bottom:3px;color:#6b7280;text-transform:uppercase;letter-spacing:.5px}
.f-row input,.f-row select{width:100%;padding:7px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:13px}
.f-row small{font-size:11px;color:#9ca3af;margin-top:2px;display:block}
.btn-ekle-k{width:100%;background:#e94560!important;color:#fff!important;border-color:#e94560!important;font-weight:700;padding:10px}
.platform-rozet{padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700}
.yt{background:#fee2e2;color:#991b1b}.dm{background:#dbeafe;color:#1e40af}
.kanlist{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px}
.kankart{background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:12px;position:relative}
.kankart.pasif{opacity:.6}
.kankart-ust{display:flex;align-items:center;gap:10px;margin-bottom:8px}
.kankart-logo{width:38px;height:38px;border-radius:50%;object-fit:cover;background:#f3f4f6;display:flex;align-items:center;justify-content:center;font-size:18px}
.kankart-isim{font-size:14px;font-weight:700;color:#1a1a2e}
.kankart-kat{font-size:11px;color:#9ca3af}
.kankart-eylem{display:flex;gap:4px;margin-top:8px}
.tog{position:relative;display:inline-block;width:34px;height:18px;cursor:pointer}
.tog input{opacity:0;width:0;height:0}
.tog-sl{position:absolute;inset:0;background:#d1d5db;border-radius:18px;transition:.2s}
.tog-sl:before{content:'';position:absolute;width:14px;height:14px;left:2px;top:2px;background:#fff;border-radius:50%;transition:.2s}
.tog input:checked+.tog-sl{background:#22c55e}
.tog input:checked+.tog-sl:before{transform:translateX(16px)}
.hazir-kutu{margin-bottom:14px}
.hazir-kat{margin-bottom:12px}
.hazir-kat-baslik{font-size:13px;font-weight:700;color:#374151;margin-bottom:6px;display:flex;align-items:center;justify-content:space-between}
.hazir-grid{display:flex;flex-wrap:wrap;gap:4px}
.hbtn{padding:4px 10px;font-size:12px;border:1px solid #d1d5db;border-radius:16px;background:#fff;cursor:pointer;color:#374151;transition:.15s}
.hbtn:hover{background:#e94560;color:#fff;border-color:#e94560}
.hbtn.eklendi{background:#dcfce7!important;color:#166534!important;border-color:#86efac!important}
.toplu-btn{font-size:12px;background:#f9fafb;border:1px solid #d1d5db;border-radius:6px;padding:4px 10px;cursor:pointer}
.toplu-btn:hover{background:#e94560;color:#fff;border-color:#e94560}
.vtv-bar{display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;align-items:center}
.silindi-msg{background:#dcfce7;color:#166534;padding:10px 16px;border-radius:6px;margin-bottom:14px;font-weight:600}
.bos{text-align:center;padding:40px;background:#f9fafb;border-radius:10px;color:#9ca3af}
.ajax-out{margin-top:8px;padding:8px 12px;border-radius:6px;font-size:13px;font-weight:600;display:none}
.ok{background:#dcfce7;color:#166534}.err{background:#fee2e2;color:#991b1b}
</style>
<div class="ahbw">
  <div class="vtv-hd">
    <div class="vtv-hd-logo">📺 <span class="vtv-blue">VİDEO</span> <span class="vtv-red">TV</span></div>
    <h1>Video TV — Kaynaklar</h1>
  </div>
  <?= vtv_nav('kaynaklar') ?>
  <?php if(isset($_GET['silindi'])): ?><div class="silindi-msg">Kanal silindi.</div><?php endif; ?>

  <div class="vtv-grid">
    <!-- SOL: Ekle + Hazır Kanallar -->
    <div>
      <div class="panel">
        <div class="ph">➕ Yeni Kaynak Ekle</div>
        <div class="pb">

          <!-- Platform Seç -->
          <div class="f-row">
            <label>Platform</label>
            <select id="vtvPlatform" onchange="vtvPlatformDegis(this.value)">
              <option value="youtube">▶ YouTube Kanal / Playlist</option>
              <option value="dailymotion">📹 Dailymotion</option>
              <option value="m3u8">📡 M3U8 Canlı Yayın</option>
              <option value="iframe">🔗 iFrame Embed</option>
            </select>
          </div>

          <!-- YouTube bölümü -->
          <div id="vtvYtBlok">
            <div style="background:#fef3c7;border:1px solid #fbbf24;border-radius:8px;padding:10px 12px;margin-bottom:12px">
              <div style="font-size:12px;font-weight:700;color:#92400e;margin-bottom:6px">🔗 YouTube URL veya @handle girin, bilgiler otomatik dolar</div>
              <div style="display:flex;gap:6px">
                <input type="text" id="vtvYtUrl" placeholder="https://www.youtube.com/@SozcuTV veya playlist linki"
                       style="flex:1;padding:7px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:13px">
                <button class="button" id="vtvCekBtn" onclick="vtvKanalCek()" style="white-space:nowrap;background:#e94560;color:#fff;border-color:#e94560;font-weight:700">
                  🔍 Doldur
                </button>
              </div>
              <div id="vtvCekOut" style="display:none;margin-top:6px;font-size:12px;padding:5px 8px;border-radius:4px"></div>
            </div>

            <!-- Önizleme logosu -->
            <div id="vtvLogoOnizle" style="display:none;margin-bottom:10px;text-align:center">
              <img id="vtvLogoImg" src="" alt="" style="width:64px;height:64px;border-radius:50%;object-fit:cover;border:2px solid #e5e7eb">
            </div>
          </div>

          <!-- Ortak alanlar -->
          <div class="f-row">
            <label>Kanal / Kaynak Adı <span style="color:#e94560">*</span></label>
            <input type="text" id="vtvIsim" placeholder="örn: Sözcü TV">
          </div>
          <div class="f-row" id="vtvUrlRow">
            <label id="vtvUrlLabel">Yayın URL'si (M3U8/iFrame)</label>
            <input type="text" id="vtvUrl" placeholder="https://...">
            <small>YouTube seçildiğinde bu alan playlist/canlı URL'si için kullanılır</small>
          </div>
          <div class="f-row" id="vtvKanalIdRow">
            <label>Kanal/Playlist ID</label>
            <input type="text" id="vtvKanalId" placeholder="UC... veya PL...">
            <small>YouTube URL'si girerseniz otomatik dolar</small>
          </div>
          <div class="f-row">
            <label>Logo URL <span style="font-size:11px;font-weight:400;text-transform:none;color:#9ca3af">(YouTube'dan otomatik çekilir)</span></label>
            <input type="url" id="vtvLogo" placeholder="https://... (otomatik veya elle girin)">
          </div>
          <div class="f-row">
            <label>Kategori</label>
            <select id="vtvKategori">
              <option value="">— Kategori Seç —</option>
              <?php foreach(['Haberler','Tarih','Bilim','Sağlık','Eğlence','Spor'] as $k): ?>
              <option value="<?= e($k) ?>"><?= e($k) ?></option>
              <?php endforeach; ?>
              <?php foreach($cats as $c): if(!in_array($c['category'],['Haberler','Tarih','Bilim','Sağlık','Eğlence','Spor'])): ?>
              <option value="<?= e($c['category']) ?>"><?= e($c['category']) ?></option>
              <?php endif; endforeach; ?>
            </select>
          </div>
          <div class="f-row" style="display:flex;align-items:center;gap:8px">
            <label style="margin:0">Canlı Yayın</label>
            <label class="tog"><input type="checkbox" id="vtvCanli"><span class="tog-sl"></span></label>
          </div>
          <button class="button btn-ekle-k" id="vtvEkleBtn">➕ Kaynağı Ekle</button>
          <div class="ajax-out" id="vtvEkleOut"></div>
        </div>
      </div>

      <!-- HAZIR KANALLAR -->
      <div class="panel">
        <div class="ph">📚 Hazır Türk YouTube Kanalları <span style="font-size:12px;font-weight:400;color:#9ca3af">60+ Kanal</span></div>
        <div class="pb hazir-kutu">
          <?php foreach($hazir_kanallar as $kat=>$kanallar_list): ?>
          <div class="hazir-kat">
            <div class="hazir-kat-baslik">
              <span><?= e($kat) ?></span>
              <button class="toplu-btn" data-kat="<?= e($kat) ?>">📥 Hepsini Ekle</button>
            </div>
            <div class="hazir-grid">
              <?php foreach($kanallar_list as [$isim,$url,$cid]): ?>
              <button class="hbtn" data-isim="<?= e($isim) ?>" data-url="<?= e($url) ?>" data-cid="<?= e($cid) ?>" data-kat="<?= e($kat) ?>">
                + <?= e($isim) ?>
              </button>
              <?php endforeach; ?>
            </div>
          </div>
          <?php endforeach; ?>
        </div>
      </div>
    </div>

    <!-- SAĞ: Kanal Listesi -->
    <div>
      <div class="panel">
        <div class="ph">
          <span>Mevcut Kaynaklar (<?= count($kanallar) ?>)</span>
          <div style="display:flex;gap:8px;align-items:center">
            <form method="GET" style="display:flex;gap:6px">
              <input type="hidden" name="page" value="video-tv">
              <input type="hidden" name="sub" value="kaynaklar">
              <select name="kat" onchange="this.form.submit()" style="font-size:12px;padding:4px 8px">
                <option value="">Tüm Kategoriler</option>
                <?php foreach(array_keys($hazir_kanallar) as $k): ?>
                <option value="<?= e($k) ?>" <?= $fkat===$k?'selected':'' ?>><?= e($k) ?></option>
                <?php endforeach; ?>
              </select>
            </form>
          </div>
        </div>
        <div class="pb">
          <?php
          $gorunen = $fkat ? array_filter($kanallar, fn($c) => $c['category']===$fkat) : $kanallar;
          if (empty($gorunen)): ?>
          <div class="bos">
            <p>Henüz kaynak eklenmedi.</p>
            <p>Sol panelden kaynak ekleyebilir veya hazır kanallardan seçebilirsiniz.</p>
          </div>
          <?php else: ?>
          <div class="kanlist">
            <?php foreach($gorunen as $k): $csrf=Security::csrf(); ?>
            <div class="kankart <?= $k['active']?'':'pasif' ?>" id="kankart-<?= $k['id'] ?>">
              <div class="kankart-ust">
                <div class="kankart-logo">
                  <?php if($k['logo_url']): ?>
                  <img src="<?= e($k['logo_url']) ?>" alt="" style="width:38px;height:38px;border-radius:50%;object-fit:cover">
                  <?php else: ?>
                  <?= $k['platform']==='youtube' ? '▶' : '🎬' ?>
                  <?php endif; ?>
                </div>
                <div>
                  <div class="kankart-isim"><?= e($k['name']) ?></div>
                  <div class="kankart-kat">
                    <span class="platform-rozet <?= $k['platform']==='youtube'?'yt':'dm' ?>"><?= strtoupper($k['platform']) ?></span>
                    <?php if($k['category']): ?><span style="font-size:11px;color:#9ca3af"> &bull; <?= e($k['category']) ?></span><?php endif; ?>
                    <?php if($k['is_live']): ?> <span style="color:#e94560;font-size:11px">🔴 Canlı</span><?php endif; ?>
                  </div>
                </div>
                <div style="margin-left:auto">
                  <label class="tog">
                    <input type="checkbox" class="kanal-dur-tog" data-id="<?= $k['id'] ?>" <?= $k['active']?'checked':'' ?>>
                    <span class="tog-sl"></span>
                  </label>
                </div>
              </div>
              <?php if($k['stream_url']): ?>
              <div style="font-size:11px;color:#9ca3af;word-break:break-all;margin-bottom:6px"><?= e(substr($k['stream_url'],0,60)).(strlen($k['stream_url'])>60?'...':'') ?></div>
              <?php endif; ?>
              <div class="kankart-eylem">
                <button class="button" style="font-size:11px;padding:3px 8px" onclick="window.open('<?= e($k['stream_url']?: 'https://youtube.com/channel/'.$k['channel_id']) ?>','_blank')">▶ İzle</button>
                <a href="/admin/?page=video-tv&sub=kaynaklar&sil_kanal=<?= $k['id'] ?>&_csrf=<?= urlencode($csrf) ?>" class="button" style="font-size:11px;padding:3px 8px;color:#991b1b" onclick="return confirm('<?= e($k['name']) ?> silinecek. Emin misiniz?')">🗑</a>
              </div>
            </div>
            <?php endforeach; ?>
          </div>
          <?php endif; ?>
        </div>
      </div>
    </div>
  </div>
</div>
<script>
(function(){
  var C=document.querySelector('meta[name="csrf"]')?.content||'';
  function post(d,cb){
    d._token=C;
    fetch('/admin/?page=video-tv',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','X-Requested-With':'XMLHttpRequest'},body:new URLSearchParams(d)}).then(r=>r.json()).then(cb).catch(e=>cb({success:false,message:String(e)}));
  }

  // ── Platform değiştirince form alanlarını güncelle
  window.vtvPlatformDegis = function(val) {
    var ytBlok = document.getElementById('vtvYtBlok');
    var urlRow = document.getElementById('vtvUrlRow');
    var kidRow = document.getElementById('vtvKanalIdRow');
    var urlLabel = document.getElementById('vtvUrlLabel');
    if (val === 'youtube') {
      ytBlok.style.display = '';
      urlRow.style.display = 'none';
      kidRow.style.display = '';
    } else if (val === 'm3u8' || val === 'iframe') {
      ytBlok.style.display = 'none';
      urlRow.style.display = '';
      kidRow.style.display = 'none';
      urlLabel.textContent = val === 'm3u8' ? 'M3U8 Akış URL\'si *' : 'iFrame URL\'si *';
    } else if (val === 'dailymotion') {
      ytBlok.style.display = 'none';
      urlRow.style.display = '';
      kidRow.style.display = '';
      urlLabel.textContent = 'Dailymotion Kanal URL\'si';
    }
  };
  // Başlangıç durumu
  vtvPlatformDegis('youtube');

  // ── YouTube kanal bilgisi otomatik çek
  window.vtvKanalCek = function() {
    var url = document.getElementById('vtvYtUrl').value.trim();
    if (!url) { alert('YouTube URL veya @handle girin'); return; }
    var btn = document.getElementById('vtvCekBtn');
    var out = document.getElementById('vtvCekOut');
    btn.disabled = true; btn.textContent = '⏳ Çekiliyor...';
    out.style.display = 'block';
    out.style.background = '#fef3c7'; out.style.color = '#92400e';
    out.textContent = 'YouTube\'dan bilgiler alınıyor...';
    post({action:'youtube_kanal_bilgi', url:url}, function(r) {
      btn.disabled = false; btn.textContent = '🔍 Doldur';
      if (r.success && r.data) {
        var d = r.data;
        out.style.background = '#dcfce7'; out.style.color = '#166534';
        out.textContent = '✓ Bilgiler dolduruldu: ' + (d.isim || '');
        if (d.isim) document.getElementById('vtvIsim').value = d.isim;
        if (d.channel_id) document.getElementById('vtvKanalId').value = d.channel_id;
        if (d.logo_url) {
          document.getElementById('vtvLogo').value = d.logo_url;
          var img = document.getElementById('vtvLogoImg');
          img.src = d.logo_url;
          document.getElementById('vtvLogoOnizle').style.display = '';
        }
        if (d.tur === 'playlist') {
          document.getElementById('vtvUrl').value = d.embed_url || '';
        }
      } else {
        out.style.background = '#fee2e2'; out.style.color = '#991b1b';
        out.textContent = '✗ ' + (r.message || 'Bilgi alınamadı. Lütfen elle doldurun veya Ayarlar\'dan YouTube API anahtarı ekleyin.');
      }
    });
  };

  // Enter tuşuyla da çek
  document.getElementById('vtvYtUrl')?.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') { e.preventDefault(); vtvKanalCek(); }
  });

  // ── Tekil kaynak ekle
  document.getElementById('vtvEkleBtn')?.addEventListener('click',function(){
    var isim=document.getElementById('vtvIsim').value.trim();
    var platform=document.getElementById('vtvPlatform').value;
    var url=document.getElementById('vtvUrl').value.trim();
    var kid=document.getElementById('vtvKanalId').value.trim();
    if(!isim){alert('Kanal adı zorunludur');return;}
    if((platform==='m3u8'||platform==='iframe')&&!url){alert('Yayın URL\'si zorunludur');return;}
    this.disabled=true;var s=this;
    var out=document.getElementById('vtvEkleOut');
    post({
      action:'kanal_ekle',
      vtv_isim:isim,
      vtv_platform:platform,
      vtv_url:url,
      vtv_kanal_id:kid,
      vtv_kategori:document.getElementById('vtvKategori').value,
      vtv_logo:document.getElementById('vtvLogo').value,
      vtv_canli:document.getElementById('vtvCanli').checked?1:0,
    },function(r){
      s.disabled=false;
      out.style.display='block';out.className='ajax-out '+(r.success?'ok':'err');out.textContent=r.message;
      if(r.success){
        ['vtvIsim','vtvUrl','vtvKanalId','vtvLogo','vtvYtUrl'].forEach(function(id){var el=document.getElementById(id);if(el)el.value='';});
        document.getElementById('vtvLogoOnizle').style.display='none';
        document.getElementById('vtvCekOut').style.display='none';
        setTimeout(()=>location.reload(),1000);
      }
    });
  });

  // ── Hazır kanal tek tıkla ekle
  document.querySelectorAll('.hbtn').forEach(b=>{
    b.addEventListener('click',function(){
      var s=this;
      this.disabled=true;
      post({
        action:'hazir_kanal_ekle',
        kanallar:JSON.stringify([{isim:this.dataset.isim,url:this.dataset.url,cid:this.dataset.cid,kat:this.dataset.kat}])
      },function(r){
        s.disabled=false;
        if(r.success){s.className='hbtn eklendi';s.textContent='✓ '+s.textContent.replace('+ ','');}
      });
    });
  });

  // ── Kategori hepsini ekle
  document.querySelectorAll('.toplu-btn').forEach(b=>{
    b.addEventListener('click',function(){
      var kat=this.dataset.kat;
      var kanallar=Array.from(document.querySelectorAll('.hbtn[data-kat="'+kat+'"]')).map(function(el){
        return{isim:el.dataset.isim,url:el.dataset.url,cid:el.dataset.cid,kat:el.dataset.kat};
      });
      if(!kanallar.length)return;
      this.disabled=true;var s=this;s.textContent='⏳ Ekleniyor...';
      post({action:'hazir_kanal_ekle',kanallar:JSON.stringify(kanallar)},function(r){
        s.disabled=false;s.textContent='📥 Hepsini Ekle';
        if(r.success&&r.data&&r.data.eklenen>0){
          document.querySelectorAll('.hbtn[data-kat="'+kat+'"]').forEach(el=>{ el.className='hbtn eklendi'; });
          alert(r.message);
          setTimeout(()=>location.reload(),500);
        } else {
          alert(r.message||'Eklendi');
        }
      });
    });
  });

  // ── Kanal durum toggle
  document.querySelectorAll('.kanal-dur-tog').forEach(cb=>{
    cb.addEventListener('change',function(){
      var id=this.dataset.id,dur=this.checked?1:0;
      post({action:'kanal_durum',id:id,active:dur},function(r){});
      document.getElementById('kankart-'+id)?.classList.toggle('pasif',!this.checked);
    });
  });
})();
</script>
<?php
    });
    return;
}

/* ═══════════════════════════════════════
   SAYFA: VİDEOLAR
═══════════════════════════════════════ */
if ($sub === 'videolar') {
    $page   = max(1,(int)($_GET['p'] ?? 1));
    $limit  = 30;
    $offset = ($page - 1) * $limit;
    // Tablo henüz oluşturulmamışsa güvenli şekilde yakala
    try {
        $total  = (int)DB::queryValue("SELECT COUNT(*) FROM `{p}videos`");
        $videos = DB::query("SELECT * FROM `{p}videos` ORDER BY id DESC LIMIT {$limit} OFFSET {$offset}") ?: [];
    } catch (\Throwable) {
        $total = 0; $videos = [];
    }

    ap_admin_layout('Video TV — Videolar', function() use ($videos,$total,$page,$limit) {
?>
<style>
.ahbw{max-width:1200px}
.vtv-hd{background:linear-gradient(135deg,#0f0f23,#1a1a3e);color:#fff;padding:20px 24px;border-radius:10px;margin-bottom:14px}
.vtv-hd-logo{font-size:22px;font-weight:900;margin-bottom:4px}.vtv-blue{color:#3b82f6}.vtv-red{color:#e94560}
.vtv-hd h1{margin:0;font-size:17px;font-weight:700}
.vtv-tabs{display:flex;gap:0;margin-bottom:18px;border-bottom:2px solid #e5e7eb}
.vtv-tab{padding:10px 18px;font-size:13px;font-weight:600;color:#6b7280;text-decoration:none;border-bottom:2px solid transparent;margin-bottom:-2px;transition:.15s}
.vtv-tab:hover,.vtv-tab.active{color:#e94560;border-bottom-color:#e94560}
.bos{text-align:center;padding:40px;background:#f9fafb;border-radius:10px;color:#9ca3af}
.video-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px}
.vkart{background:#fff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden}
.vkart img{width:100%;aspect-ratio:16/9;object-fit:cover;background:#f3f4f6}
.vkart-icerik{padding:8px}
.vkart-baslik{font-size:13px;font-weight:600;color:#1a1a2e;margin-bottom:4px;line-height:1.3}
.vkart-meta{font-size:11px;color:#9ca3af}
.vkart-eylem{display:flex;gap:4px;padding:4px 8px 8px}
.sil-btn{background:#fee2e2!important;color:#991b1b!important;font-size:11px!important;padding:3px 8px!important}
.tog-btn{border:none;border-radius:20px;padding:3px 10px;cursor:pointer;font-size:11px;font-weight:700}
.tog-a{background:#dcfce7;color:#166534}.tog-p{background:#f3f4f6;color:#6b7280}
.pagination{display:flex;gap:4px;flex-wrap:wrap;margin-top:14px}
.page-link{padding:5px 10px;border:1px solid #d1d5db;border-radius:4px;font-size:13px;color:#374151;text-decoration:none}
.page-link.active,.page-link:hover{background:#e94560;color:#fff;border-color:#e94560}
.silindi-msg{background:#dcfce7;color:#166534;padding:10px 16px;border-radius:6px;margin-bottom:14px;font-weight:600}
</style>
<div class="ahbw">
  <div class="vtv-hd">
    <div class="vtv-hd-logo">📺 <span class="vtv-blue">VİDEO</span> <span class="vtv-red">TV</span></div>
    <h1>Video TV — Videolar</h1>
  </div>
  <?= vtv_nav('videolar') ?>
  <?php if(isset($_GET['silindi'])): ?><div class="silindi-msg">Video silindi.</div><?php endif; ?>
  <p style="color:#6b7280;margin-bottom:14px">Toplam <strong><?= number_format($total) ?></strong> video</p>
  <?php if(empty($videos)): ?>
  <div class="bos"><p>Henüz video çekilmedi. Kaynaklar sayfasından kanal ekleyip cron çalıştırın.</p></div>
  <?php else: ?>
  <div class="video-grid">
    <?php foreach($videos as $v): $csrf=Security::csrf(); ?>
    <div class="vkart" id="vkart-<?= $v['id'] ?>">
      <?php if($v['thumbnail']): ?>
      <img src="<?= e($v['thumbnail']) ?>" alt="" loading="lazy">
      <?php else: ?>
      <div style="width:100%;aspect-ratio:16/9;background:#1a1a3e;display:flex;align-items:center;justify-content:center;font-size:28px">▶</div>
      <?php endif; ?>
      <div class="vkart-icerik">
        <div class="vkart-baslik"><?= e(mb_substr($v['title'],0,60)) ?><?= mb_strlen($v['title'])>60?'...':'' ?></div>
        <div class="vkart-meta"><?= strtoupper($v['platform']) ?> &bull; <?= ap_date($v['created_at'],'d.m.Y') ?></div>
        <?php if($v['category']): ?><div class="vkart-meta"><?= e($v['category']) ?></div><?php endif; ?>
      </div>
      <div class="vkart-eylem">
        <button class="tog-btn <?= $v['published']?'tog-a':'tog-p' ?> vid-dur-tog" data-id="<?= $v['id'] ?>">
          <?= $v['published']?'✓ Yayında':'✗ Gizli' ?>
        </button>
        <a href="/admin/?page=video-tv&sub=videolar&sil_video=<?= $v['id'] ?>&_csrf=<?= urlencode($csrf) ?>"
           class="button sil-btn" onclick="return confirm('Silinecek. Emin misiniz?')">🗑</a>
      </div>
    </div>
    <?php endforeach; ?>
  </div>
  <?= ap_pagination($total, $limit, $page) ?>
  <?php endif; ?>
</div>
<script>
(function(){
  var C=document.querySelector('meta[name="csrf"]')?.content||'';
  document.querySelectorAll('.vid-dur-tog').forEach(b=>{
    b.addEventListener('click',function(){
      var id=this.dataset.id,cur=this.classList.contains('tog-a'),yeni=cur?0:1,s=this;
      fetch('/admin/?page=video-tv',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','X-Requested-With':'XMLHttpRequest'},body:new URLSearchParams({action:'video_durum',id:id,published:yeni,_token:C})}).then(r=>r.json()).then(function(r){
        if(r.success){s.className='tog-btn '+(yeni?'tog-a':'tog-p')+' vid-dur-tog';s.textContent=yeni?'✓ Yayında':'✗ Gizli';}
      });
    });
  });
})();
</script>
<?php
    });
    return;
}

/* ═══════════════════════════════════════
   SAYFA: KATEGORİLER
═══════════════════════════════════════ */
if ($sub === 'kategoriler') {
    $video_cats = DB::query("SELECT vc.*, (SELECT COUNT(*) FROM `{p}videos` v WHERE v.category=vc.slug) as video_say FROM `{p}video_cats` vc ORDER BY vc.sort_order ASC, vc.name ASC") ?: [];

    ap_admin_layout('Video TV — Kategoriler', function() use ($video_cats) {
?>
<style>
.ahbw{max-width:1000px}
.vtv-hd{background:linear-gradient(135deg,#0f0f23,#1a1a3e);color:#fff;padding:20px 24px;border-radius:10px;margin-bottom:14px}
.vtv-hd-logo{font-size:22px;font-weight:900;margin-bottom:4px}.vtv-blue{color:#3b82f6}.vtv-red{color:#e94560}
.vtv-hd h1{margin:0;font-size:17px;font-weight:700}
.vtv-tabs{display:flex;gap:0;margin-bottom:18px;border-bottom:2px solid #e5e7eb}
.vtv-tab{padding:10px 18px;font-size:13px;font-weight:600;color:#6b7280;text-decoration:none;border-bottom:2px solid transparent;margin-bottom:-2px;transition:.15s}
.vtv-tab:hover,.vtv-tab.active{color:#e94560;border-bottom-color:#e94560}
.kat-grid{display:grid;grid-template-columns:300px 1fr;gap:18px}
@media(max-width:800px){.kat-grid{grid-template-columns:1fr}}
.panel{background:#fff;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin-bottom:14px}
.ph{background:#f9fafb;border-bottom:1px solid #e5e7eb;padding:11px 16px;font-weight:700;font-size:14px;color:#374151}
.pb{padding:16px}
.f-row{margin-bottom:10px}
.f-row label{display:block;font-size:12px;font-weight:700;margin-bottom:3px;color:#6b7280;text-transform:uppercase}
.f-row input{width:100%;padding:7px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:13px}
.kat-listesi{display:grid;gap:8px}
.kat-item{display:flex;align-items:center;gap:10px;padding:10px 12px;background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb}
.kat-renk-d{width:20px;height:20px;border-radius:4px}
.kat-isim{font-weight:600;font-size:14px;flex:1}
.kat-say{font-size:12px;color:#9ca3af}
.sil-kat-btn{background:#fee2e2!important;color:#991b1b!important;border-color:#fecaca!important;font-size:12px!important;padding:4px 10px!important}
.bos{padding:30px;text-align:center;color:#9ca3af}
.ajax-out{padding:8px 12px;border-radius:6px;font-size:13px;font-weight:600;margin-top:8px;display:none}
.ok{background:#dcfce7;color:#166534}.err{background:#fee2e2;color:#991b1b}
</style>
<div class="ahbw">
  <div class="vtv-hd">
    <div class="vtv-hd-logo">📺 <span class="vtv-blue">VİDEO</span> <span class="vtv-red">TV</span></div>
    <h1>Video TV — Kategoriler</h1>
  </div>
  <?= vtv_nav('kategoriler') ?>
  <div class="kat-grid">
    <div>
      <div class="panel">
        <div class="ph">➕ Yeni Kategori</div>
        <div class="pb">
          <div class="f-row"><label>Kategori Adı</label><input type="text" id="katIsim" placeholder="örn: Haberler"></div>
          <div class="f-row">
            <label>Renk</label>
            <input type="color" id="katRenk" value="#3b82f6" style="width:60px;height:36px;padding:2px;border:1px solid #d1d5db;border-radius:6px;cursor:pointer">
          </div>
          <button class="button button-primary" id="katEkleBtn" style="width:100%">➕ Kategori Ekle</button>
          <div class="ajax-out" id="katOut"></div>
        </div>
      </div>
    </div>
    <div>
      <div class="panel">
        <div class="ph">Kategoriler (<?= count($video_cats) ?>)</div>
        <div class="pb">
          <?php if(empty($video_cats)): ?>
          <div class="bos">Henüz kategori yok.</div>
          <?php else: ?>
          <div class="kat-listesi" id="katListesi">
            <?php foreach($video_cats as $c): ?>
            <div class="kat-item" id="katItem-<?= $c['id'] ?>">
              <div class="kat-renk-d" style="background:<?= e($c['color']) ?>"></div>
              <div class="kat-isim"><?= e($c['name']) ?></div>
              <div class="kat-say"><?= (int)$c['video_say'] ?> video</div>
              <button class="button sil-kat-btn" data-id="<?= $c['id'] ?>" onclick="return confirm('<?= e($c['name']) ?> silinecek?')">🗑</button>
            </div>
            <?php endforeach; ?>
          </div>
          <?php endif; ?>
        </div>
      </div>
    </div>
  </div>
</div>
<script>
(function(){
  var C=document.querySelector('meta[name="csrf"]')?.content||'';
  function post(d,cb){d._token=C;fetch('/admin/?page=video-tv',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','X-Requested-With':'XMLHttpRequest'},body:new URLSearchParams(d)}).then(r=>r.json()).then(cb);}
  document.getElementById('katEkleBtn')?.addEventListener('click',function(){
    var isim=document.getElementById('katIsim').value.trim();
    var renk=document.getElementById('katRenk').value;
    if(!isim){alert('İsim zorunludur');return;}
    var s=this;s.disabled=true;var out=document.getElementById('katOut');
    post({action:'kat_ekle',kat_isim:isim,kat_renk:renk},function(r){
      s.disabled=false;out.style.display='block';out.className='ajax-out '+(r.success?'ok':'err');out.textContent=r.message;
      if(r.success){
        document.getElementById('katIsim').value='';
        var liste=document.getElementById('katListesi');
        if(!liste){setTimeout(()=>location.reload(),800);return;}
        var d=r.data;
        liste.insertAdjacentHTML('beforeend','<div class="kat-item" id="katItem-'+d.id+'"><div class="kat-renk-d" style="background:'+d.color+'"></div><div class="kat-isim">'+d.name+'</div><div class="kat-say">0 video</div><button class="button sil-kat-btn" data-id="'+d.id+'" onclick="return confirm(\'Silinecek?\')">🗑</button></div>');
      }
    });
  });
  document.addEventListener('click',function(e){
    if(e.target.classList.contains('sil-kat-btn')){
      var id=e.target.dataset.id;
      post({action:'kat_sil',id:id},function(r){
        if(r.success)document.getElementById('katItem-'+id)?.remove();
      });
    }
  });
})();
</script>
<?php
    });
    return;
}

/* ═══════════════════════════════════════
   SAYFA: AYARLAR
═══════════════════════════════════════ */
if ($sub === 'ayarlar') {
    if ($_SERVER['REQUEST_METHOD']==='POST' && isset($_POST['vtv_ayar_kaydet'])) {
        Security::verifyCsrf();
        foreach (['vtv_youtube_api_key','vtv_dailymotion_api_key','vtv_video_per_page'] as $k) {
            $val = trim($_POST[$k] ?? '');
            DB::execute("INSERT INTO `{p}settings`(`key`,`val`) VALUES(?,?) ON DUPLICATE KEY UPDATE `val`=?", [$k,$val,$val]);
        }
        ap_flash('Video TV ayarları kaydedildi.','success');
        ap_redirect('/admin/?page=video-tv&sub=ayarlar');
    }

    ap_admin_layout('Video TV — Ayarlar', function() {
?>
<style>
.ahbw{max-width:800px}
.vtv-hd{background:linear-gradient(135deg,#0f0f23,#1a1a3e);color:#fff;padding:20px 24px;border-radius:10px;margin-bottom:14px}
.vtv-hd-logo{font-size:22px;font-weight:900;margin-bottom:4px}.vtv-blue{color:#3b82f6}.vtv-red{color:#e94560}
.vtv-hd h1{margin:0;font-size:17px;font-weight:700}
.vtv-tabs{display:flex;gap:0;margin-bottom:18px;border-bottom:2px solid #e5e7eb}
.vtv-tab{padding:10px 18px;font-size:13px;font-weight:600;color:#6b7280;text-decoration:none;border-bottom:2px solid transparent;margin-bottom:-2px;transition:.15s}
.vtv-tab:hover,.vtv-tab.active{color:#e94560;border-bottom-color:#e94560}
.panel{background:#fff;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin-bottom:14px}
.ph{background:#f9fafb;border-bottom:1px solid #e5e7eb;padding:11px 16px;font-weight:700;font-size:14px;color:#374151}
.pb{padding:16px}
.form-table th{width:220px;font-size:13px;font-weight:600;vertical-align:top;padding-top:12px}
.form-table td{padding:8px 10px}
.form-table td small{color:#9ca3af;font-size:11px;display:block;margin-top:3px}
</style>
<div class="ahbw">
  <div class="vtv-hd">
    <div class="vtv-hd-logo">📺 <span class="vtv-blue">VİDEO</span> <span class="vtv-red">TV</span></div>
    <h1>Video TV — Ayarlar</h1>
  </div>
  <?= vtv_nav('ayarlar') ?>
  <form method="POST">
    <?= Security::csrfField() ?>
    <div class="panel">
      <div class="ph">🔑 API Anahtarları</div>
      <div class="pb">
        <table class="form-table">
          <tr>
            <th>YouTube Data API v3 Key</th>
            <td>
              <input type="password" name="vtv_youtube_api_key" class="regular-text" value="<?= e(DB::setting('vtv_youtube_api_key','')) ?>">
              <small>YouTube videolarını ve kanallarını otomatik çekmek için gereklidir. <a href="https://console.developers.google.com/" target="_blank">Google Cloud Console →</a></small>
            </td>
          </tr>
          <tr>
            <th>Dailymotion API Key</th>
            <td>
              <input type="password" name="vtv_dailymotion_api_key" class="regular-text" value="<?= e(DB::setting('vtv_dailymotion_api_key','')) ?>">
              <small>Dailymotion kanallarını çekmek için gereklidir. İsteğe bağlı.</small>
            </td>
          </tr>
        </table>
      </div>
    </div>
    <div class="panel">
      <div class="ph">📊 Genel Ayarlar</div>
      <div class="pb">
        <table class="form-table">
          <tr>
            <th>Sayfa Başına Video</th>
            <td>
              <input type="number" name="vtv_video_per_page" value="<?= (int)DB::setting('vtv_video_per_page',12) ?>" min="4" max="48" style="width:100px">
              <small>Ön yüzde kaç video gösterilsin (4-48).</small>
            </td>
          </tr>
        </table>
      </div>
    </div>
    <p><button type="submit" name="vtv_ayar_kaydet" class="button button-primary button-large">💾 Ayarları Kaydet</button></p>
  </form>
</div>
<?php
    });
    return;
}

ap_redirect('/admin/?page=video-tv');
