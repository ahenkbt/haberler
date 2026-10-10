<?php

declare(strict_types=1);

use Yenisafak\Html;

/** @var Yenisafak\Site $site */
/** @var string $page */
$contact = $site->contact;
$phone = (string) ($contact['phone'] ?? ($site->isTurkata() ? '0532 229 18 92' : ''));
$email = (string) ($contact['email'] ?? ($site->isTurkata() ? 'bilgi@turkatahaber.com' : ''));
$address = (string) ($contact['address'] ?? ($site->isTurkata() ? 'Sağlık Mah. Aksu Cad. 13/5 Çankaya - Ankara' : ''));
?>
<div class="ys-wrap ys-static">
  <?php if ($page === 'kunye'): ?>
    <h1>Künye</h1>
    <?php if ($site->isTurkata()): ?>
      <p class="ys-spot">THA – TürkAta Haber Ajansı, TürkAta Vakfı kuruluşu ve markasıdır.</p>
      <ul>
        <li>Yayın: <?= Html::e($site->name) ?></li>
        <li>Genel Müdür: Nail Türkoğlu</li>
        <li>Genel Yayın Yönetmeni: Mustafa ÖZDEMİR</li>
        <li>Yazı İşleri Müdürü: Melek Acar</li>
        <li>Genel Müdürlük: <?= Html::e($address) ?></li>
        <li>Telefon: <?= Html::e($phone) ?></li>
        <li>E-posta: <?= Html::e($email) ?></li>
        <li>Tüzel kişilik: Tükav Gaziler Eğitim Kültür Hizmetleri Ltd. Şti.</li>
      </ul>
      <h2 id="yayin-ilkeleri">Yayın ilkeleri</h2>
      <p>Ajans, başlık, özet ve kaynak bağlantısıyla sınırlı besleme kayıtlarını olduğu gibi gösterir. Tam metin, kaynağın kendi sayfasındadır. Editörün yazdığı haberler bu sitede yayımlanır.</p>
    <?php else: ?>
      <p><?= Html::e($site->name) ?> künyesi.</p>
      <?php if ($address !== ''): ?><p><?= Html::e($address) ?></p><?php endif; ?>
      <?php if ($email !== ''): ?><p><?= Html::e($email) ?></p><?php endif; ?>
    <?php endif; ?>
  <?php elseif ($page === 'hakkimizda'): ?>
    <h1>Hakkımızda</h1>
    <?php if ($site->isTurkata()): ?>
      <p class="ys-spot">TÜRKATA HABER AJANSI, Türk Kültürünü Araştırma ve Tanıtma Vakfı’nın haber ajansıdır. 1998’den bu yana yerel yönetimler, kamu kurumları ile sivil toplum ve sektör gündemini Türkçe olarak kamuoyuna aktarır.</p>
      <p>Yerelin Sesini Geleceğe Taşıyan Güvenilir Haber Ağı.</p>
    <?php else: ?>
      <p><?= Html::e($site->description !== '' ? $site->description : $site->name) ?></p>
    <?php endif; ?>
  <?php else: ?>
    <h1>İletişim</h1>
    <ul>
      <?php if ($address !== ''): ?><li><?= Html::e($address) ?></li><?php endif; ?>
      <?php if ($phone !== ''): ?><li><a href="tel:<?= Html::e(preg_replace('/\s+/', '', $phone) ?? $phone) ?>"><?= Html::e($phone) ?></a></li><?php endif; ?>
      <?php if ($email !== ''): ?><li><a href="mailto:<?= Html::e($email) ?>"><?= Html::e($email) ?></a></li><?php endif; ?>
    </ul>
    <?php if ($site->isTurkata()): ?>
      <p>THA – TürkAta Haber Ajansı, TürkAta Vakfı kuruluşu ve markasıdır.</p>
    <?php endif; ?>
  <?php endif; ?>
</div>
