<?php
/**
 * AhenkPress Admin — Kontrol Paneli
 */
defined('ROOT') or die();
Auth::require('author');

// İstatistikler
try {
    $stats = [
        'posts'    => DB::queryValue("SELECT COUNT(*) FROM `{p}posts` WHERE status='published' AND post_type='post'") ?? 0,
        'news'     => DB::queryValue("SELECT COUNT(*) FROM `{p}posts` WHERE status='published' AND post_type='news'") ?? 0,
        'pages'    => DB::queryValue("SELECT COUNT(*) FROM `{p}posts` WHERE post_type='page'") ?? 0,
        'users'    => DB::queryValue("SELECT COUNT(*) FROM `{p}users` WHERE active=1") ?? 0,
        'views'    => DB::queryValue("SELECT COALESCE(SUM(views),0) FROM `{p}posts`") ?? 0,
        'drafts'   => DB::queryValue("SELECT COUNT(*) FROM `{p}posts` WHERE status='draft'") ?? 0,
        'media'    => DB::queryValue("SELECT COUNT(*) FROM `{p}media`") ?? 0,
        'products' => DB::queryValue("SELECT COUNT(*) FROM `{p}posts` WHERE post_type='product'") ?? 0,
    ];

    $recentPosts = DB::query(
        "SELECT p.id, p.title, p.post_type, p.status, p.views, p.published_at, u.display_name AS author
         FROM `{p}posts` p
         LEFT JOIN `{p}users` u ON u.id = p.author_id
         ORDER BY p.id DESC LIMIT 10"
    );

    $recentAiLogs = [];
    try {
        $recentAiLogs = DB::query("SELECT * FROM `{p}ai_logs` ORDER BY created_at DESC LIMIT 8");
    } catch (\Throwable) {}

} catch (\Throwable $e) {
    $stats = array_fill_keys(['posts','news','pages','users','views','drafts','media','products'], 0);
    $recentPosts = [];
    $recentAiLogs = [];
}

ap_admin_layout('Kontrol Paneli', function() use ($stats, $recentPosts, $recentAiLogs) {
    $siteName = DB::setting('site_name','AhenkPress');
    $siteType = DB::setting('site_type', 'news');
?>
<div class="ap-page-header">
  <div>
    <h1 class="ap-page-title">Merhaba, <?= e(Auth::user()['display_name'] ?? '') ?> 👋</h1>
    <p class="ap-page-desc"><?= e($siteName) ?> — <?= ap_date(date('Y-m-d H:i:s')) ?></p>
  </div>
  <div style="display:flex;gap:8px">
    <a href="/admin?page=post-edit&type=news" class="ap-btn ap-btn-primary">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      Yeni Haber
    </a>
    <a href="/admin?page=post-edit&type=post" class="ap-btn ap-btn-secondary">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      Yeni Yazı
    </a>
  </div>
</div>

<!-- Stats -->
<div class="ap-stats-grid">
  <div class="ap-stat">
    <div class="ap-stat-icon green">📰</div>
    <div class="ap-stat-info">
      <div class="ap-stat-val"><?= number_format($stats['news']) ?></div>
      <div class="ap-stat-label">Yayınlanan Haber</div>
    </div>
  </div>
  <div class="ap-stat">
    <div class="ap-stat-icon blue">✍️</div>
    <div class="ap-stat-info">
      <div class="ap-stat-val"><?= number_format($stats['posts']) ?></div>
      <div class="ap-stat-label">Blog Yazısı</div>
    </div>
  </div>
  <div class="ap-stat">
    <div class="ap-stat-icon orange">👁</div>
    <div class="ap-stat-info">
      <div class="ap-stat-val"><?= number_format($stats['views']) ?></div>
      <div class="ap-stat-label">Toplam Görüntüleme</div>
    </div>
  </div>
  <div class="ap-stat">
    <div class="ap-stat-icon purple">👤</div>
    <div class="ap-stat-info">
      <div class="ap-stat-val"><?= number_format($stats['users']) ?></div>
      <div class="ap-stat-label">Kullanıcı</div>
    </div>
  </div>
  <div class="ap-stat">
    <div class="ap-stat-icon teal">📄</div>
    <div class="ap-stat-info">
      <div class="ap-stat-val"><?= number_format($stats['pages']) ?></div>
      <div class="ap-stat-label">Sayfa</div>
    </div>
  </div>
  <div class="ap-stat">
    <div class="ap-stat-icon red">🛒</div>
    <div class="ap-stat-info">
      <div class="ap-stat-val"><?= number_format($stats['products']) ?></div>
      <div class="ap-stat-label">Ürün</div>
    </div>
  </div>
  <div class="ap-stat">
    <div class="ap-stat-icon blue">🖼</div>
    <div class="ap-stat-info">
      <div class="ap-stat-val"><?= number_format($stats['media']) ?></div>
      <div class="ap-stat-label">Medya Dosyası</div>
    </div>
  </div>
  <div class="ap-stat">
    <div class="ap-stat-icon orange">📝</div>
    <div class="ap-stat-info">
      <div class="ap-stat-val"><?= number_format($stats['drafts']) ?></div>
      <div class="ap-stat-label">Taslak</div>
    </div>
  </div>
</div>

<div class="ap-grid-sidebar">
  <!-- Son İçerikler -->
  <div class="ap-card">
    <div class="ap-card-header">
      <div>
        <div class="ap-card-title">Son İçerikler</div>
        <div class="ap-card-subtitle">En son eklenen yazı ve haberler</div>
      </div>
      <a href="/admin?page=news" class="ap-btn ap-btn-ghost ap-btn-sm">Tümü →</a>
    </div>
    <?php if (empty($recentPosts)): ?>
    <p class="text-muted text-sm">Henüz içerik yok.</p>
    <?php else: ?>
    <div class="ap-table-wrap">
      <table class="ap-table">
        <thead><tr><th>Başlık</th><th>Tür</th><th>Durum</th><th>Görüntüleme</th><th>Tarih</th></tr></thead>
        <tbody>
        <?php foreach ($recentPosts as $p): ?>
        <tr>
          <td><a href="/admin?page=post-edit&id=<?= $p['id'] ?>"><?= e(mb_substr($p['title'],0,60)) ?></a></td>
          <td><span class="ap-badge ap-badge-blue"><?= e($p['post_type']) ?></span></td>
          <td>
            <?php
            $bmap = ['published'=>'ap-badge-green','draft'=>'ap-badge-gray','pending'=>'ap-badge-orange','archived'=>'ap-badge-red'];
            $lmap = ['published'=>'Yayında','draft'=>'Taslak','pending'=>'Bekliyor','archived'=>'Arşiv'];
            ?>
            <span class="ap-badge <?= $bmap[$p['status']] ?? 'ap-badge-gray' ?>"><?= $lmap[$p['status']] ?? $p['status'] ?></span>
          </td>
          <td><?= number_format($p['views']) ?></td>
          <td class="text-muted text-xs"><?= $p['published_at'] ? ap_date($p['published_at'], 'd M') : '—' ?></td>
        </tr>
        <?php endforeach; ?>
        </tbody>
      </table>
    </div>
    <?php endif; ?>
  </div>

  <!-- Sağ Panel -->
  <div class="ap-side-panel">
    <!-- Hızlı Eylemler -->
    <div class="ap-card">
      <div class="ap-card-header"><div class="ap-card-title">Hızlı Eylemler</div></div>
      <div style="display:flex;flex-direction:column;gap:6px">
        <a href="/admin?page=post-edit&type=news" class="ap-btn ap-btn-secondary ap-btn-sm" style="justify-content:flex-start">📰 Yeni Haber Ekle</a>
        <a href="/admin?page=post-edit&type=post" class="ap-btn ap-btn-secondary ap-btn-sm" style="justify-content:flex-start">✍️ Blog Yazısı Ekle</a>
        <a href="/admin?page=post-edit&type=page" class="ap-btn ap-btn-secondary ap-btn-sm" style="justify-content:flex-start">📄 Sayfa Oluştur</a>
        <a href="/admin?page=media" class="ap-btn ap-btn-secondary ap-btn-sm" style="justify-content:flex-start">🖼 Medya Yükle</a>
        <?php if (Module::isLoaded('ai-robot')): ?>
        <a href="/admin?page=ai-robot" class="ap-btn ap-btn-secondary ap-btn-sm" style="justify-content:flex-start">🤖 AI Robot</a>
        <?php endif; ?>
      </div>
    </div>

    <!-- AI Log -->
    <?php if (!empty($recentAiLogs)): ?>
    <div class="ap-card">
      <div class="ap-card-header">
        <div class="ap-card-title">🤖 AI Robot Logu</div>
        <a href="/admin?page=ai-robot" class="ap-btn ap-btn-ghost ap-btn-sm">Detay</a>
      </div>
      <div class="ap-log" style="max-height:200px">
        <?php foreach ($recentAiLogs as $log): ?>
        <div class="ap-log-line <?= e($log['type'] ?? 'info') ?>">
          <span class="ap-log-time"><?= substr($log['created_at'] ?? '', 11, 5) ?></span>
          <?= e(mb_substr($log['message'], 0, 80)) ?>
        </div>
        <?php endforeach; ?>
      </div>
    </div>
    <?php endif; ?>

    <!-- Sistem Bilgisi -->
    <div class="ap-card">
      <div class="ap-card-header"><div class="ap-card-title">Sistem</div></div>
      <div style="font-size:12px;display:flex;flex-direction:column;gap:6px;color:var(--ap-text-muted)">
        <div class="d-flex justify-between"><span>AhenkPress</span><span style="color:var(--ap-text)">v<?= AP_VERSION ?></span></div>
        <div class="d-flex justify-between"><span>PHP</span><span style="color:var(--ap-text)"><?= PHP_VERSION ?></span></div>
        <div class="d-flex justify-between"><span>Tema</span><span style="color:var(--ap-text)"><?= e(ap_active_theme()) ?></span></div>
        <div class="d-flex justify-between"><span>Site Tipi</span><span style="color:var(--ap-text)"><?= e(DB::setting('site_type','news')) ?></span></div>
        <div class="d-flex justify-between"><span>Modüller</span><span style="color:var(--ap-text)"><?= count(Module::loaded()) ?> aktif</span></div>
      </div>
    </div>
  </div>
</div>
<?php
});
