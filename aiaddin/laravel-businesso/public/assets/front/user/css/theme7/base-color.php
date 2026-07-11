<?php
header("Content-type: text/css; charset: UTF-8");

if (isset($_GET['color'])) {
    $color = '#' . $_GET['color'];
} else {
    $color = "'" . $color . "'";
}
?>


.our-services-4-area .single-services:hover .services-thumb i,

.header-area.header-area-4 .header-top{
background-color: <?php echo htmlspecialchars($color . 'E6'); ?>;
}


.cta-area .cta-item a:hover,
.quote-area .quote-form .input-box input:focus,
.quote-area .quote-form .input-box textarea:focus,
textarea:focus, input:focus, select:focus, .nice-select:focus{
border-color : <?php echo htmlspecialchars($color); ?>;
}


.banner-slide-3 .slick-dots li.slick-active button,
.faq-area .faq-clients-item .clients-active .slick-dots li.slick-active button,
.footer-3-area .footer-item .footer-title .title::before,
.portfolio-area .portfolio-item .portfolio-overlay{
background-color: <?php echo htmlspecialchars($color . 'BF'); ?>;
}

.blog-4-area .single-blog .blog-content ul li, .template-btn.bg-primary-10{
color : <?php echo htmlspecialchars($color); ?>;
}

.blog-4-area .single-blog .blog-content a:hover{
background: <?php echo htmlspecialchars($color); ?>;
border-color: <?php echo htmlspecialchars($color); ?>;
}

.footer-3-area .footer-item .footer-title .title::before,
.back-to-top a{
background: <?php echo htmlspecialchars($color); ?>;
}
.footer-3-area .footer-item .footer-list ul li a:hover{

color : <?php echo htmlspecialchars($color); ?>;
}