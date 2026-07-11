<?php
/**
 * AnkaraHaber — Video TV Sayfası (YouTube Tarzı Beyaz Tasarım)
 * TV Kanalları (canlı) + Yüklü Videolar bölümleri
 */
defined('ROOT') or die();

$siteName = DB::setting('site_name', 'Haber');
$anaRenk  = DB::setting('ana_renk', '#CC0000');

// Aktif TV Kanalları
$channels    = [];
$channelCats = [];
try {
    $channels = DB::query("SELECT * FROM `{p}video_channels` WHERE active=1 ORDER BY sort_order ASC, name ASC") ?: [];
    foreach ($channels as $ch) {
        $cat = $ch['category'] ?? '';
        if ($cat && !in_array($cat, $channelCats)) $channelCats[] = $cat;
    }
} catch (\Throwable) {}

// Yüklü Videolar
$videos    = [];
$videoCats = [];
try {
    $videos    = DB::query("SELECT * FROM `{p}videos` WHERE published=1 ORDER BY id DESC LIMIT 24") ?: [];
    $vcRaw     = DB::query("SELECT DISTINCT category FROM `{p}videos` WHERE published=1 AND category!='' ORDER BY category ASC") ?: [];
    $videoCats = array_column($vcRaw, 'category');
} catch (\Throwable) {}

Theme::partial('header', ['title' => 'Video TV']);
?>

<style>
/* ── VİDEO TV (YouTube Tarzı Beyaz) ────────── */
.vtv-wrap { background: #f9f9f9; min-height: 70vh; padding-bottom: 48px; }

/* Header bant */
.vtv-hd { background: #fff; border-bottom: 2px solid #e5e5e5; padding: 18px 0; }
.vtv-hd-ic { max-width: 1280px; margin: 0 auto; padding: 0 20px; display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
.vtv-hd-sol { display: flex; align-items: center; gap: 12px; }
.vtv-hd-h1 { font-size: 22px; font-weight: 900; color: #0f0f0f; margin: 0; }
.vtv-hd-p  { font-size: 13px; color: #606060; margin: 2px 0 0; }
.vtv-canli-badge { display: flex; align-items: center; gap: 6px; background: #e94560; color: #fff; font-size: 12px; font-weight: 700; padding: 5px 12px; border-radius: 4px; margin-left: auto; }
.vtv-dot { width: 8px; height: 8px; border-radius: 50%; background: #fff; animation: dot-pulse 1.2s ease infinite; }
@keyframes dot-pulse { 0%,100%{opacity:1}50%{opacity:.3} }

/* Bölüm */
.vtv-sec { max-width: 1280px; margin: 28px auto 0; padding: 0 20px; }
.vtv-sec-hd { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid #e5e5e5; }
.vtv-sec-cizgi { width: 4px; height: 26px; background: <?= e($anaRenk) ?>; border-radius: 2px; }
.vtv-sec-hd h2 { font-size: 18px; font-weight: 900; color: #0f0f0f; margin: 0; flex: 1; }
.vtv-sec-hd span { font-size: 12px; color: #606060; }

/* Filtre butonları */
.vtv-filtreler { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }
.vtv-f-btn { padding: 6px 16px; background: #f0f0f0; border: none; border-radius: 20px; font-size: 13px; font-weight: 600; color: #0f0f0f; cursor: pointer; transition: .15s; }
.vtv-f-btn.on, .vtv-f-btn:hover { background: #0f0f0f; color: #fff; }

/* TV Kanal kartları */
.vtv-kanal-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px,1fr)); gap: 16px; }
.vtv-kk { background: #fff; border-radius: 12px; overflow: hidden; cursor: pointer; border: 2px solid transparent; box-shadow: 0 1px 4px rgba(0,0,0,.08); transition: .2s; }
.vtv-kk:hover { border-color: <?= e($anaRenk) ?>; box-shadow: 0 4px 16px rgba(0,0,0,.12); transform: translateY(-2px); }
.vtv-kk.act  { border-color: <?= e($anaRenk) ?>; box-shadow: 0 0 0 3px <?= e($anaRenk) ?>33; }
.vtv-kk-img  { height: 120px; background: #f0f0f0; display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden; }
.vtv-kk-img img { width: 100%; height: 100%; object-fit: cover; }
.vtv-kk-ikon { font-size: 44px; opacity: .3; }
.vtv-kk-rozet { position: absolute; top: 8px; left: 8px; background: #e94560; color: #fff; font-size: 9px; font-weight: 700; padding: 2px 7px; border-radius: 3px; display: flex; align-items: center; gap: 4px; }
.vtv-kk-overlay { position: absolute; inset: 0; background: rgba(0,0,0,.25); display: flex; align-items: center; justify-content: center; opacity: 0; transition: .2s; }
.vtv-kk:hover .vtv-kk-overlay { opacity: 1; }
.vtv-kk-play { width: 50px; height: 50px; background: <?= e($anaRenk) ?>; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 22px; }
.vtv-kk-info { padding: 10px 12px 12px; }
.vtv-kk-name { font-size: 13px; font-weight: 700; color: #0f0f0f; margin-bottom: 3px; }
.vtv-kk-kat  { font-size: 11px; color: #606060; }

/* Video kartları (YouTube tarzı) */
.vtv-video-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px,1fr)); gap: 20px; }
.vtv-vk { background: #fff; border-radius: 10px; overflow: hidden; cursor: pointer; box-shadow: 0 1px 4px rgba(0,0,0,.07); transition: .18s; }
.vtv-vk:hover { box-shadow: 0 4px 16px rgba(0,0,0,.12); transform: translateY(-2px); }
.vtv-vk-thumb { position: relative; padding-bottom: 56.25%; background: #f0f0f0; overflow: hidden; }
.vtv-vk-thumb img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; transition: .2s; }
.vtv-vk:hover .vtv-vk-thumb img { transform: scale(1.04); }
.vtv-vk-overlay { position: absolute; inset: 0; background: rgba(0,0,0,.2); display: flex; align-items: center; justify-content: center; opacity: 0; transition: .2s; }
.vtv-vk:hover .vtv-vk-overlay { opacity: 1; }
.vtv-vk-play { width: 52px; height: 52px; background: rgba(255,255,255,.9); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 22px; color: <?= e($anaRenk) ?>; }
.vtv-vk-info { padding: 12px 14px 14px; }
.vtv-vk-title { font-size: 14px; font-weight: 700; color: #0f0f0f; line-height: 1.45; margin: 0 0 7px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.vtv-vk-meta  { font-size: 12px; color: #606060; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.vtv-vk-chip  { background: #f0f0f0; color: #374151; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 10px; }

/* Boş durum */
.vtv-bos { text-align: center; padding: 60px 20px; color: #888; }
.vtv-bos-ikon { font-size: 64px; margin-bottom: 16px; opacity: .4; }
.vtv-bos h3 { font-size: 18px; font-weight: 700; color: #0f0f0f; margin: 0 0 8px; }
.vtv-bos p  { font-size: 14px; color: #888; margin: 0; }

/* Modal */
.vtv-modal { display: none; position: fixed; inset: 0; background: rgba(0,0,0,.88); z-index: 9999; align-items: center; justify-content: center; }
.vtv-modal.open { display: flex; }
.vtv-modal-ic { width: 92%; max-width: 960px; }
.vtv-modal-ust { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
.vtv-modal-b { font-size: 18px; font-weight: 800; color: #fff; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.vtv-modal-x { background: rgba(255,255,255,.1); border: none; border-radius: 50%; width: 36px; height: 36px; color: #fff; font-size: 18px; cursor: pointer; transition: .15s; flex-shrink: 0; }
.vtv-modal-x:hover { background: rgba(255,255,255,.2); }
.vtv-player { width: 100%; aspect-ratio: 16/9; background: #000; border-radius: 12px; overflow: hidden; }
.vtv-player iframe { width: 100%; height: 100%; border: none; display: block; }

@media(max-width:768px) {
  .vtv-kanal-grid { grid-template-columns: repeat(2,1fr); }
  .vtv-video-grid { grid-template-columns: repeat(2,1fr); }
}
@media(max-width:480px) {
  .vtv-video-grid { grid-template-columns: 1fr; }
}
</style>

<div class="vtv-wrap">

  <!-- Başlık -->
  <div class="vtv-hd">
    <div class="vtv-hd-ic">
      <div class="vtv-hd-sol">
        <span style="font-size:32px">📺</span>
        <div>
          <div class="vtv-hd-h1">Video TV</div>
          <div class="vtv-hd-p"><?= count($channels) ?> kanal · <?= count($videos) ?> video</div>
        </div>
      </div>
      <?php if (!empty($channels)): ?>
      <div class="vtv-canli-badge"><div class="vtv-dot"></div> CANLI YAYIN</div>
      <?php endif; ?>
    </div>
  </div>

  <!-- TV Kanalları -->
  <div class="vtv-sec">
    <div class="vtv-sec-hd">
      <div class="vtv-sec-cizgi"></div>
      <h2>📡 TV Kanalları</h2>
      <span><?= count($channels) ?> kanal</span>
    </div>

    <?php if (!empty($channelCats)): ?>
    <div class="vtv-filtreler">
      <button class="vtv-f-btn on" onclick="kanalFiltrele('',this)">Tümü</button>
      <?php foreach ($channelCats as $cat): ?>
      <button class="vtv-f-btn" onclick="kanalFiltrele('<?= e(addslashes($cat)) ?>',this)"><?= e($cat) ?></button>
      <?php endforeach; ?>
    </div>
    <?php endif; ?>

    <?php if (empty($channels)): ?>
    <div class="vtv-bos">
      <div class="vtv-bos-ikon">📺</div>
      <h3>Henüz Kanal Eklenmedi</h3>
      <p>Admin panelinden Video TV kanalları ekleyin.</p>
      <?php if (Auth::check()): ?>
      <a href="/admin?page=video-tv" style="display:inline-block;margin-top:16px;background:<?= e($anaRenk) ?>;color:#fff;padding:10px 24px;border-radius:8px;font-weight:700;text-decoration:none">Kanal Ekle</a>
      <?php endif; ?>
    </div>
    <?php else: ?>
    <div class="vtv-kanal-grid" id="vtvKanalGrid">
      <?php foreach ($channels as $ch):
        $embedUrl = '';
        if ($ch['platform'] === 'youtube' && $ch['channel_id']) {
            $embedUrl = $ch['is_live']
                ? 'https://www.youtube.com/embed/live_stream?channel=' . urlencode($ch['channel_id']) . '&autoplay=1'
                : 'https://www.youtube.com/embed?listType=user_uploads&list=' . urlencode($ch['channel_id']) . '&autoplay=1';
        } elseif ($ch['platform'] === 'dailymotion' && $ch['channel_id']) {
            $embedUrl = 'https://www.dailymotion.com/embed/video/' . $ch['channel_id'] . '?autoplay=1';
        } elseif ($ch['stream_url']) {
            $embedUrl = $ch['stream_url'];
        }
      ?>
      <div class="vtv-kk" data-cat="<?= e($ch['category']) ?>"
           data-embed="<?= e($embedUrl) ?>" data-name="<?= e($ch['name']) ?>"
           onclick="kanalAc(this)">
        <div class="vtv-kk-img">
          <?php if ($ch['logo_url']): ?>
          <img src="<?= e($ch['logo_url']) ?>" alt="<?= e($ch['name']) ?>" loading="lazy">
          <?php else: ?>
          <div class="vtv-kk-ikon">📺</div>
          <?php endif; ?>
          <?php if ($ch['is_live']): ?>
          <div class="vtv-kk-rozet"><div class="vtv-dot" style="width:6px;height:6px;margin:0;background:#fff"></div> CANLI</div>
          <?php endif; ?>
          <div class="vtv-kk-overlay"><div class="vtv-kk-play">▶</div></div>
        </div>
        <div class="vtv-kk-info">
          <div class="vtv-kk-name"><?= e($ch['name']) ?></div>
          <?php if ($ch['category']): ?><div class="vtv-kk-kat"><?= e($ch['category']) ?></div><?php endif; ?>
        </div>
      </div>
      <?php endforeach; ?>
    </div>
    <?php endif; ?>
  </div>

  <!-- Videolar -->
  <?php if (!empty($videos)): ?>
  <div class="vtv-sec" style="margin-top:40px">
    <div class="vtv-sec-hd">
      <div class="vtv-sec-cizgi"></div>
      <h2>🎬 Videolar</h2>
      <span><?= count($videos) ?> video</span>
    </div>

    <?php if (!empty($videoCats)): ?>
    <div class="vtv-filtreler">
      <button class="vtv-f-btn on" onclick="videoFiltrele('',this)">Tümü</button>
      <?php foreach ($videoCats as $cat): ?>
      <button class="vtv-f-btn" onclick="videoFiltrele('<?= e(addslashes($cat)) ?>',this)"><?= e($cat) ?></button>
      <?php endforeach; ?>
    </div>
    <?php endif; ?>

    <div class="vtv-video-grid" id="vtvVideoGrid">
      <?php foreach ($videos as $vid):
        $thumb  = $vid['thumbnail'] ?: 'https://img.youtube.com/vi/' . $vid['video_id'] . '/hqdefault.jpg';
        $embed  = $vid['platform'] === 'youtube'
            ? 'https://www.youtube.com/embed/' . $vid['video_id'] . '?autoplay=1'
            : ($vid['platform'] === 'dailymotion'
                ? 'https://www.dailymotion.com/embed/video/' . $vid['video_id'] . '?autoplay=1'
                : $vid['video_id']);
      ?>
      <div class="vtv-vk" data-cat="<?= e($vid['category']) ?>"
           data-embed="<?= e($embed) ?>" data-name="<?= e($vid['title']) ?>"
           onclick="videoAc(this)">
        <div class="vtv-vk-thumb">
          <img src="<?= e($thumb) ?>" alt="<?= e($vid['title']) ?>" loading="lazy">
          <div class="vtv-vk-overlay"><div class="vtv-vk-play">▶</div></div>
        </div>
        <div class="vtv-vk-info">
          <h3 class="vtv-vk-title"><?= e($vid['title']) ?></h3>
          <div class="vtv-vk-meta">
            <?php if ($vid['category']): ?><span class="vtv-vk-chip"><?= e($vid['category']) ?></span><?php endif; ?>
            <span><?= $vid['platform'] === 'youtube' ? '▶ YouTube' : ucfirst((string)($vid['platform'] ?? '')) ?></span>
          </div>
        </div>
      </div>
      <?php endforeach; ?>
    </div>
  </div>
  <?php endif; ?>

</div>

<!-- Modal Player -->
<div class="vtv-modal" id="vtvModal" onclick="if(event.target===this)kapat()">
  <div class="vtv-modal-ic">
    <div class="vtv-modal-ust">
      <div class="vtv-dot" style="flex-shrink:0"></div>
      <div class="vtv-modal-b" id="modalBaslik">—</div>
      <button class="vtv-modal-x" onclick="kapat()">✕</button>
    </div>
    <div class="vtv-player">
      <iframe id="vtvFrame" allow="autoplay;fullscreen;encrypted-media;picture-in-picture" allowfullscreen></iframe>
    </div>
  </div>
</div>

<script>
function kanalAc(el) {
  var embed = el.dataset.embed;
  if (!embed) { alert('Bu kanal için yayın bağlantısı tanımlanmamış.'); return; }
  document.querySelectorAll('.vtv-kk').forEach(k => k.classList.remove('act'));
  el.classList.add('act');
  _playerAc(embed, el.dataset.name);
}
function videoAc(el) {
  var embed = el.dataset.embed;
  if (!embed) return;
  _playerAc(embed, el.dataset.name);
}
function _playerAc(embed, name) {
  document.getElementById('modalBaslik').textContent = name || '—';
  document.getElementById('vtvFrame').src = embed;
  document.getElementById('vtvModal').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function kapat() {
  document.getElementById('vtvFrame').src = '';
  document.getElementById('vtvModal').classList.remove('open');
  document.querySelectorAll('.vtv-kk').forEach(k => k.classList.remove('act'));
  document.body.style.overflow = '';
}
document.addEventListener('keydown', e => { if(e.key==='Escape') kapat(); });

function kanalFiltrele(cat, btn) {
  document.querySelectorAll('.vtv-f-btn').forEach(b => b.classList.remove('on'));
  if(btn) btn.classList.add('on');
  document.querySelectorAll('#vtvKanalGrid .vtv-kk').forEach(k => {
    k.style.display = (!cat || k.dataset.cat === cat) ? '' : 'none';
  });
}
function videoFiltrele(cat, btn) {
  document.querySelectorAll('.vtv-f-btn').forEach(b => b.classList.remove('on'));
  if(btn) btn.classList.add('on');
  document.querySelectorAll('#vtvVideoGrid .vtv-vk').forEach(k => {
    k.style.display = (!cat || k.dataset.cat === cat) ? '' : 'none';
  });
}
</script>

<?php Theme::partial('footer'); ?>
