<?php

declare(strict_types=1);

use Yenisafak\Html;
use Yenisafak\Tanitim;

/** tanitim 2026-10-08: /iletisim contact form -> POST /api/hm/public/contact (Worker) -> editor panel "İletişim". */
/** @var Yenisafak\Site $site */
$ctMail = Tanitim::email($site);
?>
<style>
.ct{--ct-a:var(--ys-accent,#0b3362);margin:28px 0 36px;padding:clamp(18px,3.4vw,34px);border-radius:20px;background:#fff;border:1px solid #e6e8ee;box-shadow:0 18px 44px rgba(15,23,42,.08)}
.ct *{box-sizing:border-box}
.ct h2{display:flex;align-items:center;gap:10px;font-family:Georgia,"Times New Roman",serif;font-size:clamp(1.3rem,2.4vw,1.6rem);margin:0 0 6px}
.ct h2 i{display:inline-block;width:10px;height:10px;border-radius:50%;background:var(--ct-a);box-shadow:0 0 0 5px color-mix(in srgb,var(--ct-a) 18%,transparent)}
.ct-sub{margin:0 0 20px;color:#5b6474}
.ct-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px 16px}
.ct-f{display:flex;flex-direction:column;gap:6px}
.ct-f.ct-wide{grid-column:1/-1}
.ct label{font-size:.86rem;font-weight:700;color:#1f2a40}
.ct label em{font-style:normal;font-weight:500;color:#8a93a3}
.ct input[type=text],.ct input[type=email],.ct input[type=tel],.ct select,.ct textarea{width:100%;font:inherit;font-size:.98rem;padding:11px 13px;border-radius:11px;border:1px solid #d5d9e2;background:#fbfcfe;color:#14213d;transition:border-color .15s,box-shadow .15s}
.ct textarea{min-height:160px;resize:vertical;line-height:1.55}
.ct input:focus,.ct select:focus,.ct textarea:focus{outline:none;border-color:var(--ct-a);box-shadow:0 0 0 4px color-mix(in srgb,var(--ct-a) 15%,transparent);background:#fff}
.ct-topics{display:flex;flex-wrap:wrap;gap:8px}
.ct-topics label{cursor:pointer}
.ct-topics input{position:absolute;opacity:0;pointer-events:none}
.ct-topics span{display:inline-block;padding:9px 16px;border-radius:999px;border:1px solid #d5d9e2;font-weight:600;font-size:.92rem;color:#334155;background:#fff;transition:all .15s}
.ct-topics input:checked+span{background:var(--ct-a);border-color:var(--ct-a);color:#fff;box-shadow:0 6px 16px color-mix(in srgb,var(--ct-a) 30%,transparent)}
.ct-topics input:focus-visible+span{outline:2px solid var(--ct-a);outline-offset:2px}
.ct-drop{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;padding:18px;border:2px dashed #cfd5e0;border-radius:14px;background:#f8fafc;text-align:center;cursor:pointer;color:#475569;font-size:.92rem}
.ct-drop.ct-over{border-color:var(--ct-a);background:color-mix(in srgb,var(--ct-a) 6%,#fff)}
.ct-drop strong{color:var(--ct-a)}
.ct-files{list-style:none;margin:8px 0 0;padding:0;display:flex;flex-wrap:wrap;gap:8px}
.ct-files li{display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border-radius:10px;background:#eef2f7;font-size:.82rem}
.ct-files button{border:0;background:none;cursor:pointer;font-size:1rem;line-height:1;color:#64748b}
.ct-kvkk{display:flex;gap:10px;align-items:flex-start;font-size:.88rem;color:#475569;line-height:1.5}
.ct-kvkk input{margin-top:3px;width:18px;height:18px;accent-color:var(--ct-a)}
.ct-hp{position:absolute!important;left:-9999px!important;width:1px;height:1px;overflow:hidden}
.ct-send{display:inline-flex;align-items:center;gap:10px;padding:13px 26px;border:0;border-radius:12px;background:var(--ct-a);color:#fff;font-weight:700;font-size:1rem;cursor:pointer;box-shadow:0 10px 22px color-mix(in srgb,var(--ct-a) 30%,transparent);transition:transform .15s,opacity .15s}
.ct-send:hover{transform:translateY(-2px)}
.ct-send[disabled]{opacity:.6;cursor:wait;transform:none}
.ct-msg{margin:14px 0 0;padding:12px 14px;border-radius:12px;font-weight:600;display:none}
.ct-msg.ok{display:block;background:#ecfdf3;color:#05603a;border:1px solid #abefc6}
.ct-msg.err{display:block;background:#fef3f2;color:#b42318;border:1px solid #fecdca}
.ct-foot{margin:16px 0 0;font-size:.85rem;color:#64748b}
@media (max-width:640px){.ct-grid{grid-template-columns:1fr}}
</style>
<section class="ct" id="iletisim-formu" aria-labelledby="ct-h">
  <h2 id="ct-h"><i></i>Bize yazın</h2>
  <p class="ct-sub">Haber ihbarı, duyuru, talep, şikâyet veya kariyer başvurunuzu iletin; <?= Html::e($site->name) ?> Haber Merkezi en kısa sürede dönüş yapar.</p>
  <form class="ct-form" method="post" action="/api/hm/public/contact" enctype="multipart/form-data" novalidate>
    <div class="ct-grid">
      <div class="ct-f ct-wide">
        <label>Konu</label>
        <div class="ct-topics" role="radiogroup" aria-label="Konu">
          <?php foreach (['haber' => 'Haber', 'duyuru' => 'Duyuru', 'talep' => 'Talep', 'sikayet' => 'Şikayet', 'kariyer' => 'Kariyer'] as $k => $v): ?>
            <label><input type="radio" name="topic" value="<?= $k ?>"<?= $k === 'haber' ? ' checked' : '' ?>><span><?= $v ?></span></label>
          <?php endforeach; ?>
        </div>
      </div>
      <div class="ct-f"><label for="ct-name">Ad soyad</label><input id="ct-name" type="text" name="name" maxlength="120" autocomplete="name" required></div>
      <div class="ct-f"><label for="ct-email">E-posta</label><input id="ct-email" type="email" name="email" maxlength="160" autocomplete="email" required></div>
      <div class="ct-f"><label for="ct-phone">Telefon <em>(isteğe bağlı)</em></label><input id="ct-phone" type="tel" name="phone" maxlength="40" autocomplete="tel"></div>
      <div class="ct-f"><label for="ct-title">Başlık <em>(isteğe bağlı)</em></label><input id="ct-title" type="text" name="title" maxlength="200"></div>
      <div class="ct-f ct-wide"><label for="ct-body">Mesajınız</label><textarea id="ct-body" name="message" maxlength="8000" required></textarea></div>
      <div class="ct-f ct-wide">
        <label>Resim veya dosya <em>(isteğe bağlı · JPG, PNG, WEBP, GIF, PDF, DOC, DOCX · en fazla 5 dosya, toplam 10 MB)</em></label>
        <label class="ct-drop" for="ct-file"><span><strong>Dosya seçin</strong> veya buraya sürükleyin</span></label>
        <input id="ct-file" type="file" name="files" multiple accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,.pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" hidden>
        <ul class="ct-files" aria-live="polite"></ul>
      </div>
      <div class="ct-f ct-wide">
        <label class="ct-kvkk"><input type="checkbox" name="kvkk" value="1" required><span>Kişisel verilerimin, başvurumun değerlendirilmesi ve tarafıma dönüş yapılması amacıyla 6698 sayılı KVKK kapsamında işlenmesini kabul ediyorum.</span></label>
      </div>
    </div>
    <div class="ct-hp" aria-hidden="true"><label>Web sitesi <input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>
    <input type="hidden" name="ts" value="">
    <p style="margin:18px 0 0"><button class="ct-send" type="submit">Gönder</button></p>
    <p class="ct-msg" role="status"></p>
    <?php if ($ctMail !== ''): ?><p class="ct-foot"><?= Html::e($site->name) ?> Haber Merkezi — Bilgi ve iletişim: <a href="mailto:<?= Html::e($ctMail) ?>"><?= Html::e($ctMail) ?></a></p><?php endif; ?>
  </form>
  <noscript><p class="ct-foot">Formu kullanmak için tarayıcınızda JavaScript açık olmalıdır<?= $ctMail !== '' ? '; bize ' . Html::e($ctMail) . ' adresinden de yazabilirsiniz' : '' ?>.</p></noscript>
</section>
<script>
(function(){
  var f=document.querySelector('.ct-form');if(!f||!window.FormData||!window.fetch)return;
  var ts=f.querySelector('[name=ts]');ts.value=String(Date.now());
  var input=f.querySelector('#ct-file'),list=f.querySelector('.ct-files'),drop=f.querySelector('.ct-drop'),msg=f.querySelector('.ct-msg'),btn=f.querySelector('.ct-send');
  var files=[],MAX=10*1024*1024,OK=/\.(jpe?g|png|webp|gif|pdf|docx?)$/i;
  function kb(n){return n>1048576?(n/1048576).toFixed(1)+' MB':Math.max(1,Math.round(n/1024))+' KB'}
  function show(t,ok){msg.textContent=t;msg.className='ct-msg '+(ok?'ok':'err')}
  function draw(){list.innerHTML='';files.forEach(function(x,i){var li=document.createElement('li');li.textContent=x.name+' · '+kb(x.size)+' ';var b=document.createElement('button');b.type='button';b.setAttribute('aria-label','Kaldır');b.textContent='×';b.onclick=function(){files.splice(i,1);draw()};li.appendChild(b);list.appendChild(li)})}
  function add(fl){for(var i=0;i<fl.length;i++){var x=fl[i];if(!OK.test(x.name)){show('"'+x.name+'" desteklenmeyen dosya türü.',false);continue}if(files.length>=5){show('En fazla 5 dosya ekleyebilirsiniz.',false);break}var tot=files.reduce(function(a,b){return a+b.size},0);if(tot+x.size>MAX){show('Dosyaların toplamı 10 MB\'ı geçemez.',false);continue}files.push(x)}draw()}
  input.addEventListener('change',function(){add(input.files);input.value=''});
  ['dragenter','dragover'].forEach(function(e){drop.addEventListener(e,function(ev){ev.preventDefault();drop.classList.add('ct-over')})});
  ['dragleave','drop'].forEach(function(e){drop.addEventListener(e,function(ev){ev.preventDefault();drop.classList.remove('ct-over')})});
  drop.addEventListener('drop',function(ev){if(ev.dataTransfer)add(ev.dataTransfer.files)});
  f.addEventListener('submit',function(ev){
    ev.preventDefault();
    var E=f.elements,name=E['name'].value.trim(),email=E['email'].value.trim(),body=E['message'].value.trim();
    if(!name||!email||!body){show('Ad soyad, e-posta ve mesaj zorunludur.',false);return}
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){show('Geçerli bir e-posta adresi yazın.',false);return}
    if(!E['kvkk'].checked){show('Devam etmek için KVKK onay kutusunu işaretleyin.',false);return}
    var fd=new FormData(f);fd.delete('files');files.forEach(function(x){fd.append('files',x,x.name)});
    btn.disabled=true;btn.textContent='Gönderiliyor…';
    fetch('/api/hm/public/contact',{method:'POST',body:fd,headers:{Accept:'application/json'},credentials:'omit'}).then(function(r){return r.json().catch(function(){return{}}).then(function(j){return{ok:r.ok,j:j}})}).then(function(r){
      if(r.ok&&r.j.ok){show(r.j.message||'Mesajınız alındı. Teşekkür ederiz.',true);f.reset();ts.value=String(Date.now());files=[];draw()}
      else show(r.j.error||'Mesaj gönderilemedi, lütfen tekrar deneyin.',false)
    }).catch(function(){show('Bağlantı hatası, lütfen tekrar deneyin.',false)}).then(function(){btn.disabled=false;btn.textContent='Gönder'})
  });
})();
</script>
