<?php
/* sector 2026-10-10: /uye-ol — rol ve onaylı üyelik başvurusu */
declare(strict_types=1);

use Yenisafak\Html;
use Yenisafak\Sector;

/** @var array<string, mixed> $def */
/** @var list<array<string, mixed>> $provinces */
/** @var string $token */
$roles = $def['roles'];
$isOkul = Sector::key() === 'okul';
?>
<section class="yn-phero yn-phero-voice">
  <div class="yn-wrap">
    <p class="yn-eyebrow"><span class="yn-dot"></span>Rol ve onaylı üyelik</p>
    <h1 class="yn-page-h">Rolünü seç,<br><em>başvurunu yap.</em></h1>
    <p class="yn-page-p">Başvurular editörlerimiz tarafından incelenir. Rehberde yer alacak kayıtlar (<?= Html::e(implode(', ', array_map(static fn ($k) => mb_strtolower((string) $k['one'], 'UTF-8'), $def['kinds']))) ?>) yalnızca onaydan sonra yayımlanır. Üyelik ücretsizdir; ödeme, bağış ya da abonelik yoktur.</p>
    <ol class="yn-steps">
      <li><b>1</b><span>Rolünü seç ve formu doldur</span></li>
      <li><b>2</b><span>Editör başvurunu inceler</span></li>
      <li><b>3</b><span>Onaylanırsa rehberde yayımlanır</span></li>
    </ol>
  </div>
</section>
<?php require __DIR__ . '/_benefits.php'; ?>
<div class="yn-wrap yn-voice">
  <form class="yn-form sc-form" method="post" action="/sektor/uye" data-sc-form>
    <input type="hidden" name="token" value="<?= Html::e($token) ?>">
    <div class="yn-f yn-f-wide">
      <span class="yn-label">Rolün</span>
      <div class="yn-chipset" role="radiogroup" aria-label="Rol">
        <?php foreach ($roles as $i => $r): ?>
          <label style="--c:<?= Html::e(Sector::colors()['hot']) ?>"><input type="radio" name="role" value="<?= Html::e((string) $r['key']) ?>" data-listed="<?= !empty($r['listed']) ? '1' : '0' ?>" data-geo="<?= !empty($r['geo']) ? '1' : '0' ?>"<?= $i === 0 ? ' checked' : '' ?>><span><?= Html::e((string) $r['label']) ?></span></label>
        <?php endforeach; ?>
      </div>
      <p class="yn-note sc-role-desc" data-sc-roledesc></p>
    </div>
    <div class="yn-f"><label for="sc-name">Ad soyad</label><input id="sc-name" type="text" name="full_name" maxlength="120" autocomplete="name" required></div>
    <div class="yn-f"><label for="sc-email">E-posta <em>(yayımlanmaz)</em></label><input id="sc-email" type="email" name="email" maxlength="160" autocomplete="email" required></div>
    <div class="yn-f"><label for="sc-phone">Telefon <em>(isteğe bağlı, yayımlanmaz)</em></label><input id="sc-phone" type="text" name="phone" maxlength="30" inputmode="tel" autocomplete="tel"></div>
    <div class="yn-f sc-listed" data-sc-listed><label for="sc-org">Rehberde görünecek ad <em>(muhtarlık / okul / sendika adı)</em></label><input id="sc-org" type="text" name="org" maxlength="160"></div>
    <div class="yn-f sc-listed" data-sc-listed><label for="sc-web">Web sitesi <em>(isteğe bağlı)</em></label><input id="sc-web" type="text" name="web" maxlength="200" placeholder="https://"></div>
    <div class="sc-listed yn-f-wide" data-sc-listed data-sc-geowrap><?php $geoMah = true; $geoReq = false; require __DIR__ . '/_geo.php'; ?></div>
    <div class="yn-f yn-f-wide"><label for="sc-note">Kısa tanıtım / not <em>(isteğe bağlı, en fazla 1500 karakter)</em></label><textarea id="sc-note" name="note" maxlength="1500" style="min-height:120px;font-family:inherit;font-size:1rem"></textarea></div>
    <div class="yn-f yn-f-wide">
      <label class="yn-check"><input type="checkbox" name="kvkk" value="1" required><span><a href="/kvkk-aydinlatma" target="_blank">KVKK Aydınlatma Metni</a>'ni ve <a href="/gizlilik-politikasi" target="_blank">Gizlilik Politikası</a>'nı okudum; kişisel verilerimin başvurumun değerlendirilmesi ve (onaylanırsa) rehberde yayımlanması amacıyla işlenmesini kabul ediyorum.</span></label>
<?php if ($isOkul): ?>
      <label class="yn-check"><input type="checkbox" name="adult" value="1"><span>18 yaşından büyüğüm (ya da yasal veli/vasi olarak başvuruyorum). Öğrenci kişisel verilerini bu formda paylaşmıyorum. <em>(Okul yöneticisi, öğretmen ve veli rolleri için zorunlu)</em></span></label>
<?php endif; ?>
    </div>
    <div class="yn-hp" aria-hidden="true"><label>Web sitesi <input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>
    <div class="yn-form-foot"><button class="yn-btn yn-btn-hot yn-btn-lg" type="submit">Başvurumu gönder</button><p class="yn-form-msg" role="status" aria-live="polite"></p></div>
  </form>
  <aside class="yn-voice-aside">
    <div class="yn-tipcard">
      <p class="yn-eyebrow">Nasıl çalışır?</p>
      <ul>
        <?php foreach ($roles as $r): ?><li><b><?= Html::e((string) $r['label']) ?>.</b> <?= Html::e((string) $r['desc']) ?></li><?php endforeach; ?>
      </ul>
    </div>
    <p class="yn-note">Platform siyasi parti, aday ya da siyasetçi propagandası kabul etmez. Başvurular doğrulama için editör tarafından e-posta ile aranabilir.</p>
  </aside>
</div>
<script type="application/json" id="sc-roles"><?= json_encode(array_column($roles, 'desc', 'key'), JSON_UNESCAPED_UNICODE | JSON_HEX_TAG) ?></script>
