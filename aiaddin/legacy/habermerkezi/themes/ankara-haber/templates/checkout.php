<?php
defined('ROOT') or die();
Cart::init();
$items   = Cart::items();
$total   = Cart::total();
if (empty($items)) { header('Location: /sepet'); exit; }

$methods = Payment::enabled();
$error   = '';
$stripePublicKey = Payment::stripePublicKey();

// Sipariş gönder
if ($_SERVER['REQUEST_METHOD'] === 'POST' && !empty($_POST['order_submit'])) {
    $method = $_POST['payment_method'] ?? '';
    $buyer  = [
        'name'    => trim($_POST['name']    ?? ''),
        'email'   => trim($_POST['email']   ?? ''),
        'phone'   => trim($_POST['phone']   ?? ''),
        'address' => trim($_POST['address'] ?? ''),
        'notes'   => trim($_POST['notes']   ?? ''),
    ];
    if (!$buyer['name'] || !$buyer['email'] || !$buyer['address']) {
        $error = 'Lütfen zorunlu alanları doldurun.';
    } elseif (!in_array($method, $methods)) {
        $error = 'Geçerli ödeme yöntemi seçin.';
    } else {
        // Kapıda ödeme ücreti
        if ($method === 'kapida_odeme') {
            $fee = (float)DB::setting('kapida_odeme_fee','0');
            if ($fee > 0) {
                $items['kapida_odeme_fee'] = ['id'=>0,'title'=>'Kapıda Ödeme Ücreti','price'=>$fee,'image'=>'','qty'=>1,'meta'=>[]];
            }
        }
        $result = Payment::createOrder($items, $buyer, $method);
        if ($result['ok']) {
            if ($method === 'stripe') {
                // Stripe için payment intent oluştur
                $_SESSION['pending_order'] = $result;
                $intent = Payment::stripeCreateIntent($result['total'], DB::setting('currency','TRY'));
                if ($intent['ok']) {
                    $_SESSION['stripe_client_secret'] = $intent['client_secret'];
                    header('Location: /odeme/stripe');
                    Cart::clear(); exit;
                } else {
                    $error = 'Stripe hatası: ' . $intent['msg'];
                }
            } else {
                Cart::clear();
                header('Location: /odeme/tamamlandi?oid=' . $result['order_id'] . '&method=' . $method);
                exit;
            }
        } else {
            $error = $result['msg'];
        }
    }
}

Theme::partial('header');
?>
<main class="container" style="max-width:1000px;margin:0 auto;padding:20px 12px">
  <h1 style="font-size:24px;font-weight:900;margin-bottom:20px;color:#111">Sipariş Tamamla</h1>
  <?php if ($error): ?><div style="background:#fee2e2;border:1px solid #fca5a5;color:#dc2626;padding:12px 16px;border-radius:8px;margin-bottom:16px"><?= e($error) ?></div><?php endif; ?>

  <form method="POST">
  <input type="hidden" name="order_submit" value="1">
  <div style="display:grid;grid-template-columns:1fr 340px;gap:20px;align-items:start">
    <!-- Sol: Bilgiler -->
    <div>
      <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;margin-bottom:16px">
        <h3 style="font-size:16px;font-weight:800;margin-bottom:16px;color:#111">📦 Teslimat Bilgileri</h3>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div><label style="display:block;font-size:12px;font-weight:600;color:#6b7280;margin-bottom:4px">Ad Soyad *</label>
            <input name="name" required value="<?= e($_POST['name']??'') ?>" style="width:100%;padding:9px 12px;border:1px solid #d1d5db;border-radius:6px;font-size:14px"></div>
          <div><label style="display:block;font-size:12px;font-weight:600;color:#6b7280;margin-bottom:4px">E-posta *</label>
            <input name="email" type="email" required value="<?= e($_POST['email']??'') ?>" style="width:100%;padding:9px 12px;border:1px solid #d1d5db;border-radius:6px;font-size:14px"></div>
          <div><label style="display:block;font-size:12px;font-weight:600;color:#6b7280;margin-bottom:4px">Telefon</label>
            <input name="phone" value="<?= e($_POST['phone']??'') ?>" style="width:100%;padding:9px 12px;border:1px solid #d1d5db;border-radius:6px;font-size:14px"></div>
        </div>
        <div style="margin-top:12px"><label style="display:block;font-size:12px;font-weight:600;color:#6b7280;margin-bottom:4px">Teslimat Adresi *</label>
          <textarea name="address" required rows="3" style="width:100%;padding:9px 12px;border:1px solid #d1d5db;border-radius:6px;font-size:14px"><?= e($_POST['address']??'') ?></textarea></div>
        <div style="margin-top:12px"><label style="display:block;font-size:12px;font-weight:600;color:#6b7280;margin-bottom:4px">Sipariş Notu</label>
          <textarea name="notes" rows="2" style="width:100%;padding:9px 12px;border:1px solid #d1d5db;border-radius:6px;font-size:14px"><?= e($_POST['notes']??'') ?></textarea></div>
      </div>

      <!-- Ödeme Yöntemi -->
      <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:24px">
        <h3 style="font-size:16px;font-weight:800;margin-bottom:16px;color:#111">💳 Ödeme Yöntemi</h3>
        <?php foreach ($methods as $m): ?>
        <label style="display:flex;align-items:flex-start;gap:12px;padding:14px;border:2px solid #e5e7eb;border-radius:8px;margin-bottom:10px;cursor:pointer;transition:border .2s"
               onclick="this.style.borderColor='#CC0000';document.querySelectorAll('.pm-radio').forEach(r=>r!==this.querySelector('input')&&(r.closest('label').style.borderColor='#e5e7eb'))">
          <input class="pm-radio" type="radio" name="payment_method" value="<?= $m ?>" <?= (($_POST['payment_method']??'') === $m || (count($methods)===1)) ? 'checked' : '' ?> style="margin-top:2px">
          <div>
            <div style="font-weight:700;font-size:15px;color:#111"><?= Payment::icon($m) ?> <?= Payment::label($m) ?></div>
            <?php if ($m==='havale'):
              $iban = DB::setting('havale_iban','');
              $bank = DB::setting('havale_bank_name','');
              if ($iban||$bank): ?>
            <div style="font-size:13px;color:#6b7280;margin-top:4px"><?= e($bank) ?> — <?= e($iban) ?></div>
            <?php endif; elseif ($m==='kapida_odeme'):
              $fee = (float)DB::setting('kapida_odeme_fee','0'); ?>
            <div style="font-size:13px;color:#6b7280;margin-top:4px">Kargo geldiğinde nakit veya kartla ödeyin.<?= $fee>0 ? ' +' . number_format($fee,2) . ' ₺ kapıda ödeme ücreti' : '' ?></div>
            <?php elseif ($m==='stripe'): ?>
            <div style="font-size:13px;color:#6b7280;margin-top:4px">Güvenli SSL şifreli kart ödemesi</div>
            <?php endif; ?>
          </div>
        </label>
        <?php endforeach; ?>
      </div>
    </div>

    <!-- Sağ: Özet -->
    <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:20px;position:sticky;top:80px">
      <h3 style="font-size:16px;font-weight:800;margin-bottom:14px;color:#111">Sipariş Özeti</h3>
      <?php foreach ($items as $item): ?>
      <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px">
        <span><?= e($item['title']) ?> <span style="color:#6b7280">×<?= $item['qty'] ?></span></span>
        <span><?= number_format($item['price']*$item['qty'],2) ?> ₺</span>
      </div>
      <?php endforeach; ?>
      <div style="border-top:1px solid #e5e7eb;margin:12px 0;padding-top:12px">
        <div style="display:flex;justify-content:space-between;font-size:18px;font-weight:900">
          <span>Toplam</span><span style="color:#CC0000"><?= number_format($total,2) ?> ₺</span>
        </div>
      </div>
      <button type="submit" style="width:100%;padding:13px;background:#CC0000;color:#fff;border:none;border-radius:8px;font-size:15px;font-weight:700;cursor:pointer;margin-top:8px">
        🔒 Siparişi Onayla
      </button>
      <p style="font-size:11px;text-align:center;color:#9ca3af;margin-top:8px">Güvenli SSL bağlantısı ile korunmaktadır</p>
    </div>
  </div>
  </form>
</main>
<?php Theme::partial('footer'); ?>
