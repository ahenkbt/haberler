<?php
defined('ROOT') or die();
Cart::init();
$order   = $_SESSION['pending_order'] ?? null;
$secret  = $_SESSION['stripe_client_secret'] ?? '';
$pubKey  = Payment::stripePublicKey();
if (!$order || !$secret || !$pubKey) { header('Location: /sepet'); exit; }
Theme::partial('header');
?>
<main class="container" style="max-width:500px;margin:0 auto;padding:40px 12px">
  <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:32px">
    <h1 style="font-size:22px;font-weight:900;margin-bottom:4px;color:#111">💳 Kart Bilgileri</h1>
    <p style="font-size:14px;color:#6b7280;margin-bottom:24px">
      Sipariş #<?= e($order['order_number']) ?> — Toplam: <strong><?= number_format($order['total'],2) ?> ₺</strong>
    </p>
    <div id="payment-element" style="margin-bottom:20px"></div>
    <div id="payment-message" style="display:none;padding:10px 14px;background:#fee2e2;border-radius:6px;font-size:14px;color:#dc2626;margin-bottom:16px"></div>
    <button id="submit-btn" style="width:100%;padding:13px;background:#CC0000;color:#fff;border:none;border-radius:8px;font-size:15px;font-weight:700;cursor:pointer">
      🔒 Ödemeyi Tamamla — <?= number_format($order['total'],2) ?> ₺
    </button>
    <p style="font-size:11px;text-align:center;color:#9ca3af;margin-top:12px">🔒 256-bit SSL şifreli güvenli ödeme</p>
  </div>
</main>
<script src="https://js.stripe.com/v3/"></script>
<script>
const stripe   = Stripe('<?= e($pubKey) ?>');
const elements = stripe.elements({clientSecret:'<?= e($secret) ?>'});
const el       = elements.create('payment');
el.mount('#payment-element');
document.getElementById('submit-btn').addEventListener('click', async()=>{
  const btn = document.getElementById('submit-btn');
  const msg = document.getElementById('payment-message');
  btn.disabled = true;
  btn.textContent = '⏳ İşleniyor...';
  const {error} = await stripe.confirmPayment({
    elements,
    confirmParams: { return_url: window.location.origin + '/odeme/tamamlandi?oid=<?= $order['order_id'] ?>&method=stripe' },
  });
  if (error) {
    msg.textContent = error.message;
    msg.style.display = 'block';
    btn.disabled = false;
    btn.textContent = '🔒 Ödemeyi Tamamla — <?= number_format($order['total'],2) ?> ₺';
  }
});
</script>
<?php Theme::partial('footer'); ?>
