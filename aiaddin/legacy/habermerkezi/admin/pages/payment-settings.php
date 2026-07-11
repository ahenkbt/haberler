<?php
defined('ROOT') or die();
Auth::require('admin');
$csrf = Security::csrf();

if ($_SERVER['REQUEST_METHOD'] === 'POST' && Security::verifyCsrf($_POST['csrf'] ?? '')) {
    $methods = array_intersect($_POST['methods'] ?? [], Payment::METHODS);
    DB::setSetting('payment_methods', json_encode(array_values($methods)));
    DB::setSetting('stripe_public_key',  trim($_POST['stripe_public_key']  ?? ''));
    DB::setSetting('stripe_secret_key',  trim($_POST['stripe_secret_key']  ?? ''));
    DB::setSetting('stripe_webhook_secret', trim($_POST['stripe_webhook_secret'] ?? ''));
    DB::setSetting('havale_bank_name',   trim($_POST['havale_bank_name']   ?? ''));
    DB::setSetting('havale_iban',        trim($_POST['havale_iban']        ?? ''));
    DB::setSetting('havale_account_name',trim($_POST['havale_account_name']?? ''));
    DB::setSetting('havale_instructions',trim($_POST['havale_instructions']?? ''));
    DB::setSetting('currency',           trim($_POST['currency']           ?? 'TRY'));
    DB::setSetting('kapida_odeme_fee',   trim($_POST['kapida_odeme_fee']   ?? '0'));
    ap_flash('Ödeme ayarları kaydedildi.');
    header('Location: /admin/?page=payment-settings');
    exit;
}

$enabled      = Payment::enabled();
$stripePublic = DB::setting('stripe_public_key','');
$stripeSecret = DB::setting('stripe_secret_key','');
$stripeWebhook= DB::setting('stripe_webhook_secret','');

ap_admin_layout('Ödeme Ayarları', function() use ($csrf,$enabled,$stripePublic,$stripeSecret,$stripeWebhook) { ?>
<div class="ap-page-header"><h1 class="ap-page-title">Ödeme Ayarları</h1></div>

<form method="POST">
<input type="hidden" name="csrf" value="<?= e($csrf) ?>">

<!-- Para Birimi -->
<div class="ap-card" style="padding:20px;margin-bottom:16px">
  <h3 style="margin-bottom:16px;font-size:15px">💱 Para Birimi</h3>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
    <div class="ap-form-group">
      <label class="ap-label">Para Birimi</label>
      <select class="ap-input" name="currency">
        <?php foreach (['TRY'=>'₺ Türk Lirası','USD'=>'$ ABD Doları','EUR'=>'€ Euro'] as $c=>$l): ?>
        <option value="<?=$c?>" <?= DB::setting('currency','TRY')===$c?'selected':'' ?>><?=$l?></option>
        <?php endforeach; ?>
      </select>
    </div>
  </div>
</div>

<!-- Ödeme Metodları -->
<div class="ap-card" style="padding:20px;margin-bottom:16px">
  <h3 style="margin-bottom:16px;font-size:15px">💳 Aktif Ödeme Metodları</h3>
  <div style="display:flex;flex-direction:column;gap:10px">
    <?php foreach (Payment::METHODS as $m): ?>
    <label style="display:flex;align-items:center;gap:12px;padding:14px;border:1px solid var(--ap-border);border-radius:8px;cursor:pointer;<?= in_array($m,$enabled)?'border-color:var(--ap-accent);background:var(--ap-accent)08':'' ?>">
      <input type="checkbox" name="methods[]" value="<?= $m ?>" <?= in_array($m,$enabled)?'checked':'' ?> style="width:16px;height:16px">
      <div>
        <div style="font-weight:600;font-size:14px"><?= Payment::icon($m) ?> <?= Payment::label($m) ?></div>
        <div class="text-muted" style="font-size:12px"><?= match($m) {
          'havale'       => 'Müşteri banka havalesi veya EFT ile ödeme yapar',
          'kapida_odeme' => 'Kargo geldiğinde kapıda nakit veya kartla ödeme',
          'stripe'       => 'Kredi/banka kartı ile anında güvenli ödeme',
        } ?></div>
      </div>
    </label>
    <?php endforeach; ?>
  </div>
</div>

<!-- Havale Bilgileri -->
<div class="ap-card" style="padding:20px;margin-bottom:16px">
  <h3 style="margin-bottom:16px;font-size:15px">🏦 Havale / EFT Bilgileri</h3>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
    <div class="ap-form-group">
      <label class="ap-label">Banka Adı</label>
      <input class="ap-input" name="havale_bank_name" value="<?= e(DB::setting('havale_bank_name')) ?>" placeholder="Örn: Ziraat Bankası">
    </div>
    <div class="ap-form-group">
      <label class="ap-label">Hesap Adı</label>
      <input class="ap-input" name="havale_account_name" value="<?= e(DB::setting('havale_account_name')) ?>" placeholder="Ad Soyad / Şirket Adı">
    </div>
    <div class="ap-form-group" style="grid-column:1/-1">
      <label class="ap-label">IBAN</label>
      <input class="ap-input" name="havale_iban" value="<?= e(DB::setting('havale_iban')) ?>" placeholder="TR00 0000 0000 0000 0000 0000 00">
    </div>
    <div class="ap-form-group" style="grid-column:1/-1">
      <label class="ap-label">Müşteriye Gösterilecek Talimat</label>
      <textarea class="ap-input" name="havale_instructions" rows="3" placeholder="Havale/EFT yaparken açıklama kısmına sipariş numaranızı yazınız."><?= e(DB::setting('havale_instructions')) ?></textarea>
    </div>
  </div>
</div>

<!-- Kapıda Ödeme -->
<div class="ap-card" style="padding:20px;margin-bottom:16px">
  <h3 style="margin-bottom:16px;font-size:15px">🚪 Kapıda Ödeme</h3>
  <div class="ap-form-group">
    <label class="ap-label">Kapıda Ödeme Ücreti (₺)</label>
    <input class="ap-input" name="kapida_odeme_fee" type="number" step="0.01" value="<?= e(DB::setting('kapida_odeme_fee','0')) ?>" style="max-width:160px" placeholder="0.00">
    <p class="text-muted" style="font-size:12px;margin-top:4px">0 girerseniz ücretsiz olur. Sipariş toplamına otomatik eklenir.</p>
  </div>
</div>

<!-- Stripe -->
<div class="ap-card" style="padding:20px;margin-bottom:20px">
  <h3 style="margin-bottom:4px;font-size:15px">💳 Stripe Kredi Kartı Entegrasyonu</h3>
  <p class="text-muted" style="font-size:13px;margin-bottom:16px">
    <a href="https://dashboard.stripe.com/apikeys" target="_blank" style="color:var(--ap-accent)">Stripe Dashboard</a>'dan API anahtarlarınızı alın.
  </p>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
    <div class="ap-form-group">
      <label class="ap-label">Public Key (Publishable Key)</label>
      <input class="ap-input" name="stripe_public_key" value="<?= e($stripePublic) ?>" placeholder="pk_live_... veya pk_test_...">
    </div>
    <div class="ap-form-group">
      <label class="ap-label">Secret Key</label>
      <input class="ap-input" type="password" name="stripe_secret_key" value="<?= e($stripeSecret) ?>" placeholder="sk_live_... veya sk_test_...">
    </div>
    <div class="ap-form-group" style="grid-column:1/-1">
      <label class="ap-label">Webhook Secret (opsiyonel)</label>
      <input class="ap-input" type="password" name="stripe_webhook_secret" value="<?= e($stripeWebhook) ?>" placeholder="whsec_...">
    </div>
  </div>
  <?php if ($stripePublic && $stripeSecret): ?>
  <div style="padding:10px 14px;background:#56d36420;border:1px solid #56d36440;border-radius:6px;font-size:13px;color:#56d364;margin-top:12px">
    ✓ Stripe entegrasyonu aktif — Kredi/banka kartı ödemesi hazır
  </div>
  <?php else: ?>
  <div style="padding:10px 14px;background:#e3b34120;border:1px solid #e3b34140;border-radius:6px;font-size:13px;color:#e3b341;margin-top:12px">
    ⚠ Stripe API anahtarlarını girin ve kredi kartı ödemesini aktifleştirin
  </div>
  <?php endif; ?>
</div>

<button class="ap-btn ap-btn-primary" type="submit" style="min-width:160px">Ayarları Kaydet</button>
</form>
<?php });
