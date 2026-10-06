<?php

declare(strict_types=1);

use Yenisafak\Html;

/** @var Yenisafak\Site $site */
$slug = Html::e($site->slug);
$haberler = Html::e($site->path('/koseyazari/haberler'));
?>
<div class="ys-wrap ys-static" style="max-width:28rem;margin:3rem auto;">
  <h1>Köşe yazarı girişi</h1>
  <p class="ys-spot">Editörün tanımladığı e-posta ve şifre ile giriş yapın. Hesabınız yoksa site editörüne başvurun.</p>
  <form id="hm-kose-giris-form" method="post" action="/api/hm/author/login">
    <p>
      <label>E-posta<br>
        <input id="yg-email" name="email" type="email" required autocomplete="username" style="width:100%;padding:.5rem">
      </label>
    </p>
    <p>
      <label>Şifre<br>
        <input name="password" type="password" required autocomplete="current-password" style="width:100%;padding:.5rem">
      </label>
    </p>
    <p id="hm-kose-giris-err" style="color:#dc2626;min-height:1.2em"></p>
    <p><button type="submit">Giriş yap</button></p>
  </form>
  <p><a href="<?= $haberler ?>">Şifremi unuttum yerine site editörüne yazın</a></p>
</div>
<script>
(function(){
  var slug = <?= json_encode($site->slug, JSON_UNESCAPED_UNICODE) ?>;
  var next = <?= json_encode($site->path('/koseyazari/haberler'), JSON_UNESCAPED_UNICODE) ?>;
  var f = document.getElementById("hm-kose-giris-form");
  if (!f) return;
  f.addEventListener("submit", function(ev){
    ev.preventDefault();
    var err = document.getElementById("hm-kose-giris-err");
    var fd = new FormData(f);
    var ac = new AbortController();
    setTimeout(function(){ ac.abort(); }, 8000);
    fetch("/api/hm/author/login", {
      method: "POST",
      headers: {"content-type":"application/json"},
      body: JSON.stringify({
        email: String(fd.get("email")||"").trim(),
        password: String(fd.get("password")||""),
        siteSlug: slug
      }),
      signal: ac.signal
    }).then(function(r){ return r.json().then(function(j){ return {ok:r.ok, j:j}; }); })
      .then(function(x){
        if (!x.ok || !x.j.token) { err.textContent = (x.j && x.j.error) || "Giriş başarısız"; return; }
        try {
          localStorage.setItem("hm_author_jwt", x.j.token);
          localStorage.setItem("hm_author_payload", JSON.stringify({site:x.j.site, author:x.j.author}));
        } catch (e) {}
        location.href = next;
      }).catch(function(){ err.textContent = "Bağlantı hatası"; });
  });
})();
</script>
