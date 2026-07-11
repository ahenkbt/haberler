<?php get_header(); ?>
<main class="site-main" role="main">
    <div class="container">
        <div class="hata-404">
            <div class="hata-404-icerik">
                <div class="hata-kodu">404</div>
                <h1>Sayfa Bulunamadı</h1>
                <p>Aradığınız sayfa kaldırılmış, ismi değiştirilmiş veya geçici olarak kullanılamıyor olabilir.</p>
                <a href="<?php echo esc_url( home_url('/') ); ?>" class="btn-ana-sayfa">
                    <i class="fa fa-home"></i> Ana Sayfaya Dön
                </a>
                <div class="hata-arama"><?php get_search_form(); ?></div>
            </div>
        </div>
    </div>
</main>
<?php get_footer(); ?>
