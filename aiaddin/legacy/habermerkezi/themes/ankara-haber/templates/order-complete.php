<?php
defined('ROOT') or die();
$oid    = (int)($_GET['oid']    ?? 0);
$method = $_GET['method'] ?? '';
$order  = $oid ? DB::queryRow("SELECT * FROM `{p}orders` WHERE id=?", [$oid]) : null;
if (!$order) { header('Location: /'); exit; }

Theme::partial('header');
$havaleBank = DB::setting('havale_bank_name','');
$havaleIBAN = DB::setting('havale_iban','');
$havaleAcct = DB::setting('havale_account_name','');
$havaleNote = DB::setting('havale_instructions','Havale/EFT yaparken açıklama kısmına sipariş numaranızı yazınız.');
?>
<main class="container" style="max-width:700px;margin:0 auto;padding:40px 12px;text-align:center">
  <div style="background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:40px">
    <div style="font-size:64px;margin-bottom:16px">✅</div>
    <h1 style="font-size:26px;font-weight:900;color:#111;margin-bottom:8px">Siparişiniz Alındı!</h1>
    <p style="color:#6b7280;font-size:15px;margin-bottom:24px">
      Sipariş numaranız: <strong style="color:#111"><?= e($order['order_number']) ?></strong><br>
      <?= e($order['buyer_email']) ?> adresine onay e-postası gönderilecektir.
    </p>

    <?php if ($order['payment_method'] === 'havale'): ?>
    <div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:10px;padding:20px;text-align:left;margin-bottom:24px">
      <div style="font-weight:800;font-size:16px;margin-bottom:12px;color:#92400e">🏦 Havale Bilgileri</div>
      <?php if ($havaleBank): ?><div style="font-size:14px;margin-bottom:4px"><strong>Banka:</strong> <?= e($havaleBank) ?></div><?php endif; ?>
      <?php if ($havaleAcct): ?><div style="font-size:14px;margin-bottom:4px"><strong>Hesap Adı:</strong> <?= e($havaleAcct) ?></div><?php endif; ?>
      <?php if ($havaleIBAN): ?><div style="font-size:14px;margin-bottom:8px"><strong>IBAN:</strong> <code><?= e($havaleIBAN) ?></code></div><?php endif; ?>
      <div style="font-size:14px;font-weight:600;color:#92400e">Açıklama: <?= e($order['order_number']) ?></div>
      <p style="font-size:13px;color:#78350f;margin-top:8px"><?= e($havaleNote) ?></p>
    </div>
    <?php elseif ($order['payment_method'] === 'kapida_odeme'): ?>
    <div style="background:#ecfdf5;border:1px solid #6ee7b7;border-radius:10px;padding:16px;margin-bottom:24px;text-align:left">
      <div style="font-weight:800;font-size:15px;color:#064e3b;margin-bottom:6px">🚪 Kapıda Ödeme</div>
      <p style="font-size:14px;color:#065f46">Siparişiniz kargoya verildiğinde bilgilendirileceksiniz. Kargo geldiğinde <?= number_format($order['total'],2) ?> ₺ tutarı ödeyebilirsiniz.</p>
    </div>
    <?php elseif ($order['payment_method'] === 'stripe'): ?>
    <div style="background:#eff6ff;border:1px solid #93c5fd;border-radius:10px;padding:16px;margin-bottom:24px;text-align:left">
      <div style="font-weight:800;font-size:15px;color:#1e3a8a;margin-bottom:6px">💳 Ödeme Alındı</div>
      <p style="font-size:14px;color:#1d4ed8">Kredi kartı ödemesi başarıyla alındı. Siparişiniz işleme alındı.</p>
    </div>
    <?php endif; ?>

    <a href="/magaza" style="display:inline-block;padding:12px 28px;background:#CC0000;color:#fff;border-radius:8px;font-weight:700;text-decoration:none;font-size:15px">
      Alışverişe Devam Et →
    </a>
    <a href="/" style="display:block;margin-top:12px;color:#6b7280;font-size:13px;text-decoration:none">Ana Sayfaya Dön</a>
  </div>
</main>
<?php Theme::partial('footer'); ?>
