<?php

declare(strict_types=1);

use Yenisafak\Html;
use Yenisafak\Tanitim;

/** tanitim 2026-10-08: premium "Tanıtım" page (user text verbatim + live news-site logo grid). */
/** @var Yenisafak\Site $site */
/** @var list<array<string, mixed>> $sites */
$t = Tanitim::TEXT;
$ilSites = Tanitim::ilSites();
$mail = Tanitim::email($site);
$selfHost = strtolower((string) preg_replace('#^www\.#', '', $site->domain !== '' ? $site->domain : $site->host));
$count = count($sites);
$icons = [
    '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="5" r="2.4"/><circle cx="5" cy="18" r="2.4"/><circle cx="19" cy="18" r="2.4"/><path d="M12 7.4v4.1m0 0-5.6 4.6M12 11.5l5.6 4.6M7.4 18h9.2"/></svg>',
    '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6"/><path d="m15 15 5.5 5.5M8 11.5l2 2 3.5-4"/></svg>',
    '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="5" rx="1.2"/><path d="M5 9v9.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V9M10 13h4"/></svg>',
];
?>
<style>
.tn{--tn-a:var(--ys-accent,#0b3362);--tn-ink:#14213d;--tn-mut:#5b6474;color:var(--tn-ink)}
.tn *{box-sizing:border-box}
.tn-hero{position:relative;overflow:hidden;color:#fff;background:#0f172a;background:linear-gradient(135deg,color-mix(in srgb,var(--tn-a) 88%,#000) 0%,color-mix(in srgb,var(--tn-a) 55%,#0f172a) 55%,#0f172a 100%);border-radius:0 0 28px 28px;margin:0 0 -54px;padding:56px 0 104px}
.tn-hero:before{content:"";position:absolute;inset:-40% -10% auto auto;width:560px;height:560px;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.16),rgba(255,255,255,0) 68%)}
.tn-hero:after{content:"";position:absolute;left:-120px;bottom:-160px;width:420px;height:420px;border-radius:50%;border:1px solid rgba(255,255,255,.14)}
.tn-hero .ys-wrap{position:relative;z-index:1}
.tn-eyebrow{display:inline-flex;align-items:center;gap:8px;font-size:.78rem;font-weight:700;letter-spacing:.16em;text-transform:uppercase;padding:7px 14px;border-radius:999px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.22)}
.tn-eyebrow i{width:7px;height:7px;border-radius:50%;background:#fff;box-shadow:0 0 0 4px rgba(255,255,255,.2)}
.tn-hero h1{font-family:Georgia,"Times New Roman",serif;font-weight:700;font-size:clamp(1.9rem,4.4vw,3.15rem);line-height:1.12;letter-spacing:-.01em;margin:18px 0 14px;max-width:900px;color:#fff}
.tn-hero p{font-size:clamp(1rem,1.6vw,1.14rem);line-height:1.6;max-width:760px;margin:0;color:rgba(255,255,255,.86)}
.tn-stats{display:flex;flex-wrap:wrap;gap:10px;margin-top:26px}
.tn-stats span{display:inline-flex;align-items:baseline;gap:8px;padding:10px 16px;border-radius:14px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.18);font-size:.9rem;color:rgba(255,255,255,.9)}
.tn-stats b{font-size:1.25rem;color:#fff}
.tn-body{position:relative;z-index:2}
.tn-card{background:#fff;border-radius:22px;box-shadow:0 24px 60px rgba(15,23,42,.12),0 2px 6px rgba(15,23,42,.06);padding:clamp(22px,4vw,48px);border:1px solid rgba(15,23,42,.06)}
.tn-sal{font-family:Georgia,"Times New Roman",serif;font-style:italic;font-size:1.15rem;color:var(--tn-a);margin:0 0 16px}
.tn-lead p{font-size:1.07rem;line-height:1.78;margin:0 0 14px;color:#253047}
.tn-lead p:first-child::first-letter{float:left;font-family:Georgia,serif;font-size:3.3rem;line-height:.9;padding:6px 10px 0 0;color:var(--tn-a);font-weight:700}
.tn-h2{display:flex;align-items:center;gap:12px;font-family:Georgia,"Times New Roman",serif;font-size:clamp(1.3rem,2.4vw,1.7rem);margin:34px 0 18px;color:var(--tn-ink)}
.tn-h2:after{content:"";flex:1;height:1px;background:linear-gradient(90deg,color-mix(in srgb,var(--tn-a) 45%,transparent),transparent)}
.tn-adv{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;list-style:none;margin:0;padding:0}
.tn-adv li{position:relative;padding:24px 22px 22px;border-radius:18px;background:linear-gradient(180deg,color-mix(in srgb,var(--tn-a) 7%,#fff),#fff);border:1px solid color-mix(in srgb,var(--tn-a) 16%,#e5e7eb);transition:transform .18s,box-shadow .18s}
.tn-adv li:hover{transform:translateY(-3px);box-shadow:0 14px 34px rgba(15,23,42,.1)}
.tn-ic{display:inline-flex;align-items:center;justify-content:center;width:50px;height:50px;border-radius:14px;background:var(--tn-a);color:#fff;box-shadow:0 8px 18px color-mix(in srgb,var(--tn-a) 35%,transparent);margin-bottom:14px}
.tn-ic svg{width:26px;height:26px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.tn-adv h3{font-size:1.06rem;margin:0 0 8px;color:var(--tn-ink)}
.tn-adv p{margin:0;font-size:.95rem;line-height:1.62;color:var(--tn-mut)}
.tn-outro{margin-top:26px;padding:20px 22px;border-left:4px solid var(--tn-a);border-radius:0 14px 14px 0;background:color-mix(in srgb,var(--tn-a) 6%,#f8fafc)}
.tn-outro p{margin:0 0 10px;font-size:1.02rem;line-height:1.7;color:#253047}
.tn-outro p:last-child{margin:0;font-family:Georgia,serif;font-style:italic}
.tn-net{margin:44px 0 0}
.tn-net-head{display:flex;flex-wrap:wrap;align-items:end;justify-content:space-between;gap:10px;margin-bottom:18px}
.tn-net-head h2{margin:0}
.tn-net-head p{margin:0;color:var(--tn-mut);font-size:.95rem}
.tn-grid{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(176px,1fr));gap:14px}
.tn-grid a{position:relative;display:flex;flex-direction:column;align-items:center;gap:8px;height:100%;padding:16px 12px 12px;border-radius:16px;background:#fff;border:1px solid #e6e8ee;color:inherit;text-decoration:none;transition:transform .16s,box-shadow .16s,border-color .16s}
.tn-grid a:hover{transform:translateY(-3px);box-shadow:0 12px 28px rgba(15,23,42,.12);border-color:color-mix(in srgb,var(--tn-a) 40%,#e6e8ee)}
.tn-logo{display:flex;align-items:center;justify-content:center;width:100%;height:68px;border-radius:10px;padding:6px 8px}
.tn-logo img{max-width:100%;max-height:56px;width:auto;height:auto;object-fit:contain}
.tn-logo b{display:none;font-size:1rem;text-align:center;color:var(--tn-a)}
.tn-grid strong{font-size:.9rem;text-align:center;line-height:1.25}
.tn-grid small{font-size:.76rem;color:var(--tn-mut);word-break:break-all;text-align:center}
.tn-self{position:absolute;top:8px;right:8px;font-size:.66rem;font-weight:700;letter-spacing:.04em;padding:3px 7px;border-radius:999px;background:var(--tn-a);color:#fff}
.tn-cta{display:grid;grid-template-columns:1.4fr 1fr;gap:22px;align-items:center;margin:44px 0 40px;padding:clamp(22px,4vw,40px);border-radius:22px;color:#fff;background:linear-gradient(120deg,#0f172a,color-mix(in srgb,var(--tn-a) 80%,#0f172a))}
.tn-cta h2{font-family:Georgia,serif;font-size:clamp(1.25rem,2.4vw,1.6rem);margin:0 0 10px;color:#fff}
.tn-cta p{margin:0 0 6px;color:rgba(255,255,255,.88);line-height:1.6}
.tn-cta a.tn-mail{color:#fff;font-weight:700;text-decoration:underline;text-underline-offset:3px}
.tn-cta .tn-btns{display:flex;flex-wrap:wrap;gap:10px;justify-content:flex-end}
.tn-btn{display:inline-flex;align-items:center;gap:8px;padding:13px 20px;border-radius:12px;font-weight:700;text-decoration:none;background:#fff;color:#0f172a;transition:transform .15s}
.tn-btn:hover{transform:translateY(-2px)}
.tn-btn.tn-ghost{background:transparent;color:#fff;border:1px solid rgba(255,255,255,.45)}
@media (max-width:900px){.tn-adv{grid-template-columns:1fr}.tn-cta{grid-template-columns:1fr}.tn-cta .tn-btns{justify-content:flex-start}}
@media (max-width:560px){.tn-hero{padding:38px 0 86px;border-radius:0 0 20px 20px}.tn-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.tn-logo{height:56px}.tn-logo img{max-height:44px}.tn-lead p:first-child::first-letter{font-size:2.6rem}}
</style>
<div class="tn">
  <section class="tn-hero">
    <div class="ys-wrap">
      <span class="tn-eyebrow"><i></i>Tanıtım</span>
      <h1><?= Html::e($t['title']) ?></h1>
      <p><?= Html::e($site->name) ?> Haber Merkezi</p>
      <div class="tn-stats">
        <span><b><?= $count > 0 ? (int) $count : 25 ?></b> haber portalı</span>
        <span><b>Eş zamanlı</b> yayın</span>
        <span><b>Kalıcı</b> arşiv</span>
      </div>
    </div>
  </section>
  <div class="ys-wrap tn-body">
    <article class="tn-card">
      <p class="tn-sal"><?= Html::e($t['salutation']) ?></p>
      <div class="tn-lead">
        <?php foreach ($t['intro'] as $p): ?><p><?= Html::e($p) ?></p><?php endforeach; ?>
      </div>
      <h2 class="tn-h2"><?= Html::e($t['advTitle']) ?></h2>
      <ul class="tn-adv">
        <?php foreach ($t['advantages'] as $i => $a): ?>
          <li><span class="tn-ic"><?= $icons[$i] ?? $icons[0] ?></span><h3><?= Html::e($a[0]) ?></h3><p><?= Html::e($a[1]) ?></p></li>
        <?php endforeach; ?>
      </ul>
      <div class="tn-outro">
        <?php foreach ($t['outro'] as $p): ?><p><?= Html::e($p) ?></p><?php endforeach; ?>
      </div>
    </article>

    <section class="tn-net" id="yayin-agimiz" aria-labelledby="tn-net-h">
      <div class="tn-net-head">
        <h2 class="tn-h2" id="tn-net-h">Yayın ağımız</h2>
        <p><?= $count > 0 ? (int) $count . ' haber portalı' : 'Haber portallarımız' ?></p>
      </div>
      <ul class="tn-grid" data-tn-grid="<?= $sites === [] ? 'empty' : 'ok' ?>">
        <?php foreach ($sites as $s):
          $isSelf = strtolower((string) $s['domain']) === $selfHost; ?>
          <li><a href="<?= Html::e((string) $s['url']) ?>" target="_blank" rel="noopener" title="<?= Html::e((string) $s['name']) ?>">
            <?php if ($isSelf): ?><span class="tn-self">Bu site</span><?php endif; ?>
            <span class="tn-logo"<?= (string) $s['logoBg'] !== '' ? ' style="background:' . Html::e((string) $s['logoBg']) . '"' : '' ?>>
              <?php if ((string) $s['logo'] !== ''): ?><img src="<?= Html::e((string) $s['logo']) ?>" alt="<?= Html::e((string) $s['name']) ?> logosu" loading="lazy" decoding="async" onerror="this.style.display='none';this.nextElementSibling.style.display='block'"><?php endif; ?>
              <b<?= (string) $s['logo'] === '' ? ' style="display:block"' : '' ?>><?= Html::e((string) $s['name']) ?></b>
            </span>
            <strong><?= Html::e((string) $s['name']) ?></strong>
            <small><?= Html::e((string) $s['domain']) ?></small>
          </a></li>
        <?php endforeach; ?>
      </ul>
    </section>

    <section class="tn-net" id="il-siteleri" aria-labelledby="tn-il-h">
      <div class="tn-net-head">
        <h2 class="tn-h2" id="tn-il-h">İl Siteleri</h2>
        <p><?= count($ilSites) > 0 ? (int) count($ilSites) . ' il sitesi' : 'İl haber siteleri' ?></p>
      </div>
      <ul class="tn-grid" data-tn-il-grid="<?= $ilSites === [] ? 'empty' : 'ok' ?>">
        <?php foreach ($ilSites as $s):
          $isSelf = strtolower((string) $s['domain']) === $selfHost; ?>
          <li><a href="<?= Html::e((string) $s['url']) ?>" target="_blank" rel="noopener" title="<?= Html::e((string) $s['name']) ?>">
            <?php if ($isSelf): ?><span class="tn-self">Bu site</span><?php endif; ?>
            <span class="tn-logo"<?= (string) $s['logoBg'] !== '' ? ' style="background:' . Html::e((string) $s['logoBg']) . '"' : '' ?>>
              <?php if ((string) $s['logo'] !== ''): ?><img src="<?= Html::e((string) $s['logo']) ?>" alt="<?= Html::e((string) $s['name']) ?> logosu" loading="lazy" decoding="async" onerror="this.style.display='none';this.nextElementSibling.style.display='block'"><?php endif; ?>
              <b<?= (string) $s['logo'] === '' ? ' style="display:block"' : '' ?>><?= Html::e((string) $s['name']) ?></b>
            </span>
            <strong><?= Html::e((string) $s['name']) ?></strong>
            <small><?= Html::e((string) $s['domain']) ?></small>
          </a></li>
        <?php endforeach; ?>
      </ul>
    </section>

    <section class="tn-cta" aria-label="İletişim">
      <div>
        <h2><?= Html::e($site->name) ?> Haber Merkezi</h2>
        <?php if ($mail !== ''): ?><p>Bilgi ve iletişim: <a class="tn-mail" href="mailto:<?= Html::e($mail) ?>"><?= Html::e($mail) ?></a></p><?php endif; ?>
        <p>Bize ayrıca <a class="tn-mail" href="<?= Html::e($site->path('/iletisim')) ?>">iletişim sayfamızdan</a> ulaşabilirsiniz.</p>
      </div>
      <div class="tn-btns">
        <a class="tn-btn" href="<?= Html::e($site->path('/iletisim')) ?>#iletisim-formu">İletişim formu →</a>
        <?php if ($mail !== ''): ?><a class="tn-btn tn-ghost" href="mailto:<?= Html::e($mail) ?>">E-posta gönder</a><?php endif; ?>
      </div>
    </section>
  </div>
</div>
<?php if ($sites === [] || $ilSites === []): /* list not reachable from the server: load it in the browser (same-origin Worker route) */ ?>
<script>
(function(){
  var main=document.querySelector('[data-tn-grid="empty"]');
  var il=document.querySelector('[data-tn-il-grid="empty"]');
  if((!main&&!il)||!window.fetch)return;
  var card=function(s){var e=function(v){return String(v||'').replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})};return '<li><a href="'+e(s.url)+'" target="_blank" rel="noopener"><span class="tn-logo">'+(s.logo?'<img src="'+e(s.logo)+'" alt="'+e(s.name)+' logosu" loading="lazy">':'<b style="display:block">'+e(s.name)+'</b>')+'</span><strong>'+e(s.name)+'</strong><small>'+e(s.domain)+'</small></a></li>'};
  fetch('/api/hm/public/news-sites').then(function(r){return r.json()}).then(function(j){
    if(main){var h='';(j.sites||[]).forEach(function(s){h+=card(s)});main.innerHTML=h}
    if(il){var h2='';(j.ilSites||[]).forEach(function(s){h2+=card(s)});il.innerHTML=h2}
  }).catch(function(){})
})();
</script>
<?php endif; ?>
