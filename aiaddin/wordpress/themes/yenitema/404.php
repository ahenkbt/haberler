<?php get_header(); ?>
<?php  ?>
<div style="min-height:60vh;display:flex;align-items:center;justify-content:center;background:var(--bg)">
  <div style="text-align:center;max-width:500px;padding:40px 20px">
    <div style="font-family:var(--fh);font-size:5rem;font-weight:700;color:var(--cr);line-height:1;margin-bottom:16px">404</div>
    <h1 style="font-family:var(--fh);font-size:1.5rem;color:var(--dk);margin-bottom:10px">Sayfa Bulunamadı</h1>
    <p style="font-size:13.5px;color:var(--yz3);margin-bottom:24px;line-height:1.7">Aradığınız sayfa taşınmış, kaldırılmış veya hiç var olmamış olabilir.</p>
    <?php get_search_form(); ?>
    <a href="<?php echo esc_url(home_url('/')); ?>" style="display:inline-flex;align-items:center;gap:8px;margin-top:18px;background:var(--cr);color:#fff;font-family:var(--fh);font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;padding:11px 24px;text-decoration:none">🏠 Ana Sayfaya Dön</a>
  </div>
</div>
<?php get_footer(); ?>
