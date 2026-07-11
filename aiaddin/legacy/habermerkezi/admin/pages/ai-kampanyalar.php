<?php
/**
 * AhenkPress — RSS Kampanya Yönetimi
 * Sub: list | ekle | duzenle | loglar | ayarlar
 */
defined('ROOT') or die();

$sub = preg_replace('/[^a-z]/', '', $_GET['sub'] ?? 'list');
$kid = (int)($_GET['kid'] ?? 0);
$categories = DB::query("SELECT id,name FROM `{p}categories` ORDER BY name ASC") ?: [];

/* ──────────────── AJAX ──────────────── */
if ($_SERVER['REQUEST_METHOD'] === 'POST' && !empty($_SERVER['HTTP_X_REQUESTED_WITH'])) {
    Security::verifyCsrf();
    $action = $_POST['action'] ?? '';

    if ($action === 'kampanya_isle') {
        $id = (int)($_POST['kid'] ?? 0);
        if (!$id) ap_ajax_error('Geçersiz ID');
        $kamp = DB::queryRow("SELECT * FROM `{p}rss_campaigns` WHERE id=?", [$id]);
        if (!$kamp) ap_ajax_error('Kampanya bulunamadı');
        require_once ROOT . '/core/rss-fetcher.php';
        try {
            $res = ap_run_campaign($kamp);
            ap_ajax_success($res, ($res['added'] ?? 0) . " eklendi, " . ($res['skipped'] ?? 0) . " atlandı");
        } catch (Throwable $e) {
            ap_ajax_error($e->getMessage());
        }
    }

    if ($action === 'durum_toggle') {
        $id  = (int)($_POST['kid'] ?? 0);
        $dur = (int)($_POST['active'] ?? 0);
        DB::execute("UPDATE `{p}rss_campaigns` SET active=? WHERE id=?", [$dur, $id]);
        ap_ajax_success(['active' => $dur]);
    }

    if ($action === 'sifirla') {
        $id = (int)($_POST['kid'] ?? 0);
        $sl = DB::queryValue("SELECT slug FROM `{p}rss_campaigns` WHERE id=?", [$id]);
        if ($sl) DB::execute("DELETE FROM `{p}rss_processed` WHERE campaign_slug=?", [$sl]);
        DB::execute("UPDATE `{p}rss_campaigns` SET total_added=0 WHERE id=?", [$id]);
        ap_ajax_success(null, 'İşlenen linkler sıfırlandı');
    }

    if ($action === 'log_temizle') {
        $id = (int)($_POST['kid'] ?? 0);
        if ($id) DB::execute("DELETE FROM `{p}rss_logs` WHERE campaign_id=?", [$id]);
        else     DB::execute("DELETE FROM `{p}rss_logs`");
        ap_ajax_success(null, 'Loglar temizlendi');
    }

    if ($action === 'duplicate_temizle') {
        $dupes = DB::query("SELECT title, MIN(id) as keep_id, COUNT(*) as cnt FROM `{p}posts` WHERE post_type IN ('news','haber') GROUP BY title HAVING cnt > 1") ?: [];
        $silinen = 0;
        foreach ($dupes as $d) {
            $rows = DB::query("SELECT id FROM `{p}posts` WHERE title=? AND id!=?", [$d['title'], $d['keep_id']]) ?: [];
            foreach ($rows as $r) {
                DB::execute("DELETE FROM `{p}posts` WHERE id=?", [$r['id']]);
                $silinen++;
            }
        }
        ap_ajax_success(['silinen' => $silinen], "{$silinen} mükerrer haber silindi");
    }

    ap_ajax_error('Bilinmeyen işlem');
}

/* ──────────── Kampanya Sil ──────────── */
if ($sub === 'list' && isset($_GET['ahb_sil'])) {
    Security::verifyCsrf($_GET['_csrf'] ?? '');
    $sil = (int)$_GET['ahb_sil'];
    $sl  = DB::queryValue("SELECT slug FROM `{p}rss_campaigns` WHERE id=?", [$sil]);
    DB::execute("DELETE FROM `{p}rss_campaigns` WHERE id=?", [$sil]);
    DB::execute("DELETE FROM `{p}rss_logs` WHERE campaign_id=?", [$sil]);
    if ($sl) DB::execute("DELETE FROM `{p}rss_processed` WHERE campaign_slug=?", [$sl]);
    ap_redirect('/admin/?page=ai-kampanyalar&silindi=1');
}

/* ──────────── Kaydet ──────────────── */
$form_msg = '';
if (in_array($sub, ['ekle','duzenle']) && $_SERVER['REQUEST_METHOD']==='POST' && isset($_POST['ahb_kaydet'])) {
    Security::verifyCsrf();
    $name = trim($_POST['ahb_ad'] ?? '');
    $feeds = trim($_POST['ahb_beslemeler'] ?? '');
    if (!$name)  $form_msg = '<div class="ahb-notice hata">Kampanya adı zorunludur.</div>';
    elseif (!$feeds) $form_msg = '<div class="ahb-notice hata">En az bir besleme URL girilmelidir.</div>';
    else {
        $data = [
            'name'             => $name,
            'slug'             => ap_unique_slug($name, DB::prefix().'rss_campaigns', 'slug', $kid ?: null),
            'feeds'            => $feeds,
            'active'           => isset($_POST['ahb_durum']) ? 1 : 0,
            'source_type'      => $_POST['ahb_kaynak_tipi'] ?? 'rss',
            'post_type'        => $_POST['ahb_post_turu'] ?? 'news',
            'category_id'      => (int)($_POST['ahb_kategori_id'] ?? 0),
            'tags'             => trim($_POST['ahb_etiketler'] ?? ''),
            'is_breaking'      => isset($_POST['ahb_haber_basi']) ? 1 : 0,
            'breaking_words'   => trim($_POST['ahb_son_dakika_kelime'] ?? 'son dakika,acil,flas,breaking'),
            'translate'        => isset($_POST['ahb_cevirisi_yap']) ? 1 : 0,
            'translate_from'   => $_POST['ahb_ceviri_kaynak'] ?? 'en',
            'translate_to'     => $_POST['ahb_ceviri_hedef'] ?? 'tr',
            'translate_engine' => $_POST['ahb_ceviri_motor'] ?? 'google',
            'download_images'  => isset($_POST['ahb_resim_indir']) ? 1 : 0,
            'min_words'        => max(0,(int)($_POST['ahb_min_kelime'] ?? 20)),
            'max_days'         => max(0,(int)($_POST['ahb_max_gun'] ?? 7)),
            'interval_minutes' => max(5,(int)($_POST['ahb_her_kac_dakika'] ?? 30)),
            'max_per_day'      => max(0,(int)($_POST['ahb_max_post_gun'] ?? 5)),
        ];
        if ($kid) {
            $set  = implode('=?,', array_keys($data)) . '=?';
            $vals = array_values($data); $vals[] = $kid;
            DB::execute("UPDATE `{p}rss_campaigns` SET {$set} WHERE id=?", $vals);
            $form_msg = '<div class="ahb-notice basari">Kaydedildi! <a href="/admin/?page=ai-kampanyalar">← Listeye Dön</a></div>';
        } else {
            $cols = implode(',', array_keys($data));
            $phs  = implode(',', array_fill(0, count($data), '?'));
            DB::execute("INSERT INTO `{p}rss_campaigns` ({$cols}) VALUES ({$phs})", array_values($data));
            $nid = (int)DB::lastInsertId();
            ap_redirect("/admin/?page=ai-kampanyalar&sub=duzenle&kid={$nid}&kaydedildi=1");
        }
    }
}

/* ──────────── Hazır kaynaklar ──────── */
$hazir = [
    ['NTV Gündem','https://www.ntv.com.tr/gundem/rss'],
    ['NTV Ekonomi','https://www.ntv.com.tr/ekonomi/rss'],
    ['NTV Spor','https://www.ntv.com.tr/spor/rss'],
    ['Sabah Ana','https://www.sabah.com.tr/rss/anabasliklar.xml'],
    ['Sabah Spor','https://www.sabah.com.tr/rss/spor.xml'],
    ['Hürriyet','https://www.hurriyet.com.tr/rss/anasayfa'],
    ['Hürriyet Eko','https://www.hurriyet.com.tr/rss/ekonomi'],
    ['Sözcü','https://www.sozcu.com.tr/feed/'],
    ['TRT Son Dakika','https://www.trthaber.com/sondakika.rss'],
    ['TRT Gündem','https://www.trthaber.com/gundem.rss'],
    ['Haberler.com','https://www.haberler.com/rss/'],
    ['Milliyet','https://www.milliyet.com.tr/rss/rssNew/gundemRss.xml'],
    ['Cumhuriyet','https://www.cumhuriyet.com.tr/rss/son_dakika.xml'],
    ['CNN Türk','https://www.cnnturk.com/feed/rss/turkiye'],
    ['BBC Türkçe','https://feeds.bbci.co.uk/turkce/rss.xml'],
    ['DW Türkçe','https://rss.dw.com/rdf/rss-tur-all'],
    ['Habertürk','https://www.haberturk.com/rss'],
    ['Posta','https://www.posta.com.tr/rss'],
    ['Star','https://www.star.com.tr/rss'],
    ['Yeni Şafak','https://www.yenisafak.com/Rss'],
    ['A Haber','https://www.ahaber.com.tr/rss/gundem.xml'],
    ['Diken','https://www.diken.com.tr/feed/'],
    ['Bianet','https://bianet.org/bianet/rss'],
    ['Gazete Duvar','https://www.gazeteduvar.com.tr/feed'],
    ['Turk.eco','https://turk.eco/tr/rss/category/ekoloji'],
    ['Haber Global','https://habersitesi.com/feed/'],
];

/* ═══ sonraki cron ════ */
function ahb_cron_next(): string {
    $last = (int)DB::setting('cron_last_run', 0);
    $next = $last + 300;
    return $next <= time() ? 'Hemen (bekliyor)' : date('d.m.Y H:i', $next);
}

/* ═══════════════════════════════════════
   SAYFA: LİSTE
═══════════════════════════════════════ */
if ($sub === 'list') {
    $camps   = DB::query("SELECT c.*, cat.name as kat_adi FROM `{p}rss_campaigns` c LEFT JOIN `{p}categories` cat ON cat.id=c.category_id ORDER BY c.id DESC") ?: [];
    $toplam  = count($camps);
    $aktif   = count(array_filter($camps, fn($c) => (int)$c['active']===1));
    $eklenen = (int)(array_sum(array_column($camps,'total_added')));

    ap_admin_layout('RSS Kampanyaları', function() use ($camps,$toplam,$aktif,$eklenen) {
?>
<style>
.ahbw{max-width:1200px}
.ahb-hd{background:linear-gradient(135deg,#1a1a2e,#16213e);color:#fff;padding:22px 26px;border-radius:12px;margin-bottom:18px}
.ahb-hd-logo{font-size:22px;font-weight:900;letter-spacing:1px;margin-bottom:6px}.red{color:#e94560}
.ahb-hd h1{margin:0;font-size:18px;font-weight:700}.ahb-hd p{margin:4px 0 0;font-size:13px;color:#9ca3af}
.ahb-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:18px}
.stat{background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:18px 20px;text-align:center}
.stat.g{border-left:4px solid #22c55e}.stat.b{border-left:4px solid #3b82f6}.stat.o{border-left:4px solid #f59e0b}
.stat-n{display:block;font-size:30px;font-weight:900;color:#1a1a2e}.stat-l{font-size:12px;color:#6b7280;font-weight:600}
.ahb-bar{display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;align-items:center}
.ahb-bos{text-align:center;padding:60px 20px;background:#f9fafb;border-radius:12px;border:2px dashed #e5e7eb}
.ahb-bos div{font-size:48px}.ahb-bos h2{color:#374151;margin:12px 0 6px}.ahb-bos p{color:#9ca3af}
.kamp-tablo{border-radius:8px;overflow:hidden}
.aktif-sat td:first-child{border-left:3px solid #22c55e}
.pasif-sat td:first-child{border-left:3px solid #d1d5db}
.tog-btn{border:none;border-radius:20px;padding:3px 12px;cursor:pointer;font-size:12px;font-weight:700}
.tog-a{background:#dcfce7;color:#166534}.tog-p{background:#f3f4f6;color:#6b7280}
.islem-gr{display:flex;gap:4px;flex-wrap:wrap}
.isle-btn{background:#e94560!important;color:#fff!important;border-color:#e94560!important}
.sif-btn{background:#fef9c3!important;color:#854d0e!important}
.sil-btn{background:#fee2e2!important;color:#991b1b!important}
.rozet{background:#dbeafe;color:#1e40af;padding:2px 8px;border-radius:12px;font-size:12px;font-weight:700}
.isle-out{font-size:12px;padding:4px 8px;border-radius:4px;margin-top:4px;display:none}
.isle-out.ok{background:#dcfce7;color:#166534}.isle-out.err{background:#fee2e2;color:#991b1b}
.ahb-notice{padding:10px 16px;border-radius:6px;margin-bottom:14px;font-weight:600}
.basari{background:#dcfce7;color:#166534;border:1px solid #bbf7d0}
</style>
<div class="ahbw">
  <?php if (isset($_GET['silindi'])): ?><div class="ahb-notice basari">Kampanya silindi.</div><?php endif; ?>
  <div class="ahb-hd">
    <div class="ahb-hd-logo"><span class="red">AHENK</span> HABER BOTU</div>
    <h1>RSS Kampanya Yönetimi</h1>
    <p>Her kampanya bir veya birden fazla RSS/Atom beslemesini otomatik işler.</p>
  </div>
  <div class="ahb-stats">
    <div class="stat"><span class="stat-n"><?= $toplam ?></span><span class="stat-l">Toplam Kampanya</span></div>
    <div class="stat g"><span class="stat-n"><?= $aktif ?></span><span class="stat-l">Aktif</span></div>
    <div class="stat b"><span class="stat-n"><?= number_format($eklenen) ?></span><span class="stat-l">Toplam Eklenen</span></div>
    <div class="stat o"><span class="stat-n" style="font-size:14px;padding-top:8px"><?= ahb_cron_next() ?></span><span class="stat-l">Sonraki Cron</span></div>
  </div>
  <div class="ahb-bar">
    <a href="/admin/?page=ai-kampanyalar&sub=ekle" class="button button-primary" style="background:#e94560;border-color:#e94560;font-weight:700">+ Yeni Kampanya Ekle</a>
    <a href="/admin/?page=ai-kampanyalar&sub=loglar" class="button">📋 İşlem Logları</a>
    <a href="/admin/?page=ai-kampanyalar&sub=ayarlar" class="button">⚙ Bot Ayarları</a>
  </div>

  <?php if (empty($camps)): ?>
  <div class="ahb-bos">
    <div>🤖</div><h2>Henüz kampanya yok</h2>
    <p>İlk RSS kampanyanızı oluşturun.</p>
    <a href="/admin/?page=ai-kampanyalar&sub=ekle" class="button button-primary">+ Yeni Kampanya Ekle</a>
  </div>
  <?php else: ?>
  <table class="wp-list-table widefat fixed striped kamp-tablo">
    <thead><tr>
      <th width="30">ID</th><th>Kampanya Adı</th>
      <th width="90">Durum</th><th width="130">Kategori</th>
      <th width="70">Aralık</th><th width="80">Eklenen</th>
      <th width="150">Son Çalışma</th><th width="230">İşlemler</th>
    </tr></thead>
    <tbody>
    <?php foreach ($camps as $k):
      $ak = (int)$k['active']===1;
      $feeds_arr = array_filter(explode("\n", $k['feeds'] ?? ''));
      $csrf = Security::csrf();
    ?>
    <tr class="<?= $ak ? 'aktif-sat' : 'pasif-sat' ?>">
      <td><?= $k['id'] ?></td>
      <td>
        <strong><a href="/admin/?page=ai-kampanyalar&sub=duzenle&kid=<?= $k['id'] ?>"><?= e($k['name']) ?></a></strong>
        <div style="font-size:11px;color:#9ca3af;margin-top:2px">
          <?= count($feeds_arr) ?> besleme &bull; <?= e($k['source_type']) ?> &bull; <?= e($k['post_type']) ?>
          <?php if ($k['translate']): ?> &bull; <span style="color:#3b82f6">🌐 Çeviri</span><?php endif; ?>
          <?php if ($k['download_images']): ?> &bull; <span style="color:#22c55e">🖼 Resim</span><?php endif; ?>
        </div>
      </td>
      <td>
        <button class="tog-btn <?= $ak ? 'tog-a':'tog-p' ?>" data-id="<?= $k['id'] ?>" data-durum="<?= $ak?1:0 ?>">
          <?= $ak ? '✅ Aktif' : '⏸ Pasif' ?>
        </button>
      </td>
      <td style="font-size:13px"><?= e($k['kat_adi'] ?? '—') ?></td>
      <td><?= (int)$k['interval_minutes'] ?> dk</td>
      <td><span class="rozet"><?= number_format((int)$k['total_added']) ?></span></td>
      <td style="font-size:12px;color:#9ca3af"><?= $k['last_run'] > 0 ? date('d.m.Y H:i',$k['last_run']) : 'Hiç' ?></td>
      <td>
        <div class="islem-gr">
          <button class="button isle-btn calistir-btn" data-id="<?= $k['id'] ?>">▶ Çalıştır</button>
          <a href="/admin/?page=ai-kampanyalar&sub=duzenle&kid=<?= $k['id'] ?>" class="button">✏</a>
          <button class="button sif-btn sifirla-btn" data-id="<?= $k['id'] ?>">↺</button>
          <a href="/admin/?page=ai-kampanyalar&ahb_sil=<?= $k['id'] ?>&_csrf=<?= urlencode($csrf) ?>"
             class="button sil-btn"
             onclick="return confirm('<?= e($k['name']) ?> silinecek. Emin misiniz?')">🗑</a>
        </div>
        <div class="isle-out" id="out-<?= $k['id'] ?>"></div>
      </td>
    </tr>
    <?php endforeach; ?>
    </tbody>
  </table>
  <?php endif; ?>
</div>
<script>
(function(){
  var C = document.querySelector('meta[name="csrf"]')?.content||'';
  function post(d,cb){
    d._token=C;
    fetch('/admin/?page=ai-kampanyalar',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','X-Requested-With':'XMLHttpRequest'},body:new URLSearchParams(d)}).then(r=>r.json()).then(cb).catch(e=>cb({success:false,message:String(e)}));
  }
  document.querySelectorAll('.calistir-btn').forEach(b=>{
    b.addEventListener('click',function(){
      var id=this.dataset.id,out=document.getElementById('out-'+id);
      this.disabled=true;this.textContent='⏳...';var s=this;
      post({action:'kampanya_isle',kid:id},function(r){
        s.disabled=false;s.textContent='▶ Çalıştır';
        out.style.display='block';out.className='isle-out '+(r.success?'ok':'err');out.textContent=r.message;
      });
    });
  });
  document.querySelectorAll('.tog-btn').forEach(b=>{
    b.addEventListener('click',function(){
      var id=this.dataset.id,cur=parseInt(this.dataset.durum),yeni=cur===1?0:1,s=this;
      post({action:'durum_toggle',kid:id,active:yeni},function(r){
        if(r.success){s.dataset.durum=yeni;s.textContent=yeni?'✅ Aktif':'⏸ Pasif';s.className='tog-btn '+(yeni?'tog-a':'tog-p');}
      });
    });
  });
  document.querySelectorAll('.sifirla-btn').forEach(b=>{
    b.addEventListener('click',function(){
      if(!confirm('İşlenen link geçmişi silinecek. Emin misiniz?'))return;
      post({action:'sifirla',kid:this.dataset.id},function(r){alert(r.message);});
    });
  });
})();
</script>
<?php
    });
    return;
}

/* ═══════════════════════════════════════
   SAYFA: EKLE / DÜZENLE
═══════════════════════════════════════ */
if (in_array($sub, ['ekle','duzenle'])) {
    $kamp = $kid ? DB::queryRow("SELECT * FROM `{p}rss_campaigns` WHERE id=?", [$kid]) : null;
    $v = $kamp ?: ['name'=>'','active'=>1,'source_type'=>'rss','feeds'=>'','post_type'=>'news',
        'category_id'=>0,'tags'=>'','is_breaking'=>0,'breaking_words'=>'son dakika,acil,flas,breaking',
        'translate'=>0,'translate_from'=>'en','translate_to'=>'tr','translate_engine'=>'google',
        'download_images'=>1,'min_words'=>20,'max_days'=>7,'interval_minutes'=>30,'max_per_day'=>5];

    ap_admin_layout(($kid ? 'Kampanya Düzenle' : 'Yeni Kampanya'), function() use ($v,$kid,$form_msg,$categories,$hazir) {
?>
<style>
.ahbw{max-width:1400px}
.ahb-hd{background:linear-gradient(135deg,#1a1a2e,#16213e);color:#fff;padding:20px 24px;border-radius:10px;margin-bottom:14px}
.ahb-hd-logo{font-size:20px;font-weight:900;margin-bottom:4px}.red{color:#e94560}
.ahb-hd h1{margin:0;font-size:17px;font-weight:700}
.f-grid{display:grid;grid-template-columns:1fr 360px;gap:18px}
@media(max-width:900px){.f-grid{grid-template-columns:1fr}}
.panel{background:#fff;border:1px solid #e5e7eb;border-radius:10px;margin-bottom:14px;overflow:hidden}
.ph{background:#f9fafb;border-bottom:1px solid #e5e7eb;padding:11px 16px;font-weight:700;font-size:14px;color:#374151}
.pb{padding:16px}
.f-row{margin-bottom:12px}
.f-row label{display:block;font-size:13px;font-weight:600;margin-bottom:4px;color:#374151}
.f-row input,.f-row select,.f-row textarea{width:100%;padding:7px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:13px}
.f-row textarea{font-family:Consolas,monospace}
.f-row small{display:block;margin-top:3px;font-size:11px;color:#9ca3af}
.f-row.inline{display:flex;align-items:center;gap:10px}.f-row.inline label{margin:0;min-width:130px}
.f-3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}
.tog{position:relative;display:inline-block;width:40px;height:20px}
.tog input{opacity:0;width:0;height:0}
.tog-sl{position:absolute;inset:0;background:#d1d5db;border-radius:20px;cursor:pointer;transition:.2s}
.tog-sl:before{content:'';position:absolute;width:16px;height:16px;left:2px;top:2px;background:#fff;border-radius:50%;transition:.2s}
.tog input:checked+.tog-sl{background:#22c55e}
.tog input:checked+.tog-sl:before{transform:translateX(20px)}
.kavuz{margin-top:12px;padding:12px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px}
.kavuz-grid{display:flex;flex-wrap:wrap;gap:4px;margin:6px 0}
.kbtn{padding:3px 9px;font-size:11px;background:#fff;border:1px solid #d1d5db;border-radius:14px;cursor:pointer;color:#374151;transition:.15s}
.kbtn:hover{background:#e94560;color:#fff;border-color:#e94560}
.btn-kaydet{width:100%;padding:12px;font-size:15px;font-weight:700;background:#e94560!important;color:#fff!important;border-color:#e94560!important;border-radius:8px}
.ahb-notice{padding:10px 16px;border-radius:6px;margin-bottom:12px;font-weight:600}
.basari{background:#dcfce7;color:#166534;border:1px solid #bbf7d0}
.hata{background:#fee2e2;color:#991b1b;border:1px solid #fecaca}
.req{color:#e94560}
.isle-btn{background:#e94560!important;color:#fff!important;border-color:#e94560!important}
.isle-out{font-size:13px;padding:8px 12px;border-radius:6px;margin-top:8px;display:none;font-weight:600}
.isle-out.ok{background:#dcfce7;color:#166534}.isle-out.err{background:#fee2e2;color:#991b1b}
</style>
<div class="ahbw">
  <div class="ahb-hd">
    <div class="ahb-hd-logo"><span class="red">AHENK</span> HABER BOTU</div>
    <h1><?= $kid ? 'Kampanya Düzenle: <em>'.e($v['name']).'</em>' : 'Yeni Kampanya Ekle' ?></h1>
  </div>
  <a href="/admin/?page=ai-kampanyalar" class="button" style="margin-bottom:12px">← Listeye Dön</a>
  <?= $form_msg ?>
  <?php if(isset($_GET['kaydedildi'])): ?><div class="ahb-notice basari">Kampanya başarıyla kaydedildi!</div><?php endif; ?>

  <form method="POST">
    <?= Security::csrfField() ?>
    <div class="f-grid">
      <!-- SOL -->
      <div>

        <div class="panel">
          <div class="ph">📋 Temel Bilgiler</div>
          <div class="pb">
            <div class="f-row">
              <label>Kampanya Adı <span class="req">*</span></label>
              <input type="text" name="ahb_ad" value="<?= e($v['name']) ?>" placeholder="örn: NTV Gündem Haberleri" required>
            </div>
            <div class="f-row inline">
              <label>Durum</label>
              <label class="tog"><input type="checkbox" name="ahb_durum" value="1" <?= $v['active']?'checked':'' ?>><span class="tog-sl"></span></label>
              <span>Aktif</span>
            </div>
            <div class="f-row">
              <label>Post Türü</label>
              <select name="ahb_post_turu">
                <?php foreach(['news'=>'Haber','post'=>'Blog Yazısı','columnist'=>'Köşe Yazısı'] as $val=>$lbl): ?>
                <option value="<?= $val ?>" <?= $v['post_type']===$val?'selected':'' ?>><?= $lbl ?></option>
                <?php endforeach; ?>
              </select>
            </div>
            <div class="f-row">
              <label>Otomatik Atanacak Kategori</label>
              <select name="ahb_kategori_id">
                <option value="0">— Kategori Seçme —</option>
                <?php foreach($categories as $c): ?>
                <option value="<?= $c['id'] ?>" <?= (int)$v['category_id']===(int)$c['id']?'selected':'' ?>><?= e($c['name']) ?></option>
                <?php endforeach; ?>
              </select>
            </div>
            <div class="f-row">
              <label>Sabit Etiketler <small style="font-weight:400">(virgülle)</small></label>
              <input type="text" name="ahb_etiketler" value="<?= e($v['tags']) ?>" placeholder="haber, gündem, türkiye">
              <small>RSS'deki etiketler de otomatik eklenir.</small>
            </div>
          </div>
        </div>

        <div class="panel">
          <div class="ph">📡 Besleme Kaynakları <span class="req">*</span></div>
          <div class="pb">
            <div class="f-row">
              <label>Besleme URL'leri (her satıra bir URL)</label>
              <textarea name="ahb_beslemeler" id="besleme_ta" rows="8" required
                placeholder="https://www.ntv.com.tr/gundem/rss&#10;https://www.youtube.com/@kanaladi&#10;https://feeds.bbci.co.uk/turkce/rss.xml"><?= e($v['feeds']) ?></textarea>
              <small>RSS, Atom veya YouTube kanal/playlist/video URL'si yazabilirsiniz. Tip otomatik anlaşılır.</small>
            </div>
            <div class="f-row">
              <label>Kaynak Tipi</label>
              <select name="ahb_kaynak_tipi">
                <?php foreach([
                  'rss'=>'RSS / Atom (Otomatik)','atom'=>'Atom',
                  'kazima'=>'🌐 HTML Kazıma (RSS yok, sayfa listesinden)',
                  'youtube_kanal'=>'YouTube Kanal','youtube_playlist'=>'YouTube Playlist',
                  'youtube_video'=>'YouTube Tek Video'
                ] as $val=>$lbl): ?>
                <option value="<?= $val ?>" <?= $v['source_type']===$val?'selected':'' ?>><?= $lbl ?></option>
                <?php endforeach; ?>
              </select>
              <small>RSS/Atom seçtiyseniz YouTube URL'leri de otomatik tanınır.</small>
            </div>

            <div class="kavuz">
              <strong>📚 Hazır Türk Haber Kaynakları</strong>
              <div class="kavuz-grid">
                <?php foreach($hazir as [$lbl,$url]): ?>
                <button type="button" class="kbtn" data-url="<?= e($url) ?>">+ <?= e($lbl) ?></button>
                <?php endforeach; ?>
              </div>
              <small>Butona tıklayın, besleme alanına otomatik eklenir.</small>
            </div>
          </div>
        </div>

        <div class="panel">
          <div class="ph">🌐 Çeviri Ayarları</div>
          <div class="pb">
            <div class="f-row inline">
              <label>Çeviri Yap</label>
              <label class="tog"><input type="checkbox" name="ahb_cevirisi_yap" value="1" id="ceviri_cb" <?= $v['translate']?'checked':'' ?>><span class="tog-sl"></span></label>
              <span>Aktif</span>
            </div>
            <div id="ceviri_alanlar" style="<?= $v['translate']?'':'opacity:.5;pointer-events:none' ?>">
              <div class="f-3">
                <div class="f-row">
                  <label>Kaynak Dil</label>
                  <select name="ahb_ceviri_kaynak">
                    <?php foreach(['en'=>'İngilizce','de'=>'Almanca','fr'=>'Fransızca','ar'=>'Arapça','ru'=>'Rusça','es'=>'İspanyolca','it'=>'İtalyanca','auto'=>'Otomatik'] as $k=>$l): ?>
                    <option value="<?= $k ?>" <?= $v['translate_from']===$k?'selected':'' ?>><?= $l ?></option>
                    <?php endforeach; ?>
                  </select>
                </div>
                <div class="f-row">
                  <label>Hedef Dil</label>
                  <select name="ahb_ceviri_hedef">
                    <option value="tr" <?= $v['translate_to']==='tr'?'selected':'' ?>>Türkçe</option>
                    <option value="en" <?= $v['translate_to']==='en'?'selected':'' ?>>İngilizce</option>
                  </select>
                </div>
                <div class="f-row">
                  <label>Çeviri Motoru</label>
                  <select name="ahb_ceviri_motor">
                    <option value="google"   <?= $v['translate_engine']==='google'?'selected':'' ?>>Google (Ücretsiz)</option>
                    <option value="mymemory" <?= $v['translate_engine']==='mymemory'?'selected':'' ?>>MyMemory (5K/gün)</option>
                    <option value="deepl"    <?= $v['translate_engine']==='deepl'?'selected':'' ?>>DeepL (API Key)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div><!-- /SOL -->

      <!-- SAĞ -->
      <div>
        <div class="panel">
          <div class="ph">⏱ Zamanlama</div>
          <div class="pb">
            <div class="f-row">
              <label>Her Kaç Dakikada Çalıştır</label>
              <input type="number" name="ahb_her_kac_dakika" value="<?= (int)$v['interval_minutes'] ?>" min="5" max="1440" style="width:120px">
              <small>Min: 5 dk. Çok sık çalıştırma sunucuyu yorar.</small>
            </div>
            <div class="f-row">
              <label>Kaç Günlük Haber Alınsın</label>
              <input type="number" name="ahb_max_gun" value="<?= (int)$v['max_days'] ?>" min="0" max="365" style="width:120px">
              <small>0 = Tüm haberler.</small>
            </div>
            <div class="f-row">
              <label>Günde Max Post</label>
              <input type="number" name="ahb_max_post_gun" value="<?= (int)$v['max_per_day'] ?>" min="0" max="500" style="width:120px">
              <small>0 = Sınırsız.</small>
            </div>
          </div>
        </div>

        <div class="panel">
          <div class="ph">📰 Haber Ayarları</div>
          <div class="pb">
            <div class="f-row inline">
              <label>Resim İndir</label>
              <label class="tog"><input type="checkbox" name="ahb_resim_indir" value="1" <?= $v['download_images']?'checked':'' ?>><span class="tog-sl"></span></label>
              <span style="font-size:12px">Açık: sunucuya indir</span>
            </div>
            <div class="f-row inline">
              <label>Haber Başı</label>
              <label class="tog"><input type="checkbox" name="ahb_haber_basi" value="1" <?= $v['is_breaking']?'checked':'' ?>><span class="tog-sl"></span></label>
              <span style="font-size:12px">Manşet olarak işaretle</span>
            </div>
            <div class="f-row">
              <label>Son Dakika Kelimeleri</label>
              <input type="text" name="ahb_son_dakika_kelime" value="<?= e($v['breaking_words']) ?>">
              <small>Başlıkta bu kelimeler varsa son dakika işareti eklenir (virgülle).</small>
            </div>
            <div class="f-row">
              <label>Min. Kelime Sayısı</label>
              <input type="number" name="ahb_min_kelime" value="<?= (int)$v['min_words'] ?>" min="0" max="500" style="width:120px">
              <small>Bu sayıdan az içerik atlanır. 0 = kontrol etme.</small>
            </div>
          </div>
        </div>

        <div class="panel">
          <div class="pb">
            <button type="submit" name="ahb_kaydet" class="button button-primary btn-kaydet">💾 Kampanyayı Kaydet</button>
            <?php if($kid): ?>
            <br>
            <button type="button" class="button isle-btn calistir-btn" data-id="<?= $kid ?>" style="margin-top:8px;width:100%">▶ Şimdi Çalıştır (Test)</button>
            <div class="isle-out" id="out-<?= $kid ?>"></div>
            <?php endif; ?>
            <p style="margin-top:10px;text-align:center"><a href="/admin/?page=ai-kampanyalar">← Listeye Dön</a></p>
          </div>
        </div>

        <?php if($kid && $kamp): ?>
        <div class="panel">
          <div class="ph">📊 İstatistikler</div>
          <div class="pb">
            <table style="width:100%;font-size:13px">
              <tr><th style="text-align:left;color:#9ca3af;padding:4px 0">Toplam Eklenen</th><td><?= number_format((int)$kamp['total_added']) ?></td></tr>
              <tr><th style="text-align:left;color:#9ca3af;padding:4px 0">Son Çalışma</th><td><?= $kamp['last_run']>0 ? date('d.m.Y H:i',$kamp['last_run']) : 'Hiç' ?></td></tr>
              <tr><th style="text-align:left;color:#9ca3af;padding:4px 0">İşlenen Link</th><td><?= (int)DB::queryValue("SELECT COUNT(*) FROM `{p}rss_processed` WHERE campaign_slug=?",[$kamp['slug']]) ?></td></tr>
            </table>
            <button type="button" class="button sifirla-btn" data-id="<?= $kid ?>" style="margin-top:8px;width:100%;background:#fef9c3!important;color:#854d0e!important">
              ↺ İşlenen Linkleri Sıfırla
            </button>
          </div>
        </div>
        <?php endif; ?>
      </div><!-- /SAĞ -->
    </div>
  </form>
</div>
<script>
(function(){
  var C=document.querySelector('meta[name="csrf"]')?.content||'';
  document.querySelectorAll('.kbtn').forEach(b=>{
    b.addEventListener('click',function(){
      var ta=document.getElementById('besleme_ta');
      var url=this.dataset.url;
      ta.value=(ta.value.trim()?ta.value.trim()+'\n':'')+url;
      ta.scrollTop=ta.scrollHeight;
      this.style.background='#dcfce7';this.style.color='#166534';
    });
  });
  var ccb=document.getElementById('ceviri_cb'),ca=document.getElementById('ceviri_alanlar');
  if(ccb&&ca) ccb.addEventListener('change',function(){ca.style.opacity=this.checked?'1':'0.5';ca.style.pointerEvents=this.checked?'':'none';});
  document.querySelectorAll('.calistir-btn').forEach(b=>{
    b.addEventListener('click',function(){
      var id=this.dataset.id,out=document.getElementById('out-'+id);
      this.disabled=true;var s=this,orig=this.textContent;this.textContent='⏳ Çalışıyor...';
      fetch('/admin/?page=ai-kampanyalar',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','X-Requested-With':'XMLHttpRequest'},body:new URLSearchParams({action:'kampanya_isle',kid:id,_token:C})}).then(r=>r.json()).then(function(r){
        s.disabled=false;s.textContent=orig;
        if(out){out.style.display='block';out.className='isle-out '+(r.success?'ok':'err');out.textContent=r.message;}
      });
    });
  });
  document.querySelectorAll('.sifirla-btn').forEach(b=>{
    b.addEventListener('click',function(){
      if(!confirm('İşlenen link geçmişi silinecek, kampanya tekrar tarama yapacak. Emin misiniz?'))return;
      fetch('/admin/?page=ai-kampanyalar',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','X-Requested-With':'XMLHttpRequest'},body:new URLSearchParams({action:'sifirla',kid:this.dataset.id,_token:C})}).then(r=>r.json()).then(r=>alert(r.message));
    });
  });
})();
</script>
<?php
    });
    return;
}

/* ═══════════════════════════════════════
   SAYFA: LOGLAR
═══════════════════════════════════════ */
if ($sub === 'loglar') {
    $fkid  = (int)($_GET['kid'] ?? 0);
    $camps = DB::query("SELECT id,name FROM `{p}rss_campaigns` ORDER BY name") ?: [];
    $loglar = $fkid
        ? DB::query("SELECT * FROM `{p}rss_logs` WHERE campaign_id=? ORDER BY id DESC LIMIT 300", [$fkid])
        : DB::query("SELECT * FROM `{p}rss_logs` ORDER BY id DESC LIMIT 300");
    $loglar = $loglar ?: [];

    ap_admin_layout('İşlem Logları', function() use ($loglar,$camps,$fkid) {
?>
<style>
.ahbw{max-width:1200px}
.ahb-hd{background:linear-gradient(135deg,#1a1a2e,#16213e);color:#fff;padding:20px 24px;border-radius:10px;margin-bottom:14px}
.ahb-hd-logo{font-size:20px;font-weight:900;margin-bottom:4px}.red{color:#e94560}
.ahb-hd h1{margin:0;font-size:17px;font-weight:700}
.ahb-bar{display:flex;gap:8px;margin-bottom:14px;align-items:center;flex-wrap:wrap}
.bos{text-align:center;padding:40px;background:#f9fafb;border-radius:10px}
.roz{padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700}
.roz-basari,.roz-success{background:#dcfce7;color:#166534}
.roz-hata,.roz-error{background:#fee2e2;color:#991b1b}
.roz-uyari,.roz-warning{background:#fef9c3;color:#854d0e}
.roz-bilgi,.roz-info{background:#dbeafe;color:#1e40af}
</style>
<div class="ahbw">
  <div class="ahb-hd">
    <div class="ahb-hd-logo"><span class="red">AHENK</span> HABER BOTU</div>
    <h1>İşlem Logları</h1>
  </div>
  <div class="ahb-bar">
    <form method="GET" style="display:flex;gap:8px">
      <input type="hidden" name="page" value="ai-kampanyalar">
      <input type="hidden" name="sub" value="loglar">
      <select name="kid" onchange="this.form.submit()">
        <option value="0">— Tüm Kampanyalar —</option>
        <?php foreach($camps as $c): ?>
        <option value="<?= $c['id'] ?>" <?= $fkid===(int)$c['id']?'selected':'' ?>><?= e($c['name']) ?></option>
        <?php endforeach; ?>
      </select>
    </form>
    <button class="button" id="logTemizle" data-id="<?= $fkid ?>">🗑 Logları Temizle</button>
    <a href="/admin/?page=ai-kampanyalar" class="button">← Kampanyalara Dön</a>
  </div>
  <div id="log-sonuc"></div>
  <?php if(empty($loglar)): ?>
  <div class="bos"><p>Log kaydı yok.</p></div>
  <?php else: ?>
  <table class="wp-list-table widefat fixed striped">
    <thead><tr><th width="40">ID</th><th width="150">Kampanya</th><th width="80">Seviye</th><th width="130">Eylem</th><th>Mesaj</th><th width="140">Tarih</th></tr></thead>
    <tbody>
    <?php foreach($loglar as $lg): $sev=$lg['level']??'info'; ?>
    <tr>
      <td><?= $lg['id'] ?></td>
      <td><small><?= e($lg['campaign_name']??'Sistem') ?></small></td>
      <td><span class="roz roz-<?= e($sev) ?>"><?= ucfirst($sev) ?></span></td>
      <td><small><?= e($lg['action']??'') ?></small></td>
      <td><?= e(mb_substr($lg['message']??'',0,200)) ?></td>
      <td><small><?= e($lg['created_at']??'') ?></small></td>
    </tr>
    <?php endforeach; ?>
    </tbody>
  </table>
  <?php endif; ?>
</div>
<script>
(function(){
  var C=document.querySelector('meta[name="csrf"]')?.content||'';
  document.getElementById('logTemizle')?.addEventListener('click',function(){
    if(!confirm('Loglar silinecek. Emin misiniz?'))return;
    var id=this.dataset.id;
    fetch('/admin/?page=ai-kampanyalar',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','X-Requested-With':'XMLHttpRequest'},body:new URLSearchParams({action:'log_temizle',kid:id,_token:C})}).then(r=>r.json()).then(function(r){
      document.getElementById('log-sonuc').innerHTML='<div style="padding:10px 16px;border-radius:6px;background:#dcfce7;color:#166534;font-weight:600;margin-bottom:12px">'+(r.message||'Temizlendi')+'</div>';
      setTimeout(()=>location.reload(),1200);
    });
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
    if ($_SERVER['REQUEST_METHOD']==='POST' && isset($_POST['ahb_ayar_kaydet'])) {
        Security::verifyCsrf();
        foreach (['ahb_deepl_api_key','ahb_mymemory_email','ahb_varsayilan_post_turu',
                  'ahb_user_agent','ahb_varsayilan_resim_url','ahb_hedef_haber_sayisi'] as $k) {
            $val = trim($_POST[$k] ?? '');
            if ($k==='ahb_hedef_haber_sayisi') $val = (string)max(10,min(2000,(int)$val));
            DB::execute("INSERT INTO `{p}settings`(`key`,`val`) VALUES(?,?) ON DUPLICATE KEY UPDATE `val`=?", [$k,$val,$val]);
        }
        ap_flash('Ayarlar kaydedildi.','success');
        ap_redirect('/admin/?page=ai-kampanyalar&sub=ayarlar');
    }

    ap_admin_layout('Bot Ayarları', function() {
?>
<style>
.ahbw{max-width:900px}
.ahb-hd{background:linear-gradient(135deg,#1a1a2e,#16213e);color:#fff;padding:20px 24px;border-radius:10px;margin-bottom:14px}
.ahb-hd-logo{font-size:20px;font-weight:900;margin-bottom:4px}.red{color:#e94560}
.ahb-hd h1{margin:0;font-size:17px;font-weight:700}
.panel{background:#fff;border:1px solid #e5e7eb;border-radius:10px;margin-bottom:14px;overflow:hidden}
.ph{background:#f9fafb;border-bottom:1px solid #e5e7eb;padding:11px 16px;font-weight:700;font-size:14px;color:#374151}
.pb{padding:16px}
.form-table th{width:220px;font-size:13px;font-weight:600;vertical-align:top;padding-top:12px}
.form-table td{padding:8px 10px}
.form-table td small{color:#9ca3af;font-size:11px;display:block;margin-top:3px}
</style>
<div class="ahbw">
  <div class="ahb-hd">
    <div class="ahb-hd-logo"><span class="red">AHENK</span> HABER BOTU</div>
    <h1>Bot Ayarları</h1>
  </div>
  <a href="/admin/?page=ai-kampanyalar" class="button" style="margin-bottom:12px">← Kampanyalara Dön</a>

  <form method="POST">
    <?= Security::csrfField() ?>

    <div class="panel">
      <div class="ph">🖼 Resim & Crawler Ayarları</div>
      <div class="pb">
        <table class="form-table">
          <tr>
            <th>Varsayılan Resim URL</th>
            <td>
              <input type="url" name="ahb_varsayilan_resim_url" class="regular-text" value="<?= e(DB::setting('ahb_varsayilan_resim_url','')) ?>" placeholder="https://site.com/resim.jpg">
              <small>Resmi olmayan haberlerde gösterilecek görsel.</small>
            </td>
          </tr>
          <tr>
            <th>Bot User-Agent</th>
            <td>
              <input type="text" name="ahb_user_agent" class="regular-text" value="<?= e(DB::setting('ahb_user_agent','')) ?>" placeholder="Mozilla/5.0 ...">
              <small>Boş bırakılırsa varsayılan UA kullanılır. Bazı siteler belirli UA'ları engeller.</small>
            </td>
          </tr>
          <tr>
            <th>Hedef Haber Sayısı (besleme başına)</th>
            <td>
              <input type="number" name="ahb_hedef_haber_sayisi" value="<?= (int)DB::setting('ahb_hedef_haber_sayisi',500) ?>" min="10" max="2000" step="10" style="width:130px">
              <small>Her RSS beslemesinden çekilecek maksimum haber. Sayfalama destekli sitelerde otomatik ?paged=2,3... gider.</small>
            </td>
          </tr>
        </table>
      </div>
    </div>

    <div class="panel">
      <div class="ph">🌐 Çeviri API Ayarları</div>
      <div class="pb">
        <table class="form-table">
          <tr>
            <th>DeepL API Key</th>
            <td>
              <input type="password" name="ahb_deepl_api_key" class="regular-text" value="<?= e(DB::setting('ahb_deepl_api_key','')) ?>" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx:fx">
              <small>DeepL Free: API key <code>:fx</code> ile biter. <a href="https://www.deepl.com/tr/pro-api" target="_blank">DeepL API →</a></small>
            </td>
          </tr>
          <tr>
            <th>MyMemory E-posta</th>
            <td>
              <input type="email" name="ahb_mymemory_email" class="regular-text" value="<?= e(DB::setting('ahb_mymemory_email','')) ?>" placeholder="info@siteniz.com">
              <small>E-posta ekleyince günlük limit 5.000 → 50.000 kelimeye çıkar. Ücretsiz.</small>
            </td>
          </tr>
        </table>
      </div>
    </div>

    <div class="panel">
      <div class="ph">⚙ Genel Ayarlar</div>
      <div class="pb">
        <table class="form-table">
          <tr>
            <th>Varsayılan Post Türü</th>
            <td>
              <select name="ahb_varsayilan_post_turu">
                <option value="news" <?= DB::setting('ahb_varsayilan_post_turu','news')==='news'?'selected':'' ?>>Haber</option>
                <option value="post" <?= DB::setting('ahb_varsayilan_post_turu','news')==='post'?'selected':'' ?>>Blog Yazısı</option>
              </select>
            </td>
          </tr>
          <tr>
            <th>Cron Durumu</th>
            <td>
              <strong>Sonraki Çalışma:</strong> <?= ahb_cron_next() ?><br>
              <small>Cron her 5 dakikada çalışır ve zamanı gelen kampanyaları işler.<br>
              cPanel → Cron Jobs → şu komutu ekleyin:<br>
              <code>*/5 * * * * php <?= ROOT ?>/core/cron-worker.php >> /dev/null 2>&amp;1</code></small>
            </td>
          </tr>
        </table>
      </div>
    </div>

    <p><button type="submit" name="ahb_ayar_kaydet" class="button button-primary button-large">💾 Ayarları Kaydet</button></p>
  </form>

  <div class="panel">
    <div class="ph">🧹 Duplicate Temizleme</div>
    <div class="pb">
      <p style="color:#374151">Aynı başlıkta birden fazla haber varsa, en eski kaydı tutarak diğerlerini siler.</p>
      <button class="button" id="dupBtn">🧹 Mükerrer Haberleri Temizle</button>
      <div id="dup-out" style="margin-top:10px"></div>
    </div>
  </div>
</div>
<script>
(function(){
  var C=document.querySelector('meta[name="csrf"]')?.content||'';
  document.getElementById('dupBtn')?.addEventListener('click',function(){
    if(!confirm('Mükerrer haberler kalıcı silinecek. Devam?'))return;
    this.disabled=true;this.textContent='⏳ Taranıyor...';var s=this;
    var out=document.getElementById('dup-out');out.innerHTML='<em>Lütfen bekleyin...</em>';
    fetch('/admin/?page=ai-kampanyalar',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','X-Requested-With':'XMLHttpRequest'},body:new URLSearchParams({action:'duplicate_temizle',_token:C})}).then(r=>r.json()).then(function(r){
      s.disabled=false;s.textContent='🧹 Mükerrer Haberleri Temizle';
      var cl=r.success?'background:#dcfce7;color:#166534':'background:#fee2e2;color:#991b1b';
      out.innerHTML='<div style="padding:10px 16px;border-radius:6px;font-weight:600;'+cl+'">'+(r.message||'Tamamlandı')+'</div>';
    });
  });
})();
</script>
<?php
    });
    return;
}

ap_redirect('/admin/?page=ai-kampanyalar');
