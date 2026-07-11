<?php
/**
 * AhenkPress Admin — AI İçerik Robotu (Tam Sürüm)
 * Klasik RSS, Google News, Köşe Yazarları, Site Bakımı, Video TV, Haber Blokları
 */
defined('ROOT') or die();
require_once ROOT . '/core/ai-client.php';

$tab = preg_replace('/[^a-z0-9\-]/', '', $_GET['tab'] ?? 'klasik');
$csrf = Security::csrf();

// ═══════════════════════════════════════════════════════════════════
// AJAX / POST işlemleri
// ═══════════════════════════════════════════════════════════════════

// ─── API Ayarları kaydet
if (isset($_POST['ai_save_api'])) {
    Security::verifyCsrf();
    $fields = ['ai_api_key','ai_model','ai_auto_publish','ai_default_tone',
               'ai_max_daily','ai_max_per_run','ai_min_words','ai_max_words',
               'ai_lang','ai_default_cat','ai_title_rewrite','ai_content_rewrite',
               'ai_duplicate_check','ai_yazar_id'];
    foreach ($fields as $f) {
        if (array_key_exists($f, $_POST))
            DB::query("INSERT INTO `{p}settings`(`key`,`val`)VALUES(?,?)ON DUPLICATE KEY UPDATE`val`=?",
                [$f, trim($_POST[$f]), trim($_POST[$f])]);
    }
    ap_flash('API ayarları kaydedildi.', 'success');
    ap_redirect('/admin?page=ai-icerik&tab='.$tab);
}

// ─── Klasik RSS kaydet
if (isset($_POST['ai_save_rss'])) {
    Security::verifyCsrf();
    $fields = ['ai_rss_sources','ai_rss_max_per_source','ai_rss_cron_interval','ai_rss_publish'];
    foreach ($fields as $f) {
        if (array_key_exists($f, $_POST))
            DB::query("INSERT INTO `{p}settings`(`key`,`val`)VALUES(?,?)ON DUPLICATE KEY UPDATE`val`=?",
                [$f, trim($_POST[$f]), trim($_POST[$f])]);
    }
    ap_flash('RSS ayarları kaydedildi.', 'success');
    ap_redirect('/admin?page=ai-icerik&tab=klasik');
}

// ─── Google News kaydet
if (isset($_POST['ai_save_gnews'])) {
    Security::verifyCsrf();
    $sources = [];
    foreach (($_POST['gn_cat'] ?? []) as $i => $cat) {
        $url = trim($_POST['gn_url'][$i] ?? '');
        $cat = trim($cat);
        if ($url && $cat) $sources[] = $url . ' | ' . $cat;
    }
    DB::query("INSERT INTO `{p}settings`(`key`,`val`)VALUES(?,?)ON DUPLICATE KEY UPDATE`val`=?",
        ['ai_gnews_sources', implode("\n", $sources), implode("\n", $sources)]);
    ap_flash('Google News kaynakları kaydedildi.', 'success');
    ap_redirect('/admin?page=ai-icerik&tab=gnews');
}

// ─── Haber Blokları kaydet
if (isset($_POST['ai_save_blocks'])) {
    Security::verifyCsrf();
    $fields = ['theme_manset_count','theme_surmanset_count','theme_manset_height',
               'theme_ikon_bant','theme_finans_bant','theme_son_haberler_count',
               'theme_kose_count','theme_ana_kategoriler','theme_reklam_arasi'];
    foreach ($fields as $f) {
        if (array_key_exists($f, $_POST))
            DB::query("INSERT INTO `{p}settings`(`key`,`val`)VALUES(?,?)ON DUPLICATE KEY UPDATE`val`=?",
                [$f, trim($_POST[$f] ?? ''), trim($_POST[$f] ?? '')]);
    }
    ap_flash('Haber blok ayarları kaydedildi.', 'success');
    ap_redirect('/admin?page=ai-icerik&tab=bloklar');
}

// ─── Köşe Yazarı AI kaydet
if (isset($_POST['ai_save_kose'])) {
    Security::verifyCsrf();
    DB::query("INSERT INTO `{p}settings`(`key`,`val`)VALUES(?,?)ON DUPLICATE KEY UPDATE`val`=?",
        ['ai_kose_prompt', trim($_POST['ai_kose_prompt'] ?? ''), trim($_POST['ai_kose_prompt'] ?? '')]);
    DB::query("INSERT INTO `{p}settings`(`key`,`val`)VALUES(?,?)ON DUPLICATE KEY UPDATE`val`=?",
        ['ai_kose_min_words', trim($_POST['ai_kose_min_words'] ?? '500'), trim($_POST['ai_kose_min_words'] ?? '500')]);
    ap_flash('Köşe yazarı AI ayarları kaydedildi.', 'success');
    ap_redirect('/admin?page=ai-icerik&tab=kose');
}

// ─── Şimdi Çalıştır (AJAX destekli)
if (isset($_POST['ai_run_now'])) {
    Security::verifyCsrf();
    $mode = $_POST['run_mode'] ?? 'rss';
    $count = 0;
    $errors = [];
    try {
        require_once ROOT . '/core/rss-fetcher.php';
        require_once ROOT . '/core/news-processor.php';
        $ai = new AIClient();
        if (!$ai->isConfigured()) throw new \RuntimeException('OpenAI API anahtarı ayarlanmamış.');
        $maxRun = (int)(DB::setting('ai_max_per_run', '10'));
        $rawSources = DB::setting($mode === 'gnews' ? 'ai_gnews_sources' : 'ai_rss_sources', '');
        $lines = array_filter(array_map('trim', explode("\n", $rawSources)));
        $fetcher = new RssFetcher();
        foreach ($lines as $line) {
            if ($count >= $maxRun) break;
            if (str_starts_with(ltrim($line), '#')) continue;
            [$feedUrl, $catSlug] = array_pad(explode('|', $line, 2), 2, '');
            $feedUrl = trim($feedUrl); $catSlug = trim($catSlug);
            if (!$feedUrl) continue;
            try {
                $items = $fetcher->fetch($feedUrl, $maxRun - $count);
                $processor = new NewsProcessor($ai);
                foreach ($items as $item) {
                    if ($count >= $maxRun) break;
                    $result = $processor->process($item, $catSlug);
                    if ($result) $count++;
                }
            } catch (\Throwable $e) { $errors[] = $feedUrl . ': ' . $e->getMessage(); }
        }
        DB::query("INSERT INTO `{p}settings`(`key`,`val`)VALUES(?,?)ON DUPLICATE KEY UPDATE`val`=?",
            ['ai_last_run', time(), time()]);
        ap_flash("✅ {$count} haber üretildi." . ($errors ? ' Hatalar: '.count($errors) : ''), $errors ? 'warning' : 'success');
    } catch (\Throwable $e) {
        ap_flash('❌ Hata: ' . $e->getMessage(), 'error');
    }
    ap_redirect('/admin?page=ai-icerik&tab='.$tab);
}

// ─── Tek Haber Üret
$aiResult = null;
if (isset($_POST['ai_tek_uret'])) {
    Security::verifyCsrf();
    $konu   = trim($_POST['tek_konu'] ?? '');
    $yazar  = trim($_POST['tek_yazar'] ?? '');
    $uzun   = (int)($_POST['tek_uzunluk'] ?? 400);
    $catSlug= trim($_POST['tek_category'] ?? '');
    $publish= isset($_POST['tek_publish']);
    if ($konu) {
        $ai = new AIClient();
        if ($ai->isConfigured()) {
            $prompt = "Şu konuda kapsamlı Türkçe haber yaz (min {$uzun} kelime).\n";
            if ($yazar) $prompt .= "Yazar: {$yazar}\n";
            $prompt .= "JSON formatında dön: {\"baslik\":\"...\",\"icerik\":\"<p>...\",\"ozet\":\"...\",\"etiketler\":[...]}\n\nKONU: {$konu}";
            $raw = $ai->generate($prompt, 0.75);
            if ($raw) {
                if (preg_match('/\{.*\}/s', $raw, $m)) $aiResult = json_decode($m[0], true);
                if (!$aiResult) $aiResult = ['baslik'=>$konu,'icerik'=>$raw,'ozet'=>'','etiketler'=>[]];
                $aiResult['_category'] = $catSlug;
                $aiResult['_publish']  = $publish;
            } else {
                ap_flash('AI hatası: ' . $ai->lastError, 'error');
            }
        } else { ap_flash('Önce API anahtarı girin.', 'error'); }
    }
}

// ─── AI haberi kaydet/yayınla
if (isset($_POST['ai_publish_result'])) {
    Security::verifyCsrf();
    $catId = 0;
    if (!empty($_POST['res_cat'])) {
        $cr = DB::queryRow("SELECT id FROM `{p}categories` WHERE slug=? LIMIT 1", [trim($_POST['res_cat'])]);
        if ($cr) $catId = (int)$cr['id'];
    }
    $baslik  = trim($_POST['res_baslik'] ?? '');
    $slug    = ap_slugify($baslik);
    $now     = date('Y-m-d H:i:s');
    $status  = $_POST['res_status'] ?? 'published';
    try {
        DB::query("INSERT IGNORE INTO `{p}posts`
            (post_type,title,slug,content,excerpt,tags,category_id,status,ai_generated,created_at,updated_at,published_at)
            VALUES ('news',?,?,?,?,?,?,?,1,?,?,?)",
            [$baslik, $slug, $_POST['res_icerik'] ?? '', $_POST['res_ozet'] ?? '',
             $_POST['res_etiketler'] ?? '', $catId, $status, $now, $now,
             $status === 'published' ? $now : null]);
        ap_flash('Haber kaydedildi!', 'success');
        ap_redirect('/admin?page=news');
    } catch (\Throwable $e) { ap_flash('Hata: '.$e->getMessage(), 'error'); }
}

// ─── Site Bakımı
if (isset($_POST['bakim_action'])) {
    Security::verifyCsrf();
    $action = $_POST['bakim_action'];
    $msg = '';
    if ($action === 'clean_trash') {
        $n = (int)DB::queryValue("SELECT COUNT(*) FROM `{p}posts` WHERE status='trash'");
        DB::query("DELETE FROM `{p}posts` WHERE status='trash'");
        $msg = "✅ {$n} çöp haber silindi.";
    } elseif ($action === 'clean_drafts') {
        $days = (int)($_POST['draft_days'] ?? 30);
        $n = (int)DB::queryValue("SELECT COUNT(*) FROM `{p}posts` WHERE status='draft' AND created_at < DATE_SUB(NOW(), INTERVAL ? DAY)", [$days]);
        DB::query("DELETE FROM `{p}posts` WHERE status='draft' AND created_at < DATE_SUB(NOW(), INTERVAL ? DAY)", [$days]);
        $msg = "✅ {$n} eski taslak silindi.";
    } elseif ($action === 'clean_rss_log') {
        DB::query("DELETE FROM `{p}rss_logs` WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)");
        $msg = "✅ Eski RSS logları temizlendi.";
    } elseif ($action === 'clean_processed') {
        DB::query("DELETE FROM `{p}rss_processed` WHERE created_at < DATE_SUB(NOW(), INTERVAL 60 DAY)");
        $msg = "✅ Eski RSS işlenmiş kayıtlar temizlendi.";
    } elseif ($action === 'rebuild_slugs') {
        $posts = DB::query("SELECT id, title FROM `{p}posts` WHERE slug='' OR slug IS NULL");
        foreach ($posts as $p) {
            $slug = ap_slugify($p['title']);
            DB::query("UPDATE `{p}posts` SET slug=? WHERE id=?", [$slug, $p['id']]);
        }
        $msg = "✅ " . count($posts) . " slug yenilendi.";
    }
    if ($msg) ap_flash($msg, 'success');
    ap_redirect('/admin?page=ai-icerik&tab=bakim');
}

// ═══════════════════════════════════════════════════════════════════
// Veri yükle
// ═══════════════════════════════════════════════════════════════════
$sKeys = ['ai_api_key','ai_model','ai_auto_publish','ai_default_tone','ai_max_daily',
          'ai_max_per_run','ai_min_words','ai_max_words','ai_lang','ai_default_cat',
          'ai_title_rewrite','ai_content_rewrite','ai_duplicate_check','ai_yazar_id',
          'ai_rss_sources','ai_rss_max_per_source','ai_rss_cron_interval','ai_rss_publish',
          'ai_gnews_sources','ai_kose_prompt','ai_kose_min_words','ai_last_run',
          'theme_manset_count','theme_surmanset_count','theme_manset_height',
          'theme_ikon_bant','theme_finans_bant','theme_son_haberler_count',
          'theme_kose_count','theme_ana_kategoriler','theme_reklam_arasi'];
$s = [];
foreach ($sKeys as $k) {
    $r = DB::queryRow("SELECT `val` FROM `{p}settings` WHERE `key`=?", [$k]);
    $s[$k] = $r['val'] ?? '';
}
// Varsayılanlar
$s['ai_model']              = $s['ai_model'] ?: 'gpt-4o-mini';
$s['ai_max_daily']          = $s['ai_max_daily'] ?: '50';
$s['ai_max_per_run']        = $s['ai_max_per_run'] ?: '10';
$s['ai_min_words']          = $s['ai_min_words'] ?: '300';
$s['ai_max_words']          = $s['ai_max_words'] ?: '800';
$s['ai_lang']               = $s['ai_lang'] ?: 'tr';
$s['ai_rss_max_per_source'] = $s['ai_rss_max_per_source'] ?: '5';
$s['ai_rss_cron_interval']  = $s['ai_rss_cron_interval'] ?: '30';
$s['theme_manset_count']    = $s['theme_manset_count'] ?: '5';
$s['theme_surmanset_count'] = $s['theme_surmanset_count'] ?: '4';
$s['theme_manset_height']   = $s['theme_manset_height'] ?: '460';
$s['theme_son_haberler_count'] = $s['theme_son_haberler_count'] ?: '10';
$s['theme_kose_count']      = $s['theme_kose_count'] ?: '6';
$apiConfigured = !empty($s['ai_api_key']);
$lastRun = $s['ai_last_run'] ? date('d.m.Y H:i', (int)$s['ai_last_run']) : '—';
$nextRun = $s['ai_last_run'] ? date('d.m.Y H:i', (int)$s['ai_last_run'] + (int)$s['ai_rss_cron_interval'] * 60) : '—';

// İstatistikler
$statToday = 0; $statTotal = 0; $statKose = 0;
try {
    $statToday = (int)DB::queryValue("SELECT COUNT(*) FROM `{p}posts` WHERE ai_generated=1 AND DATE(created_at)=CURDATE()");
    $statTotal = (int)DB::queryValue("SELECT COUNT(*) FROM `{p}posts` WHERE ai_generated=1");
    $statKose  = (int)DB::queryValue("SELECT COUNT(*) FROM `{p}posts` WHERE ai_generated=1 AND post_type='columnist'");
} catch (\Throwable) {}

// Kategoriler
$cats = [];
try { $cats = DB::query("SELECT * FROM `{p}categories` WHERE active=1 ORDER BY sort_order"); } catch (\Throwable) {}

// Köşe yazarları
$columnists = [];
try { $columnists = DB::query("SELECT * FROM `{p}columnists` WHERE active=1 ORDER BY sort_order"); } catch (\Throwable) {}

// Son loglar
$recentLogs = [];
try { $recentLogs = DB::query("SELECT * FROM `{p}rss_logs` ORDER BY created_at DESC LIMIT 10"); } catch (\Throwable) {}

// Google News satırlarını ayrıştır
$gnewsSources = [];
foreach (array_filter(array_map('trim', explode("\n", $s['ai_gnews_sources']))) as $line) {
    [$url, $cat] = array_pad(explode('|', $line, 2), 2, '');
    $gnewsSources[] = ['url' => trim($url), 'cat' => trim($cat)];
}
if (empty($gnewsSources)) $gnewsSources = [['url'=>'','cat'=>'']];

ap_admin_layout('AI İçerik Robotu', function() use (
    $tab, $csrf, $s, $apiConfigured, $lastRun, $nextRun,
    $statToday, $statTotal, $statKose, $cats, $columnists, $recentLogs, $gnewsSources, $aiResult
) {
?>

<!-- ══════════ BAŞLIK + İSTATİSTİKLER ══════════ -->
<div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:20px">
  <div>
    <h1 style="font-size:20px;font-weight:900;margin:0">🤖 AI İçerik Robotu</h1>
    <p style="color:var(--ap-text-2);font-size:12px;margin:4px 0 0">
      Sonraki otomatik çalışma: <strong><?= $nextRun ?></strong>
      &nbsp;·&nbsp; Son çalışma: <strong><?= $lastRun ?></strong>
    </p>
  </div>
  <div style="display:flex;gap:8px;flex-wrap:wrap">
    <form method="POST" style="display:inline">
      <input type="hidden" name="_csrf" value="<?= e($csrf) ?>">
      <input type="hidden" name="ai_run_now" value="1">
      <input type="hidden" name="run_mode" value="rss">
      <button type="submit" class="ap-btn ap-btn-primary" <?= !$apiConfigured?'disabled title="API anahtarı gerekli"':'' ?>
              onclick="this.disabled=true;this.textContent='⏳ Çalışıyor...';this.form.submit()">
        ▶ Şimdi <?= e($s['ai_max_per_run']) ?> Haber Üret
      </button>
    </form>
  </div>
</div>

<!-- İstatistik Kartları -->
<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px">
  <?php foreach ([
    ['Bugün Üretilen', $statToday, '#3b82f6', '📰'],
    ['Toplam AI Haber', $statTotal, '#8b5cf6', '🤖'],
    ['AI Köşe Yazısı', $statKose, '#10b981', '✍'],
    ['API Durumu', $apiConfigured?'Bağlı':'Yok', $apiConfigured?'#22c55e':'#ef4444', '🔑'],
  ] as [$label,$val,$color,$ico]): ?>
  <div style="background:var(--ap-surface-2);border-radius:10px;padding:14px;border-left:3px solid <?= $color ?>">
    <div style="font-size:20px;margin-bottom:4px"><?= $ico ?></div>
    <div style="font-size:22px;font-weight:900;color:<?= $color ?>"><?= $val ?></div>
    <div style="font-size:11px;color:var(--ap-text-2);margin-top:2px"><?= $label ?></div>
  </div>
  <?php endforeach; ?>
</div>

<!-- ══════════ SEKMELER ══════════ -->
<div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:16px;border-bottom:2px solid var(--ap-border);padding-bottom:8px">
  <?php $tabs = [
    'klasik' => '📡 Klasik RSS',
    'gnews'  => '🌐 Konu Planı (Google News)',
    'tek'    => '✍ Tek Haber Üret',
    'kose'   => '🖊 Köşe Yazarları',
    'bloklar'=> '🔲 Haber Blokları',
    'ayarlar'=> '⚙ API Ayarları',
    'bakim'  => '🔧 Site Bakımı',
  ];
  foreach ($tabs as $k => $label): ?>
  <a href="/admin?page=ai-icerik&tab=<?= $k ?>"
     style="padding:7px 14px;border-radius:7px 7px 0 0;font-size:13px;font-weight:600;text-decoration:none;
            background:<?= $tab===$k?'var(--ap-accent)':'var(--ap-surface-2)' ?>;
            color:<?= $tab===$k?'#fff':'var(--ap-text-2)' ?>;
            border-bottom:<?= $tab===$k?'2px solid var(--ap-accent)':'none' ?>">
    <?= $label ?>
  </a>
  <?php endforeach; ?>
</div>

<!-- ══════════ SEKME 1: KLASİK RSS ══════════ -->
<?php if ($tab === 'klasik'): ?>
<div style="display:grid;grid-template-columns:1fr 340px;gap:16px;align-items:start">
  <div>
    <div class="ap-card">
      <div class="ap-card-header"><h2 class="ap-card-title">📡 Genel RSS Kaynakları (Manuel)</h2></div>
      <form method="POST">
        <input type="hidden" name="_csrf" value="<?= e($csrf) ?>">
        <input type="hidden" name="ai_save_rss" value="1">
        <div class="ap-form-group">
          <label class="ap-label">RSS/Atom URL'leri (her satıra bir kaynak)</label>
          <textarea name="ai_rss_sources" class="ap-input" rows="12"
                    style="font-family:monospace;font-size:12px"><?= e($s['ai_rss_sources']) ?></textarea>
          <div class="ap-hint">
            Format: <code>RSS_URL | kategori-slug</code><br>
            <code>https://example.com/rss | gundem</code><br>
            <code>https://example.com/ekonomi.rss | ekonomi</code><br>
            · Kategori yazmazsanız AI kategorilendirme yapar.<br>
            · <code>#</code> ile başlayan satırlar yorum olarak atlanır.
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">
          <div class="ap-form-group">
            <label class="ap-label">Kaynak Başına Max</label>
            <input type="number" name="ai_rss_max_per_source" class="ap-input" min="1" max="50"
                   value="<?= e($s['ai_rss_max_per_source']) ?>">
          </div>
          <div class="ap-form-group">
            <label class="ap-label">Cron Aralığı (dk)</label>
            <input type="number" name="ai_rss_cron_interval" class="ap-input" min="5" max="1440"
                   value="<?= e($s['ai_rss_cron_interval']) ?>">
          </div>
          <div class="ap-form-group">
            <label class="ap-label">Varsayılan Durum</label>
            <select name="ai_rss_publish" class="ap-input">
              <option value="published" <?= $s['ai_rss_publish']==='published'?'selected':'' ?>>Hemen Yayınla</option>
              <option value="draft"     <?= $s['ai_rss_publish']==='draft'    ?'selected':'' ?>>Taslak</option>
            </select>
          </div>
        </div>
        <button type="submit" class="ap-btn ap-btn-primary">💾 Kaydet</button>
        <a href="/admin?page=ai-kampanyalar" class="ap-btn ap-btn-ghost" style="margin-left:8px">📋 Kampanya Yönetimine Git →</a>
      </form>
    </div>

    <!-- Son Loglar -->
    <?php if ($recentLogs): ?>
    <div class="ap-card" style="margin-top:14px">
      <div class="ap-card-header"><h2 class="ap-card-title">📋 Son Çalışma Logları</h2></div>
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead><tr style="border-bottom:1px solid var(--ap-border)">
          <th style="padding:6px 8px;text-align:left;color:var(--ap-text-2)">Kampanya</th>
          <th style="padding:6px 8px;text-align:center;color:var(--ap-text-2)">Eklenen</th>
          <th style="padding:6px 8px;text-align:center;color:var(--ap-text-2)">Atlanan</th>
          <th style="padding:6px 8px;text-align:left;color:var(--ap-text-2)">Tarih</th>
        </tr></thead>
        <tbody>
          <?php foreach ($recentLogs as $log): ?>
          <tr style="border-bottom:1px solid var(--ap-border)">
            <td style="padding:5px 8px"><?= e($log['campaign_name'] ?? '-') ?></td>
            <td style="padding:5px 8px;text-align:center;color:#22c55e;font-weight:700"><?= $log['added'] ?></td>
            <td style="padding:5px 8px;text-align:center;color:#94a3b8"><?= $log['skipped'] ?></td>
            <td style="padding:5px 8px;color:var(--ap-text-2)"><?= date('d.m H:i', strtotime($log['created_at'])) ?></td>
          </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
    </div>
    <?php endif; ?>
  </div>

  <!-- Sağ: Cron Kurulum -->
  <div>
    <div class="ap-card">
      <div class="ap-card-header"><h2 class="ap-card-title">⏰ Cron Kurulumu</h2></div>
      <div style="font-size:13px;line-height:1.8;color:var(--ap-text-2)">
        <p>cPanel → <strong>Cron Jobs</strong> bölümüne şu komutu ekleyin:</p>
        <div style="background:#0d1117;border-radius:6px;padding:10px;font-family:monospace;font-size:11px;color:#79c0ff;margin:8px 0;word-break:break-all">
          */<?= e($s['ai_rss_cron_interval']) ?> * * * * php <?= ROOT ?>/core/cron-worker.php
        </div>
        <p>Bu komut her <strong><?= e($s['ai_rss_cron_interval']) ?> dakikada</strong> bir çalışır.</p>
        <hr style="border-color:var(--ap-border);margin:10px 0">
        <p><strong>Manuel Çalıştır:</strong></p>
        <form method="POST">
          <input type="hidden" name="_csrf" value="<?= e($csrf) ?>">
          <input type="hidden" name="ai_run_now" value="1">
          <input type="hidden" name="run_mode" value="rss">
          <button type="submit" class="ap-btn ap-btn-primary" style="width:100%" <?= !$apiConfigured?'disabled':'' ?>>
            ▶ Şimdi Çalıştır
          </button>
        </form>
      </div>
    </div>

    <div class="ap-card" style="margin-top:12px">
      <div class="ap-card-header"><h2 class="ap-card-title">📡 Popüler RSS Kaynakları</h2></div>
      <div style="font-size:12px;line-height:2">
        <?php foreach ([
          ['Hürriyet',    'https://www.hurriyet.com.tr/rss/anasayfa', 'gundem'],
          ['Sabah',       'https://www.sabah.com.tr/rss/ana-sayfa', 'gundem'],
          ['CNN Türk',    'https://www.cnnturk.com/feed/rss/news', 'gundem'],
          ['NTV',         'https://www.ntv.com.tr/son-dakika.rss', 'gundem'],
          ['Milliyet',    'https://www.milliyet.com.tr/rss/rssNew/anasayfa.xml', 'gundem'],
          ['TRT Haber',   'https://www.trthaber.com/sondakika.rss', 'son-dakika'],
          ['Dünya Gazetesi', 'https://www.dunya.com/rss/gundem.xml', 'ekonomi'],
          ['Bloomberg HT','https://www.bloomberght.com/rss', 'ekonomi'],
          ['Fanatik',     'https://www.fanatik.com.tr/rss', 'spor'],
          ['NTV Spor',    'https://www.ntvspor.net/rss.xml', 'spor'],
        ] as [$ad, $url, $cat]): ?>
        <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--ap-border);padding:3px 0">
          <span style="font-weight:600"><?= $ad ?></span>
          <button type="button" onclick="appendRss('<?= htmlspecialchars($url, ENT_QUOTES) ?>', '<?= $cat ?>')"
                  style="background:none;border:none;color:var(--ap-accent);cursor:pointer;font-size:11px">+ Ekle</button>
        </div>
        <?php endforeach; ?>
      </div>
    </div>
  </div>
</div>
<script>
function appendRss(url, cat) {
  const ta = document.querySelector('textarea[name="ai_rss_sources"]');
  if (!ta) return;
  const line = url + ' | ' + cat;
  ta.value = (ta.value.trim() ? ta.value.trim() + '\n' : '') + line;
  ta.scrollTop = ta.scrollHeight;
}
</script>

<!-- ══════════ SEKME 2: GOOGLE NEWS ══════════ -->
<?php elseif ($tab === 'gnews'): ?>
<div class="ap-card">
  <div class="ap-card-header">
    <h2 class="ap-card-title">🌐 Konu Planı — Google News RSS Kaynakları</h2>
    <span style="font-size:12px;color:var(--ap-text-2)">Google News'ten kategori bazlı otomatik içerik çekin</span>
  </div>
  <form method="POST">
    <input type="hidden" name="_csrf" value="<?= e($csrf) ?>">
    <input type="hidden" name="ai_save_gnews" value="1">
    <div style="overflow-x:auto">
    <table style="width:100%;border-collapse:collapse" id="gnTable">
      <thead><tr style="border-bottom:1px solid var(--ap-border)">
        <th style="padding:8px;text-align:left;font-size:12px;color:var(--ap-text-2)">RSS/Atom URL</th>
        <th style="padding:8px;text-align:left;font-size:12px;color:var(--ap-text-2);width:180px">Kategori Slug</th>
        <th style="padding:8px;width:50px"></th>
      </tr></thead>
      <tbody id="gnBody">
        <?php foreach ($gnewsSources as $i => $gn): ?>
        <tr>
          <td style="padding:5px 8px">
            <input type="text" name="gn_url[]" class="ap-input" style="font-family:monospace;font-size:12px"
                   value="<?= e($gn['url']) ?>" placeholder="https://news.google.com/rss/search?q=...&hl=tr">
          </td>
          <td style="padding:5px 8px">
            <input type="text" name="gn_cat[]" class="ap-input" style="font-size:12px"
                   value="<?= e($gn['cat']) ?>" placeholder="gundem">
          </td>
          <td style="padding:5px;text-align:center">
            <button type="button" onclick="this.closest('tr').remove()"
                    style="background:none;border:none;color:#f85149;cursor:pointer;font-size:16px">✕</button>
          </td>
        </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
    </div>
    <div style="padding:10px;border-top:1px solid var(--ap-border);display:flex;gap:8px;flex-wrap:wrap;align-items:center">
      <button type="button" onclick="addGnRow()" class="ap-btn ap-btn-ghost">+ Yeni Satır Ekle</button>
      <button type="submit" class="ap-btn ap-btn-primary">💾 Kaydet</button>
      <form method="POST" style="display:inline;margin:0">
        <input type="hidden" name="_csrf" value="<?= e($csrf) ?>">
        <input type="hidden" name="ai_run_now" value="1">
        <input type="hidden" name="run_mode" value="gnews">
        <button type="submit" class="ap-btn" style="background:#f59e0b20;color:#f59e0b" <?= !$apiConfigured?'disabled':'' ?>>
          ▶ Şimdi Google News'ten Al
        </button>
      </form>
    </div>
  </form>
</div>

<div class="ap-card" style="margin-top:14px">
  <div class="ap-card-header"><h2 class="ap-card-title">💡 Hazır Google News Kaynakları</h2></div>
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:8px;font-size:12px">
    <?php foreach ([
      ['Türkiye Gündemi', 'https://news.google.com/rss/search?q=T%C3%BCrkiye&hl=tr&gl=TR&ceid=TR:tr', 'gundem'],
      ['Ekonomi Haberleri', 'https://news.google.com/rss/search?q=ekonomi+T%C3%BCrkiye&hl=tr', 'ekonomi'],
      ['Spor Haberleri', 'https://news.google.com/rss/search?q=spor+T%C3%BCrkiye&hl=tr', 'spor'],
      ['Dünya Haberleri', 'https://news.google.com/rss/headlines/section/topic/WORLD?hl=tr', 'dunya'],
      ['Teknoloji', 'https://news.google.com/rss/search?q=teknoloji&hl=tr', 'teknoloji'],
      ['Sağlık', 'https://news.google.com/rss/search?q=sa%C4%9Fl%C4%B1k&hl=tr', 'saglik'],
    ] as [$ad, $url, $cat]): ?>
    <button type="button" onclick="addGnRow('<?= htmlspecialchars($url,ENT_QUOTES) ?>','<?= $cat ?>')"
            class="ap-btn ap-btn-ghost" style="font-size:11px;justify-content:flex-start;text-align:left">
      + <?= $ad ?> <span style="color:var(--ap-text-2);margin-left:4px">(<?= $cat ?>)</span>
    </button>
    <?php endforeach; ?>
  </div>
</div>
<script>
function addGnRow(url, cat) {
  const body = document.getElementById('gnBody');
  const tr = document.createElement('tr');
  tr.innerHTML = `<td style="padding:5px 8px"><input type="text" name="gn_url[]" class="ap-input" style="font-family:monospace;font-size:12px" value="${url||''}" placeholder="https://news.google.com/..."></td>
    <td style="padding:5px 8px"><input type="text" name="gn_cat[]" class="ap-input" style="font-size:12px" value="${cat||''}" placeholder="gundem"></td>
    <td style="padding:5px;text-align:center"><button type="button" onclick="this.closest('tr').remove()" style="background:none;border:none;color:#f85149;cursor:pointer;font-size:16px">✕</button></td>`;
  body.appendChild(tr);
}
</script>

<!-- ══════════ SEKME 3: TEK HABER ÜRET ══════════ -->
<?php elseif ($tab === 'tek'): ?>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:start">
  <div class="ap-card">
    <div class="ap-card-header"><h2 class="ap-card-title">✍ AI ile Tek Haber Üret</h2></div>
    <?php if (!$apiConfigured): ?>
    <div style="padding:16px;color:#f59e0b;font-size:13px;background:#f59e0b10;border-radius:8px;margin-bottom:12px">
      ⚠ Önce <a href="/admin?page=ai-icerik&tab=ayarlar">API Ayarları</a> sekmesinden OpenAI anahtarını girin.
    </div>
    <?php endif; ?>
    <form method="POST">
      <input type="hidden" name="_csrf" value="<?= e($csrf) ?>">
      <input type="hidden" name="ai_tek_uret" value="1">
      <div class="ap-form-group">
        <label class="ap-label">Haber Konusu / Başlık *</label>
        <input type="text" name="tek_konu" class="ap-input" required placeholder="Örn: Türkiye ekonomisinde son gelişmeler">
      </div>
      <div class="ap-form-row">
        <div class="ap-form-group" style="flex:1">
          <label class="ap-label">Kategori</label>
          <select name="tek_category" class="ap-input">
            <option value="">— AI karar versin —</option>
            <?php foreach ($cats as $c): ?>
            <option value="<?= e($c['slug']) ?>"><?= e($c['name']) ?></option>
            <?php endforeach; ?>
          </select>
        </div>
        <div class="ap-form-group" style="flex:1">
          <label class="ap-label">Min Kelime Sayısı</label>
          <input type="number" name="tek_uzunluk" class="ap-input" value="400" min="100" max="2000">
        </div>
      </div>
      <div class="ap-form-group">
        <label class="ap-label">Yazar Bakış Açısı (isteğe bağlı)</label>
        <input type="text" name="tek_yazar" class="ap-input" placeholder="Tarafsız, eleştirel, olumlu...">
      </div>
      <div class="ap-form-group">
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
          <input type="checkbox" name="tek_publish" value="1" checked>
          <span class="ap-label" style="margin:0">Üretince direkt yayınla</span>
        </label>
      </div>
      <button type="submit" class="ap-btn ap-btn-primary" <?= !$apiConfigured?'disabled':'' ?>>
        🤖 AI ile Haber Üret
      </button>
    </form>
  </div>

  <!-- Sonuç -->
  <div>
    <?php if ($aiResult): ?>
    <div class="ap-card">
      <div class="ap-card-header"><h2 class="ap-card-title">📰 Üretilen Haber — Düzenle & Yayınla</h2></div>
      <form method="POST">
        <input type="hidden" name="_csrf" value="<?= e($csrf) ?>">
        <input type="hidden" name="ai_publish_result" value="1">
        <div class="ap-form-group">
          <label class="ap-label">Başlık</label>
          <input type="text" name="res_baslik" class="ap-input" value="<?= e($aiResult['baslik'] ?? '') ?>">
        </div>
        <div class="ap-form-group">
          <label class="ap-label">Özet</label>
          <textarea name="res_ozet" class="ap-input" rows="2"><?= e($aiResult['ozet'] ?? '') ?></textarea>
        </div>
        <div class="ap-form-group">
          <label class="ap-label">İçerik</label>
          <textarea name="res_icerik" class="ap-input" rows="10"><?= e($aiResult['icerik'] ?? '') ?></textarea>
        </div>
        <div class="ap-form-row">
          <div class="ap-form-group" style="flex:1">
            <label class="ap-label">Etiketler</label>
            <input type="text" name="res_etiketler" class="ap-input"
                   value="<?= e(implode(', ', (array)($aiResult['etiketler'] ?? []))) ?>">
          </div>
          <div class="ap-form-group" style="flex:1">
            <label class="ap-label">Kategori</label>
            <select name="res_cat" class="ap-input">
              <option value="<?= e($aiResult['_category'] ?? '') ?>"><?= e($aiResult['_category'] ?? '— Seç —') ?></option>
              <?php foreach ($cats as $c): ?>
              <option value="<?= e($c['slug']) ?>"><?= e($c['name']) ?></option>
              <?php endforeach; ?>
            </select>
          </div>
        </div>
        <div class="ap-form-group">
          <label class="ap-label">Yayın Durumu</label>
          <select name="res_status" class="ap-input">
            <option value="published">Yayınla</option>
            <option value="draft">Taslak</option>
          </select>
        </div>
        <button type="submit" class="ap-btn ap-btn-primary">📤 Kaydet & Yayınla</button>
      </form>
    </div>
    <?php else: ?>
    <div class="ap-card" style="text-align:center;padding:40px;color:var(--ap-text-2)">
      <div style="font-size:48px;margin-bottom:12px">🤖</div>
      <div>Sol taraftan konu girerek AI haber üretin.<br>Sonuç burada görünecek.</div>
    </div>
    <?php endif; ?>
  </div>
</div>

<!-- ══════════ SEKME 4: KÖŞE YAZARLARI ══════════ -->
<?php elseif ($tab === 'kose'): ?>
<div style="display:grid;grid-template-columns:1fr 320px;gap:16px;align-items:start">
  <div class="ap-card">
    <div class="ap-card-header"><h2 class="ap-card-title">🖊 Köşe Yazarı AI Ayarları</h2></div>
    <form method="POST">
      <input type="hidden" name="_csrf" value="<?= e($csrf) ?>">
      <input type="hidden" name="ai_save_kose" value="1">
      <div class="ap-form-group">
        <label class="ap-label">Sistem Prompt (köşe yazarı karakteri)</label>
        <textarea name="ai_kose_prompt" class="ap-input" rows="8"
                  placeholder="Örn: Sen deneyimli bir Türk gazeteci ve köşe yazarısın. Konuları derinlemesine analiz eder, özlü ve etkileyici köşe yazıları yazarsın. Türkçeyi çok iyi kullanırsın."><?= e($s['ai_kose_prompt']) ?></textarea>
      </div>
      <div class="ap-form-group">
        <label class="ap-label">Minimum Kelime Sayısı</label>
        <input type="number" name="ai_kose_min_words" class="ap-input" min="200" max="3000"
               value="<?= e($s['ai_kose_min_words'] ?: '500') ?>">
      </div>
      <button type="submit" class="ap-btn ap-btn-primary">💾 Kaydet</button>
    </form>

    <hr style="border-color:var(--ap-border);margin:20px 0">
    <h3 style="font-size:14px;font-weight:700;margin-bottom:12px">✍ Köşe Yazısı Üret</h3>
    <?php if (!$apiConfigured): ?>
    <div style="color:#f59e0b;font-size:13px">⚠ API anahtarı gerekli.</div>
    <?php else: ?>
    <form method="POST">
      <input type="hidden" name="_csrf" value="<?= e($csrf) ?>">
      <input type="hidden" name="ai_tek_uret" value="1">
      <div class="ap-form-row">
        <div class="ap-form-group" style="flex:1">
          <label class="ap-label">Yazar</label>
          <select name="tek_yazar" class="ap-input">
            <option value="">— Genel Köşe Yazarı —</option>
            <?php foreach ($columnists as $col): ?>
            <option value="<?= e($col['name']) ?>"><?= e($col['name']) ?></option>
            <?php endforeach; ?>
          </select>
        </div>
        <div class="ap-form-group" style="flex:1">
          <label class="ap-label">Kelime Sayısı</label>
          <input type="number" name="tek_uzunluk" class="ap-input" value="<?= e($s['ai_kose_min_words'] ?: '500') ?>">
        </div>
      </div>
      <div class="ap-form-group">
        <label class="ap-label">Köşe Yazısı Konusu</label>
        <input type="text" name="tek_konu" class="ap-input" required placeholder="Örn: Günümüz gençliğinin dijital bağımlılığı">
      </div>
      <input type="hidden" name="tek_category" value="kose-yazisi">
      <button type="submit" class="ap-btn ap-btn-primary">🖊 Köşe Yazısı Üret</button>
    </form>
    <?php endif; ?>
  </div>

  <div>
    <div class="ap-card">
      <div class="ap-card-header"><h2 class="ap-card-title">✍ Mevcut Yazarlar</h2></div>
      <?php if (empty($columnists)): ?>
      <p style="color:var(--ap-text-2);font-size:13px">Köşe yazarı yok. <a href="/admin?page=columnists">Ekle →</a></p>
      <?php else: ?>
      <div style="display:grid;gap:8px">
        <?php foreach ($columnists as $col): ?>
        <div style="display:flex;align-items:center;gap:10px;padding:8px;background:var(--ap-surface-2);border-radius:8px">
          <?php if ($col['avatar']): ?>
          <img src="<?= e($col['avatar']) ?>" style="width:32px;height:32px;border-radius:50%;object-fit:cover">
          <?php else: ?>
          <div style="width:32px;height:32px;border-radius:50%;background:var(--ap-accent);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700"><?= mb_substr($col['name'],0,1) ?></div>
          <?php endif; ?>
          <div style="flex:1;min-width:0">
            <div style="font-weight:600;font-size:13px"><?= e($col['name']) ?></div>
            <div style="font-size:11px;color:var(--ap-text-2)"><?= e($col['title'] ?? '') ?></div>
          </div>
        </div>
        <?php endforeach; ?>
      </div>
      <a href="/admin?page=columnists" class="ap-btn ap-btn-ghost" style="width:100%;margin-top:10px;text-align:center">Yazarları Yönet →</a>
      <?php endif; ?>
    </div>
  </div>
</div>

<!-- ══════════ SEKME 5: HABER BLOKLARI ══════════ -->
<?php elseif ($tab === 'bloklar'): ?>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
  <div class="ap-card">
    <div class="ap-card-header"><h2 class="ap-card-title">📰 Manşet Ayarları</h2></div>
    <form method="POST">
      <input type="hidden" name="_csrf" value="<?= e($csrf) ?>">
      <input type="hidden" name="ai_save_blocks" value="1">
      <div class="ap-form-row">
        <div class="ap-form-group" style="flex:1">
          <label class="ap-label">Ana Manşet Sayısı</label>
          <input type="number" name="theme_manset_count" class="ap-input" min="1" max="10"
                 value="<?= e($s['theme_manset_count']) ?>">
          <div class="ap-hint">Anasayfa slider'ında gösterilecek haber sayısı (1-7)</div>
        </div>
        <div class="ap-form-group" style="flex:1">
          <label class="ap-label">Sürgü Manşet Sayısı</label>
          <input type="number" name="theme_surmanset_count" class="ap-input" min="1" max="10"
                 value="<?= e($s['theme_surmanset_count']) ?>">
          <div class="ap-hint">Sağ sütun küçük manşet (1-6)</div>
        </div>
      </div>
      <div class="ap-form-row">
        <div class="ap-form-group" style="flex:1">
          <label class="ap-label">Slider Yüksekliği (px)</label>
          <input type="number" name="theme_manset_height" class="ap-input" min="300" max="800"
                 value="<?= e($s['theme_manset_height']) ?>">
          <div class="ap-hint">Directives: 380-680 px arası önerilen</div>
        </div>
        <div class="ap-form-group" style="flex:1">
          <label class="ap-label">Son Haberler Sayısı</label>
          <input type="number" name="theme_son_haberler_count" class="ap-input" min="1" max="50"
                 value="<?= e($s['theme_son_haberler_count']) ?>">
        </div>
      </div>
      <div class="ap-form-group">
        <label class="ap-label">Köşe Yazarı Gösterim Sayısı</label>
        <input type="number" name="theme_kose_count" class="ap-input" min="1" max="20"
               value="<?= e($s['theme_kose_count']) ?>">
      </div>
      <div class="ap-form-group">
        <label class="ap-label">Ana Kategoriler (virgülle ayrılmış slug)</label>
        <input type="text" name="theme_ana_kategoriler" class="ap-input"
               value="<?= e($s['theme_ana_kategoriler']) ?>"
               placeholder="gundem,ekonomi,dunya,spor,teknoloji">
        <div class="ap-hint">Anasayfada blok olarak gösterilecek kategoriler</div>
      </div>
      <div class="ap-form-group">
        <label class="ap-label">Reklam Arası (her kaç haberden sonra)</label>
        <input type="number" name="theme_reklam_arasi" class="ap-input" min="0" max="20"
               value="<?= e($s['theme_reklam_arasi'] ?: '5') ?>">
        <div class="ap-hint">0 = reklam gösterme</div>
      </div>
      <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:14px">
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
          <input type="checkbox" name="theme_ikon_bant" value="1" <?= $s['theme_ikon_bant']?'checked':'' ?>>
          <span class="ap-label" style="margin:0">İkon Bant Göster</span>
        </label>
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
          <input type="checkbox" name="theme_finans_bant" value="1" <?= $s['theme_finans_bant']?'checked':'' ?>>
          <span class="ap-label" style="margin:0">Finans Bandı Göster</span>
        </label>
      </div>
      <button type="submit" class="ap-btn ap-btn-primary">💾 Kaydet</button>
    </form>
  </div>

  <div>
    <div class="ap-card">
      <div class="ap-card-header"><h2 class="ap-card-title">🔲 Anasayfa Blok Düzeni</h2></div>
      <div style="font-size:13px;color:var(--ap-text-2);margin-bottom:12px">Blok yerleşimini sürükle-bırak ile düzenleyin:</div>
      <a href="/admin?page=anasayfa-moduller" class="ap-btn ap-btn-primary" style="width:100%;text-align:center;display:block">
        🗂 Modül Yerleşim Yöneticisi →
      </a>
      <hr style="border-color:var(--ap-border);margin:14px 0">
      <div style="font-size:12px;color:var(--ap-text-2)">
        <div style="margin-bottom:6px;font-weight:600">Aktif Bloklar:</div>
        <?php foreach ([
          '🎠 Manşet Slider', '📰 Son Haberler Bandı', '✍ Köşe Yazarları',
          '🔲 İkon Bant', '📦 Kategori Blokları', '📺 Video TV (varsa)',
        ] as $blok): ?>
        <div style="padding:5px 8px;background:var(--ap-surface-2);border-radius:6px;margin-bottom:4px"><?= $blok ?></div>
        <?php endforeach; ?>
      </div>
    </div>

    <div class="ap-card" style="margin-top:12px">
      <div class="ap-card-header"><h2 class="ap-card-title">📊 İçerik Özeti</h2></div>
      <?php
      $postCount = $catCount = $colCount = 0;
      try {
        $postCount = (int)DB::queryValue("SELECT COUNT(*) FROM `{p}posts` WHERE status='published'");
        $catCount  = (int)DB::queryValue("SELECT COUNT(*) FROM `{p}categories` WHERE active=1");
        $colCount  = (int)DB::queryValue("SELECT COUNT(*) FROM `{p}columnists` WHERE active=1");
      } catch (\Throwable) {}
      ?>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;text-align:center">
        <?php foreach ([
          ['Haber', $postCount, '#3b82f6'], ['Kategori', $catCount, '#8b5cf6'], ['Yazar', $colCount, '#10b981'],
        ] as [$l,$v,$c]): ?>
        <div style="padding:10px;background:var(--ap-surface-2);border-radius:8px">
          <div style="font-size:20px;font-weight:900;color:<?= $c ?>"><?= $v ?></div>
          <div style="font-size:11px;color:var(--ap-text-2)"><?= $l ?></div>
        </div>
        <?php endforeach; ?>
      </div>
    </div>
  </div>
</div>

<!-- ══════════ SEKME 6: API AYARLARI ══════════ -->
<?php elseif ($tab === 'ayarlar'): ?>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:start">
  <div class="ap-card">
    <div class="ap-card-header">
      <h2 class="ap-card-title">🔑 OpenAI API Ayarları</h2>
      <?php if ($apiConfigured): ?>
      <span style="background:#22c55e20;color:#22c55e;font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px">✓ Bağlı</span>
      <?php else: ?>
      <span style="background:#ef444420;color:#ef4444;font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px">⚠ Ayarlanmamış</span>
      <?php endif; ?>
    </div>
    <form method="POST">
      <input type="hidden" name="_csrf" value="<?= e($csrf) ?>">
      <input type="hidden" name="ai_save_api" value="1">
      <div class="ap-form-group">
        <label class="ap-label">OpenAI API Anahtarı</label>
        <input type="password" name="ai_api_key" class="ap-input"
               value="<?= e($s['ai_api_key']) ?>" placeholder="sk-proj-...">
        <div class="ap-hint"><a href="https://platform.openai.com/api-keys" target="_blank">platform.openai.com</a>'dan alın.</div>
      </div>
      <div class="ap-form-row">
        <div class="ap-form-group" style="flex:1">
          <label class="ap-label">AI Modeli</label>
          <select name="ai_model" class="ap-input">
            <?php foreach ([
              'gpt-4o-mini'=>'GPT-4o Mini (Önerilen — Hızlı & Ucuz)',
              'gpt-4o'=>'GPT-4o (En Kaliteli)',
              'gpt-4-turbo'=>'GPT-4 Turbo',
              'gpt-3.5-turbo'=>'GPT-3.5 Turbo (En Ucuz)',
            ] as $m => $label): ?>
            <option value="<?= $m ?>" <?= $s['ai_model']===$m?'selected':'' ?>><?= $label ?></option>
            <?php endforeach; ?>
          </select>
        </div>
        <div class="ap-form-group" style="flex:1">
          <label class="ap-label">Varsayılan Dil</label>
          <select name="ai_lang" class="ap-input">
            <option value="tr" <?= $s['ai_lang']==='tr'?'selected':'' ?>>Türkçe</option>
            <option value="en" <?= $s['ai_lang']==='en'?'selected':'' ?>>İngilizce</option>
          </select>
        </div>
      </div>
      <div class="ap-form-row">
        <div class="ap-form-group" style="flex:1">
          <label class="ap-label">Günlük Maks. Haber</label>
          <input type="number" name="ai_max_daily" class="ap-input" min="1" max="1000"
                 value="<?= e($s['ai_max_daily']) ?>">
        </div>
        <div class="ap-form-group" style="flex:1">
          <label class="ap-label">Çalışma Başına Maks.</label>
          <input type="number" name="ai_max_per_run" class="ap-input" min="1" max="100"
                 value="<?= e($s['ai_max_per_run']) ?>">
        </div>
      </div>
      <div class="ap-form-row">
        <div class="ap-form-group" style="flex:1">
          <label class="ap-label">Min Kelime</label>
          <input type="number" name="ai_min_words" class="ap-input" min="50" max="5000"
                 value="<?= e($s['ai_min_words']) ?>">
        </div>
        <div class="ap-form-group" style="flex:1">
          <label class="ap-label">Maks Kelime</label>
          <input type="number" name="ai_max_words" class="ap-input" min="100" max="5000"
                 value="<?= e($s['ai_max_words']) ?>">
        </div>
      </div>
      <div class="ap-form-row">
        <div class="ap-form-group" style="flex:1">
          <label class="ap-label">Varsayılan Ton</label>
          <select name="ai_default_tone" class="ap-input">
            <?php foreach (['samimi'=>'Samimi','resmi'=>'Resmi','analitik'=>'Analitik','mizahi'=>'Mizahi','dramatik'=>'Dramatik'] as $v=>$l): ?>
            <option value="<?= $v ?>" <?= $s['ai_default_tone']===$v?'selected':'' ?>><?= $l ?></option>
            <?php endforeach; ?>
          </select>
        </div>
        <div class="ap-form-group" style="flex:1">
          <label class="ap-label">Otomatik Yayınla</label>
          <select name="ai_auto_publish" class="ap-input">
            <option value="1" <?= $s['ai_auto_publish']==='1'?'selected':'' ?>>Evet — Direkt Yayınla</option>
            <option value="0" <?= $s['ai_auto_publish']==='0'?'selected':'' ?>>Hayır — Taslak</option>
          </select>
        </div>
      </div>
      <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:14px">
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
          <input type="checkbox" name="ai_title_rewrite" value="1" <?= $s['ai_title_rewrite']?'checked':'' ?>>
          <span class="ap-label" style="margin:0">Başlıkları Yeniden Yaz</span>
        </label>
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
          <input type="checkbox" name="ai_content_rewrite" value="1" <?= $s['ai_content_rewrite']?'checked':'' ?>>
          <span class="ap-label" style="margin:0">İçeriği Yeniden Yaz</span>
        </label>
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
          <input type="checkbox" name="ai_duplicate_check" value="1" <?= $s['ai_duplicate_check']!=='0'?'checked':'' ?>>
          <span class="ap-label" style="margin:0">Tekrar Kontrol</span>
        </label>
      </div>
      <div class="ap-form-group">
        <label class="ap-label">Varsayılan Kategori</label>
        <select name="ai_default_cat" class="ap-input">
          <option value="">— AI karar versin —</option>
          <?php foreach ($cats as $c): ?>
          <option value="<?= e($c['slug']) ?>" <?= $s['ai_default_cat']===$c['slug']?'selected':'' ?>><?= e($c['name']) ?></option>
          <?php endforeach; ?>
        </select>
      </div>
      <button type="submit" class="ap-btn ap-btn-primary">💾 Kaydet</button>
    </form>
  </div>

  <div>
    <div class="ap-card">
      <div class="ap-card-header"><h2 class="ap-card-title">📖 Cron Kurulum Rehberi</h2></div>
      <div style="font-size:13px;line-height:1.8;color:var(--ap-text-2)">
        <p><strong>1.</strong> API anahtarını girin ve kaydedin.</p>
        <p><strong>2.</strong> <em>Klasik RSS</em> sekmesinden kaynak URL'leri ekleyin.</p>
        <p><strong>3.</strong> cPanel → <strong>Cron Jobs</strong>:</p>
        <div style="background:#0d1117;border-radius:6px;padding:10px;font-family:monospace;font-size:11px;color:#79c0ff;margin:8px 0;word-break:break-all">
          */<?= e($s['ai_rss_cron_interval']) ?> * * * * php <?= ROOT ?>/core/cron-worker.php
        </div>
        <p><strong>4.</strong> Kategorileri <a href="/admin?page=categories">buradan</a> düzenleyin.</p>
        <p><strong>5.</strong> Köşe yazarları için <a href="/admin?page=columnists">Köşe Yazarları</a>'na gidin.</p>
      </div>
    </div>

    <div class="ap-card" style="margin-top:12px">
      <div class="ap-card-header"><h2 class="ap-card-title">💰 Token Tahminleri</h2></div>
      <div style="font-size:12px;color:var(--ap-text-2);line-height:2">
        <?php $model = $s['ai_model'] ?: 'gpt-4o-mini'; ?>
        <div><strong>Model:</strong> <?= e($model) ?></div>
        <div><strong>Tahmini maliyet/haber:</strong>
          <?php echo match(true) {
            str_contains($model,'gpt-4o-mini') => '~$0.001 — $0.003',
            str_contains($model,'gpt-4o')      => '~$0.01 — $0.03',
            str_contains($model,'gpt-4-turbo') => '~$0.03 — $0.10',
            default                             => '~$0.001 — $0.005',
          }; ?>
        </div>
        <div><strong>Günlük maks:</strong> <?= e($s['ai_max_daily']) ?> haber</div>
        <div><strong>Tahmini günlük:</strong>
          <?php $maxD = (int)$s['ai_max_daily'];
          echo match(true) {
            str_contains($model,'gpt-4o-mini') => '$' . number_format($maxD * 0.002, 2),
            str_contains($model,'gpt-4o')      => '$' . number_format($maxD * 0.02, 2),
            default                             => '$' . number_format($maxD * 0.005, 2),
          }; ?> / gün
        </div>
      </div>
    </div>
  </div>
</div>

<!-- ══════════ SEKME 7: SİTE BAKIMI ══════════ -->
<?php elseif ($tab === 'bakim'): ?>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
  <div class="ap-card">
    <div class="ap-card-header"><h2 class="ap-card-title">🔧 İçerik Temizleme</h2></div>
    <div style="display:grid;gap:12px">
      <?php
      $trashCount = $draftCount = $logCount = $processedCount = 0;
      try {
        $trashCount     = (int)DB::queryValue("SELECT COUNT(*) FROM `{p}posts` WHERE status='trash'");
        $draftCount     = (int)DB::queryValue("SELECT COUNT(*) FROM `{p}posts` WHERE status='draft' AND created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)");
        $logCount       = (int)DB::queryValue("SELECT COUNT(*) FROM `{p}rss_logs` WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)");
        $processedCount = (int)DB::queryValue("SELECT COUNT(*) FROM `{p}rss_processed` WHERE created_at < DATE_SUB(NOW(), INTERVAL 60 DAY)");
      } catch (\Throwable) {}
      ?>
      <!-- Çöp Sil -->
      <div style="padding:12px;background:var(--ap-surface-2);border-radius:8px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <div>
            <div style="font-weight:600;font-size:13px">🗑 Çöp Haberler</div>
            <div style="font-size:11px;color:var(--ap-text-2)"><?= $trashCount ?> haber çöpte</div>
          </div>
          <form method="POST">
            <input type="hidden" name="_csrf" value="<?= e($csrf) ?>">
            <input type="hidden" name="bakim_action" value="clean_trash">
            <button type="submit" class="ap-btn ap-btn-sm" style="background:#ef444420;color:#ef4444"
                    onclick="return confirm('<?= $trashCount ?> çöp haber silinecek. Emin misiniz?')">Temizle</button>
          </form>
        </div>
      </div>
      <!-- Eski Taslaklar -->
      <div style="padding:12px;background:var(--ap-surface-2);border-radius:8px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <div>
            <div style="font-weight:600;font-size:13px">📄 30+ Günlük Taslaklar</div>
            <div style="font-size:11px;color:var(--ap-text-2)"><?= $draftCount ?> eski taslak</div>
          </div>
          <form method="POST">
            <input type="hidden" name="_csrf" value="<?= e($csrf) ?>">
            <input type="hidden" name="bakim_action" value="clean_drafts">
            <input type="hidden" name="draft_days" value="30">
            <button type="submit" class="ap-btn ap-btn-sm" style="background:#f59e0b20;color:#f59e0b"
                    onclick="return confirm('Eski taslaklar silinecek.')">Temizle</button>
          </form>
        </div>
      </div>
      <!-- RSS Log -->
      <div style="padding:12px;background:var(--ap-surface-2);border-radius:8px">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div>
            <div style="font-weight:600;font-size:13px">📋 Eski RSS Logları</div>
            <div style="font-size:11px;color:var(--ap-text-2)"><?= $logCount ?> eski kayıt (30+ gün)</div>
          </div>
          <form method="POST">
            <input type="hidden" name="_csrf" value="<?= e($csrf) ?>">
            <input type="hidden" name="bakim_action" value="clean_rss_log">
            <button type="submit" class="ap-btn ap-btn-sm ap-btn-ghost">Temizle</button>
          </form>
        </div>
      </div>
      <!-- RSS Processed -->
      <div style="padding:12px;background:var(--ap-surface-2);border-radius:8px">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div>
            <div style="font-weight:600;font-size:13px">🔗 İşlenmiş RSS Kayıtları</div>
            <div style="font-size:11px;color:var(--ap-text-2)"><?= $processedCount ?> eski kayıt (60+ gün)</div>
          </div>
          <form method="POST">
            <input type="hidden" name="_csrf" value="<?= e($csrf) ?>">
            <input type="hidden" name="bakim_action" value="clean_processed">
            <button type="submit" class="ap-btn ap-btn-sm ap-btn-ghost">Temizle</button>
          </form>
        </div>
      </div>
      <!-- Slug Yenile -->
      <div style="padding:12px;background:var(--ap-surface-2);border-radius:8px">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div>
            <div style="font-weight:600;font-size:13px">🔗 Boş Slug'ları Yenile</div>
            <div style="font-size:11px;color:var(--ap-text-2)">Başlıktan otomatik slug üret</div>
          </div>
          <form method="POST">
            <input type="hidden" name="_csrf" value="<?= e($csrf) ?>">
            <input type="hidden" name="bakim_action" value="rebuild_slugs">
            <button type="submit" class="ap-btn ap-btn-sm ap-btn-ghost">Yenile</button>
          </form>
        </div>
      </div>
    </div>
  </div>

  <div>
    <div class="ap-card">
      <div class="ap-card-header"><h2 class="ap-card-title">📊 Veritabanı Özeti</h2></div>
      <?php
      $dbStats = [];
      $tables = ['posts','categories','columnists','users','menus','media','rss_campaigns','rss_logs','rss_processed','video_channels'];
      $p = DB::prefix();
      foreach ($tables as $t) {
        try {
          $dbStats[$t] = (int)DB::queryValue("SELECT COUNT(*) FROM `{$p}{$t}`");
        } catch (\Throwable) { $dbStats[$t] = '—'; }
      }
      ?>
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <?php foreach ($dbStats as $t => $n): ?>
        <tr style="border-bottom:1px solid var(--ap-border)">
          <td style="padding:5px 8px;color:var(--ap-text-2)"><?= $p.$t ?></td>
          <td style="padding:5px 8px;font-weight:700;text-align:right;color:var(--ap-text)"><?= $n ?></td>
        </tr>
        <?php endforeach; ?>
      </table>
    </div>

    <div class="ap-card" style="margin-top:12px">
      <div class="ap-card-header"><h2 class="ap-card-title">⚙ PHP & Sunucu Bilgisi</h2></div>
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <?php foreach ([
          ['PHP Sürümü', PHP_VERSION],
          ['Maks Upload', ini_get('upload_max_filesize')],
          ['Maks POST', ini_get('post_max_size')],
          ['Memory Limit', ini_get('memory_limit')],
          ['Max Exec Time', ini_get('max_execution_time').'s'],
          ['ZipArchive', class_exists('ZipArchive') ? '✅ Var' : '❌ Yok'],
          ['cURL', function_exists('curl_init') ? '✅ Var' : '❌ Yok'],
        ] as [$k,$v]): ?>
        <tr style="border-bottom:1px solid var(--ap-border)">
          <td style="padding:5px 8px;color:var(--ap-text-2)"><?= $k ?></td>
          <td style="padding:5px 8px;font-weight:600;text-align:right"><?= $v ?></td>
        </tr>
        <?php endforeach; ?>
      </table>
    </div>
  </div>
</div>

<?php endif; ?>

<?php }); // ap_admin_layout
