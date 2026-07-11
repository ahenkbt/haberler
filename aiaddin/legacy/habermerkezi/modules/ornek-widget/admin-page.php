<?php
defined('ROOT') or die();
Auth::require('admin');
ap_admin_layout('Örnek Modül', function() { ?>
<div class="ap-page-header"><h1 class="ap-page-title">Örnek Modül</h1></div>
<div class="ap-card" style="padding:28px">
  <h3>Merhaba! Bu modül çalışıyor ✅</h3>
  <p style="margin-top:10px;color:var(--ap-text-muted)">
    Bu sayfa <code>/modules/ornek-widget/admin-page.php</code> dosyasından yüklendi.<br>
    Kendi modülünüzü geliştirmek için bu dosyayı özelleştirin.
  </p>
</div>
<?php });
