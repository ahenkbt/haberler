<?php
/* sector 2026-10-10: /talep — talep formu modülü (muhtara iletme / soru-duyuru) */
declare(strict_types=1);

use Yenisafak\Html;
use Yenisafak\Sector;

/** @var array<string, mixed> $def */
/** @var list<array<string, mixed>> $provinces */
/** @var string $token */
/** @var int $preMah */
$rq = $def['request'];
$geoIds = [0, 0, 0];
if (($preMah ?? 0) > 0) {
    $geoIds = [(int) ($preInfo['il_plaka'] ?? 0), (int) ($preInfo['ilce_kimlik'] ?? 0), (int) $preMah];
}
?>
<section class="yn-phero yn-phero-voice">
  <div class="yn-wrap">
    <p class="yn-eyebrow"><span class="yn-dot"></span>Talep formu</p>
    <h1 class="yn-page-h"><?= Html::e((string) $rq['title']) ?></h1>
    <p class="yn-page-p"><?= Html::e((string) $rq['lead']) ?></p>
    <ol class="yn-steps">
      <li><b>1</b><span>Formu doldur</span></li>
      <li><b>2</b><span>Takip kodunu al</span></li>
      <li><b>3</b><span>Durumu takip sayfasından gör</span></li>
    </ol>
  </div>
</section>
<div class="yn-wrap yn-voice">
  <form class="yn-form sc-form" method="post" action="/sektor/talep" data-sc-form>
    <input type="hidden" name="token" value="<?= Html::e($token) ?>">
    <div class="yn-f yn-f-wide"><label for="sc-kind">Talep türü</label>
      <select id="sc-kind" name="kind" required><?php foreach ($rq['kinds'] as $k): ?><option><?= Html::e((string) $k) ?></option><?php endforeach; ?></select></div>
<?php if (!empty($rq['geo'])): ?>
    <div class="yn-f-wide"><p class="yn-label"><?= Html::e((string) $rq['target_label']) ?></p><?php $geoMah = true; $geoReq = true; require __DIR__ . '/_geo.php'; ?></div>
<?php endif; ?>
    <div class="yn-f yn-f-wide"><label for="sc-sub">Konu</label><input id="sc-sub" type="text" name="subject" maxlength="160" required></div>
    <div class="yn-f yn-f-wide"><label for="sc-msg">Mesajın <em>(en az 20, en fazla 3000 karakter)</em></label><textarea id="sc-msg" name="message" maxlength="3000" required style="min-height:200px;font-family:inherit;font-size:1rem" placeholder="Sorunu ya da önerini açık ve saygılı bir dille yaz. Kişisel veri (T.C. kimlik no, banka bilgisi) yazma."></textarea></div>
    <div class="yn-f"><label for="sc-rname">Ad soyad</label><input id="sc-rname" type="text" name="full_name" maxlength="120" autocomplete="name" required></div>
    <div class="yn-f"><label for="sc-remail">E-posta <em>(yayımlanmaz)</em></label><input id="sc-remail" type="email" name="email" maxlength="160" autocomplete="email" required></div>
    <div class="yn-f"><label for="sc-rphone">Telefon <em>(isteğe bağlı)</em></label><input id="sc-rphone" type="text" name="phone" maxlength="30" inputmode="tel" autocomplete="tel"></div>
    <div class="yn-f yn-f-wide">
      <label class="yn-check"><input type="checkbox" name="kvkk" value="1" required><span><a href="/kvkk-aydinlatma" target="_blank">KVKK Aydınlatma Metni</a>'ni okudum; kişisel verilerimin talebimin değerlendirilmesi, ilgili birime iletilmesi ve takibi amacıyla işlenmesini kabul ediyorum.</span></label>
    </div>
    <div class="yn-hp" aria-hidden="true"><label>Web sitesi <input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>
    <div class="yn-form-foot"><button class="yn-btn yn-btn-hot yn-btn-lg" type="submit">Talebimi gönder</button><p class="yn-form-msg" role="status" aria-live="polite"></p></div>
  </form>
  <aside class="yn-voice-aside">
    <div class="yn-tipcard">
      <p class="yn-eyebrow">İyi bir talep için</p>
      <ul>
        <li><b>Net ol.</b> Ne, nerede, ne zamandır sürüyor?</li>
        <li><b>Çözüm öner.</b> Varsa nasıl çözülebileceğini yaz.</li>
        <li><b>Saygılı ol.</b> Hakaret ve siyasi propaganda içeren talepler işleme alınmaz.</li>
        <li><b>Acil durumda</b> 112'yi ara; bu form acil çağrı hattı değildir.</li>
      </ul>
    </div>
    <p class="yn-note"><?= Html::e((string) $rq['note']) ?></p>
    <p class="yn-note">Takip kodun var mı? <a href="/sektor/takip">Talep takibi →</a></p>
  </aside>
</div>
