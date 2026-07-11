<?php
header("Content-type: text/css; charset: UTF-8");

if (isset($_GET['color'])) {
    $color = '#' . $_GET['color'];
} else {
    $color = "'" . $color . "'";
}
?>

.job-list-area-section .single-job p i,
.name a{
color: <?php echo htmlspecialchars($color) ?> !important;
}

.faq-section .faq-loop.accordion .card .card-body
{
background-color: <?php echo htmlspecialchars($color) ?> !important;
}
.service-link i,
.service-boxes h3 a {
color: <?php echo htmlspecialchars($color); ?>;
}

.service-boxes .service-box:hover::after {
background-color: <?php echo htmlspecialchars($color); ?>;
}
.service-boxes .service-box-two .icon {
color: <?php echo htmlspecialchars($color); ?>;
}
.service-boxes .service-box-two:hover .service-link {
background-color: <?php echo htmlspecialchars($color); ?>;
}

.blog-loop.standard-blog .single-post-box .post-meta ul li i,
.post-details-wrap .post-meta ul li i,
.sidebar .widget.recent-post-widget .single-post .date i{
    color: <?php echo htmlspecialchars($color); ?>;
}

color: <?php echo htmlspecialchars($color); ?> !important;
.page-item.active .page-link{
background-color: <?php echo htmlspecialchars($color); ?> !important;
border-color: <?php echo htmlspecialchars($color); ?> !important;
}
.page-item.active .page-link{
background-color: <?php echo htmlspecialchars($color); ?>;
border-color: <?php echo htmlspecialchars($color); ?>;
}

.page-item.active .page-link
.page-link{
color: <?php echo htmlspecialchars($color); ?> !important;
}
.project-boxes .project-box:hover .project-desc,
.project-nav li::before {
background: <?php echo htmlspecialchars($color); ?>;
}
.contact-section.contact-page .contact-info .contact-info-content ul li i, .contact-section.contact-page .contact-info .contact-info-content ul li a i{
color: <?php echo htmlspecialchars($color); ?> !important;
}
.input-group .icon{
color: <?php echo htmlspecialchars($color); ?> !important;
}

.shop-top-bar .product-search button{
background: <?php echo htmlspecialchars($color); ?>;
border-color: <?php echo htmlspecialchars($color); ?>;
}
.single-product .product-desc .title a,
.shop-sidebar .widget.product-cat-widget ul li a:hover,
.sidebar .widget.cat-widget ul li a:hover{
color : <?php echo htmlspecialchars($color); ?>;
}
.shop-sidebar .widget .widget-title::before, .shop-sidebar .widget .widget-title::after{
background: <?php echo htmlspecialchars($color); ?>;
}
.product-loop .single-product .product-action a,
.shop-sidebar .widget.product-filter-widget .ui-slider-handle{
background: <?php echo htmlspecialchars($color); ?>;
}

.main-btn.main-btn-2 {
color: #fff;
}
.btn{
background: <?php echo htmlspecialchars($color); ?>;
border-color: <?php echo htmlspecialchars($color); ?>;
}
.shop-details-wrap .product-details .product-summary .add-to-cart-form form button,
.shop-details-wrap .product-details .product-details-tab .tab-filter-nav .nav a::before{
background: <?php echo htmlspecialchars($color); ?>;
}


footer .widget.contact-widget .contact-infos i {
color: <?php echo htmlspecialchars($color); ?>;
}
footer .widget.insta-feed-widget .insta-images .insta-img::before {
background-color: <?php echo htmlspecialchars($color); ?>;
}
footer .footer-copyright .back-to-top {
color: <?php echo htmlspecialchars($color); ?>;
}
footer .footer-copyright .back-to-top:hover {
background-color: <?php echo htmlspecialchars($color); ?>;
}
footer.grey-bg-footer .widget a:hover {
color: <?php echo htmlspecialchars($color); ?>;
}
footer.grey-bg-footer .footer-copyright .back-to-top:hover {
background-color: <?php echo htmlspecialchars($color); ?>;
}

.shop-details-wrap .product-details .product-summary .rating li,
.shop-details-wrap .product-details .product-details-tab .tab-filter-nav .nav a.active, .shop-details-wrap .product-details .product-details-tab .tab-filter-nav .nav a:hover{
color: <?php echo htmlspecialchars($color); ?>;
}
.back-to-top a,
.main-btn,
.template-btn.bg-primary-10::before,
.bg-color-primary{
background-color: <?php echo htmlspecialchars($color); ?> !important ;
}

.footer-3-area .footer-item .footer-social ul > li a {
background-color: <?php echo htmlspecialchars($color); ?> !important;
}