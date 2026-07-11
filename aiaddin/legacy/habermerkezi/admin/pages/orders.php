<?php
defined('ROOT') or die();
Auth::require('editor');

$csrf   = Security::csrf();
$action = $_POST['action'] ?? '';

if ($action === 'update_status' && Security::verifyCsrf($_POST['csrf'] ?? '')) {
    $id     = (int)$_POST['order_id'];
    $status = in_array($_POST['status'], ['pending','processing','shipped','completed','cancelled','refunded']) ? $_POST['status'] : 'pending';
    DB::execute("UPDATE `{p}orders` SET status=?,updated_at=NOW() WHERE id=?", [$status, $id]);
    ap_flash('Sipariş durumu güncellendi.');
    header('Location: /admin/?page=orders');
    exit;
}

$statusFilter = $_GET['status'] ?? '';
$search       = trim($_GET['q'] ?? '');
$page         = max(1, (int)($_GET['p'] ?? 1));
$perPage      = 20;
$offset       = ($page - 1) * $perPage;

$where  = '1=1';
$params = [];
if ($statusFilter) { $where .= ' AND status=?'; $params[] = $statusFilter; }
if ($search)       { $where .= ' AND (order_number LIKE ? OR buyer_name LIKE ? OR buyer_email LIKE ?)'; $params = array_merge($params, ["%$search%","%$search%","%$search%"]); }

$total  = (int)DB::queryValue("SELECT COUNT(*) FROM `{p}orders` WHERE $where", $params);
$orders = DB::query("SELECT * FROM `{p}orders` WHERE $where ORDER BY created_at DESC LIMIT $perPage OFFSET $offset", $params);

$statusColors = ['pending'=>'#e3b341','processing'=>'#388bfd','shipped'=>'#79c0ff','completed'=>'#56d364','cancelled'=>'#f85149','refunded'=>'#b0b8c1'];
$statusLabels = ['pending'=>'Bekliyor','processing'=>'Hazırlanıyor','shipped'=>'Kargoda','completed'=>'Tamamlandı','cancelled'=>'İptal','refunded'=>'İade'];

$viewId    = (int)($_GET['view'] ?? 0);
$viewOrder = $viewId ? DB::queryRow("SELECT * FROM `{p}orders` WHERE id=?", [$viewId]) : null;
$viewItems = $viewId ? DB::query("SELECT * FROM `{p}order_items` WHERE order_id=?", [$viewId]) : [];

ap_admin_layout('Siparişler', function() use ($orders,$total,$page,$perPage,$statusFilter,$search,$csrf,$statusColors,$statusLabels,$viewOrder,$viewItems) { ?>
<div class="ap-page-header">
  <h1 class="ap-page-title">Siparişler <span class="ap-badge" style="font-size:13px"><?= $total ?></span></h1>
</div>

<!-- Filtreler -->
<form method="GET" style="display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap">
  <input type="hidden" name="page" value="orders">
  <input class="ap-input" name="q" value="<?= e($search) ?>" placeholder="Sipariş no veya müşteri..." style="max-width:260px">
  <select class="ap-input" name="status" style="max-width:180px" onchange="this.form.submit()">
    <option value="">Tüm Durumlar</option>
    <?php foreach ($statusLabels as $k=>$v): ?>
    <option value="<?= $k ?>" <?= $statusFilter===$k?'selected':'' ?>><?= $v ?></option>
    <?php endforeach; ?>
  </select>
  <button class="ap-btn ap-btn-primary" type="submit">Filtrele</button>
</form>

<?php if ($viewOrder): ?>
<!-- Sipariş Detay -->
<div class="ap-card" style="padding:24px;margin-bottom:20px">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
    <div>
      <h2 style="font-size:18px;margin-bottom:4px">Sipariş: <?= e($viewOrder['order_number']) ?></h2>
      <div class="text-muted" style="font-size:13px"><?= date('d.m.Y H:i', strtotime($viewOrder['created_at'])) ?></div>
    </div>
    <div style="display:flex;gap:8px;align-items:center">
      <span style="background:<?= $statusColors[$viewOrder['status']] ?>22;color:<?= $statusColors[$viewOrder['status']] ?>;padding:4px 12px;border-radius:20px;font-size:13px;font-weight:600">
        <?= $statusLabels[$viewOrder['status']] ?>
      </span>
      <a href="/admin/?page=orders" class="ap-btn">← Geri</a>
    </div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px">
    <div><strong>Müşteri Bilgileri</strong><br>
      <?= e($viewOrder['buyer_name']) ?><br>
      <a href="mailto:<?= e($viewOrder['buyer_email']) ?>"><?= e($viewOrder['buyer_email']) ?></a><br>
      <?= e($viewOrder['buyer_phone']) ?>
    </div>
    <div><strong>Teslimat Adresi</strong><br>
      <div style="white-space:pre-wrap;font-size:13px"><?= e($viewOrder['buyer_address']) ?></div>
    </div>
    <div><strong>Ödeme Yöntemi</strong><br>
      <?= Payment::icon($viewOrder['payment_method']) ?> <?= Payment::label($viewOrder['payment_method']) ?>
    </div>
    <div><strong>Durum Güncelle</strong><br>
      <form method="POST" style="display:flex;gap:8px;margin-top:6px">
        <input type="hidden" name="action" value="update_status">
        <input type="hidden" name="order_id" value="<?= $viewOrder['id'] ?>">
        <input type="hidden" name="csrf" value="<?= e($csrf) ?>">
        <select class="ap-input" name="status" style="flex:1">
          <?php foreach ($statusLabels as $k=>$v): ?>
          <option value="<?= $k ?>" <?= $viewOrder['status']===$k?'selected':'' ?>><?= $v ?></option>
          <?php endforeach; ?>
        </select>
        <button class="ap-btn ap-btn-primary">Kaydet</button>
      </form>
    </div>
  </div>
  <table class="ap-table" style="margin:0">
    <thead><tr><th>Ürün</th><th>Fiyat</th><th>Adet</th><th>Toplam</th></tr></thead>
    <tbody>
      <?php foreach ($viewItems as $item): ?>
      <tr>
        <td><?= e($item['title']) ?></td>
        <td><?= number_format($item['price'],2) ?> ₺</td>
        <td><?= $item['qty'] ?></td>
        <td><strong><?= number_format($item['subtotal'],2) ?> ₺</strong></td>
      </tr>
      <?php endforeach; ?>
      <tr style="font-weight:700;border-top:2px solid var(--ap-border)">
        <td colspan="3" style="text-align:right">Genel Toplam:</td>
        <td><?= number_format($viewOrder['total'],2) ?> ₺</td>
      </tr>
    </tbody>
  </table>
  <?php if ($viewOrder['notes']): ?>
  <div style="margin-top:16px;padding:12px;background:var(--ap-bg);border-radius:6px;font-size:13px">
    <strong>Not:</strong> <?= e($viewOrder['notes']) ?>
  </div>
  <?php endif; ?>
</div>
<?php endif; ?>

<div class="ap-card" style="padding:0;overflow:hidden">
  <table class="ap-table" style="margin:0">
    <thead><tr><th>Sipariş No</th><th>Müşteri</th><th>Ödeme</th><th>Toplam</th><th>Durum</th><th>Tarih</th><th>İşlem</th></tr></thead>
    <tbody>
      <?php foreach ($orders as $o): ?>
      <tr>
        <td><strong><?= e($o['order_number']) ?></strong></td>
        <td><?= e($o['buyer_name']) ?><br><small class="text-muted"><?= e($o['buyer_email']) ?></small></td>
        <td><?= Payment::icon($o['payment_method']) ?> <?= Payment::label($o['payment_method']) ?></td>
        <td><strong><?= number_format($o['total'],2) ?> ₺</strong></td>
        <td>
          <span style="background:<?= $statusColors[$o['status']] ?>22;color:<?= $statusColors[$o['status']] ?>;padding:3px 10px;border-radius:12px;font-size:12px;font-weight:600">
            <?= $statusLabels[$o['status']] ?>
          </span>
        </td>
        <td style="font-size:12px"><?= date('d.m.Y H:i', strtotime($o['created_at'])) ?></td>
        <td><a href="/admin/?page=orders&view=<?= $o['id'] ?>" class="ap-btn ap-btn-sm">Detay</a></td>
      </tr>
      <?php endforeach; ?>
      <?php if (empty($orders)): ?>
      <tr><td colspan="7" style="text-align:center;padding:40px;color:var(--ap-text-muted)">Henüz sipariş yok</td></tr>
      <?php endif; ?>
    </tbody>
  </table>
</div>

<?php if ($total > $perPage):
  $pages = ceil($total/$perPage); ?>
<div style="display:flex;gap:6px;justify-content:center;margin-top:16px">
  <?php for($i=1;$i<=$pages;$i++): ?>
  <a href="?page=orders&p=<?=$i?>&status=<?=e($statusFilter)?>&q=<?=e($search)?>" class="ap-btn ap-btn-sm <?=$i===$page?'ap-btn-primary':''?>"><?=$i?></a>
  <?php endfor; ?>
</div>
<?php endif; ?>
<?php });
