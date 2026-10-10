<?php
/* sector 2026-10-10: /rehber/<tür>/<id>-<ad>/kartvizit — dijital kartvizit + QR (telefon HTML'de yok) */
declare(strict_types=1);

use Yenisafak\Html;
use Yenisafak\Sector;

/** @var array<string, mixed> $kd */
/** @var array<string, mixed> $r */
/** @var string $url */
$data = json_decode((string) ($r['data'] ?? '{}'), true) ?: [];
$loc = array_filter([$r['mahalle'] ? Sector::tr((string) $r['mahalle']) : (string) ($data['mahalle'] ?? ''), $r['ilce'] ? Sector::tr((string) $r['ilce']) : '', $r['il'] ? Sector::tr((string) $r['il']) : '']);
?>
<section class="yn-phero"><div class="yn-wrap">
  <p class="yn-eyebrow"><a href="/rehber">Rehber</a> / <a href="/rehber/<?= Html::e((string) $kd['key']) ?>"><?= Html::e((string) $kd['label']) ?></a></p>
  <h1 class="yn-page-h">Dijital kartvizit</h1>
</div></section>
<div class="yn-wrap">
  <div class="sc-card sc-card-vc">
    <p class="yn-eyebrow"><?= Html::e((string) $kd['one']) ?></p>
    <h2 class="yn-h2"><?= Html::e((string) $r['name']) ?></h2>
    <?php if ($loc !== []): ?><p><?= Html::e(implode(' · ', $loc)) ?></p><?php endif; ?>
    <?php if (($r['summary'] ?? '') !== ''): ?><p><?= Html::e((string) $r['summary']) ?></p><?php endif; ?>
    <div class="sc-qr" id="sc-qr" data-url="<?= Html::e($url) ?>" aria-label="Rehber sayfasına giden QR kod"></div>
    <p class="yn-note"><?= Html::e(preg_replace('#^https?://#', '', $url)) ?></p>
    <?php if (!empty($r['has_tel'])): ?><p class="sc-tel-row"><button type="button" class="yn-btn yn-btn-hot sc-tel" data-id="<?= (int) $r['id'] ?>" data-t="<?= Html::e((string) $telTok) ?>">📞 Ara</button> <span class="sc-tel-note" role="status"></span></p><?php endif; ?>
    <p class="yn-hero-cta"><button type="button" class="yn-btn yn-btn-ghost" id="sc-share">Paylaş</button> <button type="button" class="yn-btn yn-btn-ghost" onclick="window.print()">Yazdır</button></p>
  </div>
</div>
<script src="/brand/sector/qr.js"></script>
<script>
(function(){var el=document.getElementById('sc-qr');if(!el||typeof qrcode==='undefined')return;var q=qrcode(0,'M');q.addData(el.dataset.url);q.make();el.innerHTML=q.createSvgTag({cellSize:4,margin:0,scalable:true});
var b=document.getElementById('sc-share');b.addEventListener('click',function(){if(navigator.share){navigator.share({title:document.title,url:el.dataset.url}).catch(function(){});}else if(navigator.clipboard){navigator.clipboard.writeText(el.dataset.url);b.textContent='Bağlantı kopyalandı';}});})();
</script>
