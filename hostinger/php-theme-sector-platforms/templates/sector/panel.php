<?php
/* sector 2026-10-10: /sektor/panel — editör paneli (başvuru onayı, talepler, rehber kayıtları) */
declare(strict_types=1);

use Yenisafak\Html;
use Yenisafak\Sector;

/** @var string $email */
/** @var string $msg */
/** @var string $csrf */
/** @var list<array<string, mixed>> $members */
/** @var list<array<string, mixed>> $requests */
/** @var list<array<string, mixed>> $dir */
$mst = ['pending' => 'Bekliyor', 'approved' => 'Onaylı', 'rejected' => 'Reddedildi'];
$rst = ['new' => 'Yeni', 'forwarded' => 'İletildi', 'answered' => 'Yanıtlandı', 'closed' => 'Kapalı'];
$provinces = Sector::provinces();
?>
<section class="yn-phero"><div class="yn-wrap">
  <p class="yn-eyebrow"><span class="yn-dot"></span>Sektör paneli</p>
  <h1 class="yn-page-h">Editör <em>paneli</em></h1>
<?php if ($msg !== ''): ?><p class="yn-form-msg ok" role="status"><?= Html::e($msg) ?></p><?php endif; ?>
<?php if ($email === ''): ?>
  <form class="yn-form sc-login" method="post" action="/sektor/panel" autocomplete="on">
    <input type="hidden" name="act" value="login">
    <div class="yn-f"><label for="pl">E-posta</label><input id="pl" type="text" name="login" autocomplete="username" required></div>
    <div class="yn-f"><label for="pp">Parola</label><input id="pp" type="password" name="password" autocomplete="current-password" required></div>
    <button class="yn-btn yn-btn-hot" type="submit">Giriş</button>
    <p class="yn-note">Haber ve yazı yönetimi için <a href="/editor">Editör Girişi</a>'ni kullan. Bu panel yalnızca üyelik başvurularını, talepleri ve rehber kayıtlarını yönetir.</p>
  </form>
<?php else: ?>
  <div class="yn-page-p"><?= Html::e($email) ?> · <a href="/editor">Haber editörü</a>
    <form method="post" action="/sektor/panel" style="display:inline"><input type="hidden" name="act" value="logout"><input type="hidden" name="csrf" value="<?= Html::e($csrf) ?>"><button class="yn-btn yn-btn-ghost" type="submit">Çıkış</button></form></div>
</div></section>
<div class="yn-wrap sc-panel">
  <details class="sc-helpbox"><summary><b>Kullanım Rehberi / Yardım</b> (panel nasıl kullanılır?)</summary><?php require __DIR__ . '/_help_editor.php'; ?></details>
  <h2 class="yn-h2">Üyelik / rehber başvuruları <small>(<?= count(array_filter($members, static fn ($m) => $m['status'] === 'pending')) ?> bekliyor)</small></h2>
  <div class="sc-table-wrap"><table class="sc-table">
    <thead><tr><th>Tarih</th><th>Rol</th><th>Ad / Kurum</th><th>İletişim</th><th>Konum</th><th>Not</th><th>Durum</th><th></th></tr></thead><tbody>
<?php foreach ($members as $m): ?>
    <tr><td><?= Html::e(Html::when((string) $m['created_at'])) ?></td><td><?= Html::e((string) $m['role']) ?></td>
      <td><b><?= Html::e((string) $m['full_name']) ?></b><br><?= Html::e((string) ($m['org'] ?? '')) ?></td>
      <td><?= Html::e((string) $m['email']) ?><br><?= Html::e((string) ($m['phone'] ?? '')) ?></td>
      <td><?= Html::e(trim(Sector::tr((string) ($m['mahalle'] ?? '')) . ' ' . Sector::tr((string) ($m['ilce'] ?? '')) . ' ' . Sector::tr((string) ($m['il'] ?? '')))) ?></td>
      <td><?= Html::e(mb_strimwidth((string) ($m['note'] ?? ''), 0, 120, '…')) ?></td>
      <td><span class="sc-status sc-st-<?= Html::e((string) $m['status']) ?>"><?= Html::e($mst[(string) $m['status']] ?? (string) $m['status']) ?></span></td>
      <td class="sc-act"><?php if ($m['status'] === 'pending'): ?>
        <form method="post" action="/sektor/panel"><input type="hidden" name="csrf" value="<?= Html::e($csrf) ?>"><input type="hidden" name="id" value="<?= (int) $m['id'] ?>"><button class="yn-btn yn-btn-hot" name="act" value="member_approve">Onayla</button> <button class="yn-btn yn-btn-ghost" name="act" value="member_reject">Reddet</button></form>
      <?php endif; ?></td></tr>
<?php endforeach; ?>
<?php if ($members === []): ?><tr><td colspan="8">Başvuru yok.</td></tr><?php endif; ?>
    </tbody></table></div>

  <h2 class="yn-h2">Talepler <small>(<?= count(array_filter($requests, static fn ($m) => $m['status'] === 'new')) ?> yeni)</small></h2>
  <div class="sc-table-wrap"><table class="sc-table">
    <thead><tr><th>Kod / Tarih</th><th>Tür</th><th>Gönderen</th><th>Konum</th><th>Konu ve mesaj</th><th>Durum</th></tr></thead><tbody>
<?php foreach ($requests as $r): ?>
    <tr><td><b><?= Html::e((string) $r['ref']) ?></b><br><?= Html::e(Html::when((string) $r['created_at'])) ?></td><td><?= Html::e((string) $r['kind']) ?></td>
      <td><?= Html::e((string) $r['full_name']) ?><br><?= Html::e((string) $r['email']) ?><br><?= Html::e((string) ($r['phone'] ?? '')) ?></td>
      <td><?= Html::e(trim(Sector::tr((string) ($r['mahalle'] ?? '')) . ' ' . Sector::tr((string) ($r['ilce'] ?? '')) . ' ' . Sector::tr((string) ($r['il'] ?? '')))) ?></td>
      <td><b><?= Html::e((string) $r['subject']) ?></b><br><?= nl2br(Html::e((string) $r['message'])) ?></td>
      <td><form method="post" action="/sektor/panel" class="sc-statusform"><input type="hidden" name="csrf" value="<?= Html::e($csrf) ?>"><input type="hidden" name="act" value="req_status"><input type="hidden" name="id" value="<?= (int) $r['id'] ?>">
        <select name="status"><?php foreach ($rst as $k => $v): ?><option value="<?= $k ?>"<?= $r['status'] === $k ? ' selected' : '' ?>><?= $v ?></option><?php endforeach; ?></select>
        <input type="text" name="note" maxlength="400" placeholder="Takip sayfasında görünecek not" value="<?= Html::e((string) ($r['public_note'] ?? '')) ?>"><button class="yn-btn yn-btn-ghost" type="submit">Kaydet</button></form></td></tr>
<?php endforeach; ?>
<?php if ($requests === []): ?><tr><td colspan="6">Talep yok.</td></tr><?php endif; ?>
    </tbody></table></div>

  <h2 class="yn-h2">Yayın: haber / duyuru yayımla</h2>
  <form class="yn-form sc-form" method="post" action="/sektor/panel">
    <input type="hidden" name="csrf" value="<?= Html::e($csrf) ?>"><input type="hidden" name="act" value="news_publish">
    <div class="yn-f"><label>Bölüm</label><select name="section"><?php foreach (Sector::sections() as $sc): ?><option value="<?= Html::e((string) $sc['slug']) ?>"><?= Html::e((string) $sc['name']) ?></option><?php endforeach; ?></select></div>
    <div class="yn-f"><label>Gönderen / kaynak (ops.)</label><input type="text" name="source" maxlength="120"></div>
    <div class="yn-f yn-f-wide"><label>Başlık</label><input type="text" name="title" maxlength="160" required></div>
    <div class="yn-f yn-f-wide"><label>Kısa özet (ops.)</label><input type="text" name="spot" maxlength="300"></div>
    <div class="yn-f yn-f-wide"><label>Metin (paragrafları boş satırla ayır)</label><textarea name="body" rows="8" required></textarea></div>
    <div class="yn-form-foot"><button class="yn-btn yn-btn-hot" type="submit">Yayımla</button></div>
  </form>

  <h2 class="yn-h2">Rehber kayıtları</h2>
  <form method="get" action="/sektor/panel" class="sc-filter"><label for="pq">Kayıt ara</label><input id="pq" type="search" name="pq" value="<?= Html::e((string) ($pq ?? '')) ?>" maxlength="60" placeholder="ad veya mahalle"><button class="yn-btn yn-btn-ghost" type="submit">Ara</button></form>
  <p class="yn-note">Arama yapmazsan yalnız bekleyen / gizli / elle eklenen kayıtlar listelenir.</p>
  <div class="sc-table-wrap"><table class="sc-table">
    <thead><tr><th>Tür</th><th>Ad</th><th>İl</th><th>Durum</th><th></th></tr></thead><tbody>
<?php foreach ($dir as $d): ?>
    <tr><td><?= Html::e((string) $d['kind']) ?></td><td><?= Html::e((string) $d['name']) ?></td><td><?= Html::e(Sector::tr((string) ($d['il'] ?? ''))) ?></td><td><?= Html::e((string) $d['status']) ?></td>
      <td><form method="post" action="/sektor/panel"><input type="hidden" name="csrf" value="<?= Html::e($csrf) ?>"><input type="hidden" name="id" value="<?= (int) $d['id'] ?>">
        <?php if ($d['status'] === 'approved'): ?><button class="yn-btn yn-btn-ghost" name="act" value="dir_hide">Gizle</button><?php else: ?><button class="yn-btn yn-btn-hot" name="act" value="dir_show">Yayınla</button><?php endif; ?></form>
        <details><summary>Tanıtım sayfasını düzenle</summary>
          <form class="yn-form sc-form" method="post" action="/sektor/panel"><input type="hidden" name="csrf" value="<?= Html::e($csrf) ?>"><input type="hidden" name="act" value="dir_edit"><input type="hidden" name="id" value="<?= (int) $d['id'] ?>">
            <div class="yn-f yn-f-wide"><label>Kısa açıklama</label><input type="text" name="summary" maxlength="300" value="<?= Html::e((string) ($d['summary'] ?? '')) ?>"></div>
            <div class="yn-f yn-f-wide"><label>Tanıtım metni</label><textarea name="about" rows="5" maxlength="2000"><?= Html::e((string) ($d['about'] ?? '')) ?></textarea></div>
            <div class="yn-f"><label>Web</label><input type="text" name="web" maxlength="200" value="<?= Html::e((string) ($d['web'] ?? '')) ?>"></div>
            <div class="yn-f"><label>Telefon (boşsa değişmez)</label><input type="text" name="contact" maxlength="20" placeholder="0xxx xxx xx xx"></div>
            <div class="yn-form-foot"><button class="yn-btn yn-btn-hot" type="submit">Kaydet</button></div></form></details></td></tr>
<?php endforeach; ?>
    </tbody></table></div>

  <h3 class="yn-h2">Rehbere kayıt ekle</h3>
  <form class="yn-form sc-form" method="post" action="/sektor/panel">
    <input type="hidden" name="csrf" value="<?= Html::e($csrf) ?>"><input type="hidden" name="act" value="dir_add">
    <div class="yn-f"><label>Tür</label><select name="kind"><?php foreach (Sector::$def['kinds'] as $k): ?><option value="<?= Html::e((string) $k['key']) ?>"><?= Html::e((string) $k['one']) ?></option><?php endforeach; ?></select></div>
    <div class="yn-f"><label>Ad</label><input type="text" name="name" maxlength="160" required></div>
    <div class="yn-f yn-f-wide"><label>Kısa açıklama</label><input type="text" name="summary" maxlength="300"></div>
    <div class="yn-f"><label>Web</label><input type="text" name="web" maxlength="200" placeholder="https://"></div>
    <div class="yn-f-wide"><?php $geoMah = true; $geoReq = false; $geoIds = [0, 0, 0]; require __DIR__ . '/_geo.php'; ?></div>
    <div class="yn-form-foot"><button class="yn-btn yn-btn-hot" type="submit">Ekle</button></div>
  </form>
<?php endif; ?>
<?php if ($email === ''): ?></div></section><?php else: ?></div><?php endif; ?>
