<?php
header("Content-type: text/css; charset: UTF-8");

if (isset($_GET['color'])) {
    $color = '#' . $_GET['color'];
} else {
    $color = "'" . $color . "'";
}
?>

.navigation,
.navigation .navbar .navbar-nav .nav-item .sub-menu > li:hover > a,

.footer-wrapper-one .footer-widget .widget.footer-nav-widget ul.widget-link li a:hover:before, .footer-wrapper-one .footer-widget .widget.about-widget .share ul.social-link li a:hover, .sidebar-widget-area .widget.tag-cloud-widget a:hover, .blog-details-container .blog-post-item .post-share-tag .post-tag-cloud ul li a:hover, .team-details-section .team-content .social-link li a:hover, .team-item-one .team-img .team-overlay .team-social ul.social-link li a:hover, .lawgne-pagination ul li a:hover,


.our-services-4-area .single-services:hover .services-content .title,
.video-area .video-content .title,
.video-area .video-thumb .video-overlay a,
.counter-4-area .progress-counter i,
.counter-4-area .progress-counter .title,
.footer-wrapper-one .footer-widget .widget.footer-nav-widget ul.widget-link li a:hover, .blog-details-container .post-nav-area .post-nav .content h6:hover, .blog-details-container .post-author-box .author-content ul.social-link li:hover, .blog-details-container .blog-post-item .post-share-tag .social-share ul.social-link li a:hover, .blog-post-item-six.blog-post-bg .entry-content .post-meta ul li span:hover, .blog-post-item-six.blog-post-bg .entry-content .post-admin span:hover, .blog-post-item-six.blog-post-bg .entry-content h3.title:hover, .blog-post-item-six .entry-content .post-admin span a:hover, .blog-post-item-six .entry-content h3.title:hover, .blog-post-item-five .entry-content .post-admin span a:hover, .blog-post-item-five .entry-content h3.title:hover, .blog-post-item-three .entry-content h3.title:hover, .blog-post-item-two .entry-content .btn-link:hover, .blog-post-item-two .entry-content h3.title:hover, .blog-post-item-one .entry-content h3.title:hover, .arrow-btn:hover, .post-meta ul li span:hover, .team-item-one .team-content h3.title:hover, .case-item-three .case-content h3.title:hover, .case-item-two .case-img .case-overlay .case-content h3.title:hover, .case-item-one .case-content h3.title:hover, .service-item-four .content h3.title:hover, .service-item-three .content h3.title:hover, .service-item-one .content h3.title:hover, .header-logo-area .site-info .info-list li .info h5:hover,
.service-item-one .icon i,

.features-item-one .icon i, .service-item-two .icon i,
.header-top-bar .text-block p a,
.header-navigation .main-menu ul li:hover > a,
.dark-version .hero-area-two .hero-content .tagline,
.template-footer.text-white-version .footer-widgets-area .widget .social-links li a:hover,
.latest-post-box .post-meta a i,
.tilke-video .video-popup,
.dark-version .accordion .accordion-item .accordion-title::before, .dark-version .accordion .accordion-item .accordion-title::after,
.dark-version .portfolio-filter ul li.active, .dark-version .portfolio-filter ul li:hover,
.off-canvas-panel .contact-us li a:hover,
.slick-dots li::before,
.testimonial-item .author .title,
.portfolio-items-two .categories a:hover,
.simple-icon-box .icon,
.section-heading .tagline,

.footer-wrapper-one .footer-widget .widget.contact-info-widget .info-widget-content p i,
.template-header .nav-menu li a:hover,
.team-4-area .single-team .team-content span,
.team-4-area .single-team .team-content ul li a:hover,
.faq-area .faq-clients-item .clients-active .clients-user .clients-info span,
.footer-3-area .footer-item .footer-list ul li a:hover,


{
color : <?php echo htmlspecialchars($color); ?>;
}

.template-btn.bg-primary-10 {
background-color: <?php echo htmlspecialchars($color); ?>1A;
}
.hero-area-two .hero-content .tagline {
color: <?php echo htmlspecialchars($color); ?>;
background-color: <?php echo htmlspecialchars($color); ?>12;
}
.about-us-area .about-features:hover i,
.about-us-area .about-features:hover .title{
color : <?php echo htmlspecialchars($color); ?> !important ;;
}

.slick-dots li::before{
border: 3px solid <?php echo htmlspecialchars($color); ?>;
}
.video-area .video-content{
border-top: 7px solid <?php echo htmlspecialchars($color); ?>;
}
.our-services-4-area .single-services:hover .services-thumb i,
.loader .line3,
.loader .line1,


.quote-area .quote-form .input-box button:hover{
border-color : <?php echo htmlspecialchars($color); ?>;
}
.main-btn{
border : 1px solid <?php echo htmlspecialchars($color); ?>;
}

.about-us-area .about-content a:hover{
background: <?php echo htmlspecialchars($color); ?>;
border-color: <?php echo htmlspecialchars($color); ?>;
}
.faq-area::before,
.about-us-area .about-content .title::before{
background : <?php echo htmlspecialchars($color); ?>;
}
.faq-accordion .card-body{
background-color: <?php echo htmlspecialchars($color . 'BA'); ?>;
}
.faq-area .faq-item .faq-accordion .accordion .card .card-header{
background-color: <?php echo htmlspecialchars($color . 'BF'); ?>;
}

<!-- spartan code  end  -->

::-webkit-scrollbar-thumb {
background-color: <?php echo htmlspecialchars($color); ?>;
}

.input-group .icon {
color: <?php echo htmlspecialchars($color); ?>;
}
.main-btn {
background-color: <?php echo htmlspecialchars($color); ?>;
}
.main-btn.main-btn-2::after {
background-color: <?php echo htmlspecialchars($color); ?>;
}
.main-btn.main-btn-3::after {
background-color: <?php echo htmlspecialchars($color); ?>
}
.section-title .title-tag{
color: <?php echo htmlspecialchars($color); ?>
}
.section-title .title-tag::before, .section-title .title-tag::after{
background-color: <?php echo htmlspecialchars($color); ?>
}
div#preloader .loader-cubes .loader-cube::before {
background: <?php echo htmlspecialchars($color); ?>;
}
header .header-nav .nav-container .navbar-toggler{
border: 1px solid <?php echo htmlspecialchars($color); ?>;
}
header .header-nav .nav-container .navbar-toggler span {
background-color: <?php echo htmlspecialchars($color); ?>;
}
header .header-nav .nav-container .menu-items ul li a:hover {
color: <?php echo htmlspecialchars($color); ?>;
}
header .header-nav .nav-container .menu-items ul li .submenu li a:hover {
background-color: <?php echo htmlspecialchars($color); ?>;
}
header .header-nav .nav-container .menu-items ul li .submenu li:hover > a {
background-color: <?php echo htmlspecialchars($color); ?>;
}
header .header-nav .nav-container .offcanvas-toggler {
background-color: <?php echo htmlspecialchars($color); ?>;
}
header .header-nav .nav-container .language-selection .language-list li a:hover {
background-color: <?php echo htmlspecialchars($color); ?>;
}
header .header-nav .nav-container .menu-social-link a:hover {
color: <?php echo htmlspecialchars($color); ?>;
}
header .header-nav .nav-container.breakpoint-on .nav-pushed-item .main-btn::after {
background-color: <?php echo htmlspecialchars($color); ?>;
}
header .header-nav::before {
background-color: <?php echo htmlspecialchars($color); ?>;
}
header .header-topbar .contact-info li a:hover,
header .header-topbar .social-links li a:hover {
color: <?php echo htmlspecialchars($color); ?>;
}
header .header-topbar .contact-info li i {
margin-right: 15px;
color: <?php echo htmlspecialchars($color); ?>;
}
header.header-two .header-topbar .contact-info li a:hover,
header.header-two .header-topbar .social-links li a:hover {
color: <?php echo htmlspecialchars($color); ?>;
}
.offcanvas-wrapper .offcanvas-widget a.offcanvas-close {
color: <?php echo htmlspecialchars($color); ?>;
}
.offcanvas-wrapper .offcanvas-widget .widget .widget-title::before, .offcanvas-wrapper .offcanvas-widget .widget .widget-title::after {
background-color: <?php echo htmlspecialchars($color); ?>;
}
.offcanvas-wrapper .offcanvas-widget .widget.tweets-widget li i, .offcanvas-wrapper .offcanvas-widget .widget.contact-info-widget li i {
color: <?php echo htmlspecialchars($color); ?>;
}
.breadcrumb-section .breadcrumb-shapes > div {
background-color: <?php echo htmlspecialchars($color); ?>;
}
.banner-section .single-banner .banner-shapes > div {
background-color: <?php echo htmlspecialchars($color); ?>;
}
.banner-section.banner-section-three .single-banner .banner-content .promo-text {
color: <?php echo htmlspecialchars($color); ?>;
}
.banner-section.banner-section-three .single-banner .banner-content .promo-text::before {
background-color: <?php echo htmlspecialchars($color); ?>;
}
.banner-section.banner-section-three .single-banner .banner-shapes > div {
background-color: <?php echo htmlspecialchars($color); ?>;
}
.about-text .about-list li i {
color: <?php echo htmlspecialchars($color); ?>;
}
.about-text-two .about-list li i {
color: <?php echo htmlspecialchars($color); ?>;
border: 2px solid <?php echo htmlspecialchars($color); ?>;
}
.about-video .video-poster-two .video-play-icon {
color: <?php echo htmlspecialchars($color); ?>;
}
.service-section.shape-style-one::before, .service-section.shape-style-one::after {
background-color: <?php echo htmlspecialchars($color); ?>;
}

.feature-boxes .feature-box::before, .feature-boxes .feature-box::after {
background-color: <?php echo htmlspecialchars($color); ?>;
}
.wcu-section .wcu-text-two ul li i {
color: <?php echo htmlspecialchars($color); ?>;
}
.wcu-section .wcu-video .video-poster-two a {
color: <?php echo htmlspecialchars($color); ?>;
}
.fact-boxes .fact-box .icon {
color: <?php echo htmlspecialchars($color); ?>;
}
.fact-boxes .fact-box.fact-box-three:hover {
background-color: <?php echo htmlspecialchars($color); ?>;
}
.fact-text .fact-list li i {
color: <?php echo htmlspecialchars($color); ?>;
border: 2px solid <?php echo htmlspecialchars($color); ?>;
}
.fact-section-three::before {
background-color: <?php echo htmlspecialchars($color); ?>;
}
.team-members .team-member .member-picture-wrap .member-picture::before {
background-color: <?php echo htmlspecialchars($color); ?>;
}
.team-members .team-member .member-picture-wrap .member-picture .social-icons::before {
background-color: <?php echo htmlspecialchars($color); ?>;
}
.team-members .team-member .member-picture-wrap::after {
background-color: <?php echo htmlspecialchars($color); ?>;
}
.team-members-two .team-member .member-desc .social-icons li a:hover {
color: <?php echo htmlspecialchars($color); ?>;
}
.skill-section .skill-progress-bars .skill-progress .progressbar-wrap .progressbar {
background-color: <?php echo htmlspecialchars($color); ?>;
}
.testimonial-section .testimonial-items .testimonial-item .quote-top,
.testimonial-section .testimonial-items .testimonial-item .quote-bottom {
color: <?php echo htmlspecialchars($color); ?>;
}
.testimonial-section .testimonial-items .testimonial-item .author span {
color: <?php echo htmlspecialchars($color); ?>;
}
.testimonial-section .testimonial-arrows .slick-arrow {
color: <?php echo htmlspecialchars($color); ?>;
}
.testimonial-section .testimonial-arrows .slick-arrow.prev-arrow:hover {
color: <?php echo htmlspecialchars($color); ?>;
}
.testimonial-section-two .testimonial-items .testimonial-item .quote-top,
.testimonial-section-two .testimonial-items .testimonial-item .quote-bottom {
color: <?php echo htmlspecialchars($color); ?>;
}
.testimonial-section-two .testimonial-items .testimonial-item .author-name span {
color: <?php echo htmlspecialchars($color); ?>;
}
.testimonial-section-two .testimonial-items .slick-arrow:hover {
color: <?php echo htmlspecialchars($color); ?>;
}
.testimonial-section-three .testimonial-items .testimonial-item .quote-top,
.testimonial-section-three .testimonial-items .testimonial-item .quote-bottom {
color: <?php echo htmlspecialchars($color); ?>;
}
.testimonial-section-three .testimonial-items .slick-arrow:hover {
color: <?php echo htmlspecialchars($color); ?>;
}
.testimonial-section-three.no-bg .testimonial-items .testimonial-item .author-thumb img {
border-color: <?php echo htmlspecialchars($color); ?>;
}
.testimonial-section-three.no-bg .testimonial-items .slick-arrow:hover {
color: <?php echo htmlspecialchars($color); ?>;
}
.latest-post-loop .latest-post-box .post-desc .post-date {
color: <?php echo htmlspecialchars($color); ?>;
}
.latest-post-loop .latest-post-box .post-desc .post-link:hover {
color: <?php echo htmlspecialchars($color); ?>;
}
.latest-post-loop .latest-post-box:hover .post-desc {
border-color: <?php echo htmlspecialchars($color); ?>;
}
.latest-post-loop .latest-post-box-two .post-thumb-wrap .post-date {
background-color: <?php echo htmlspecialchars($color); ?>;
}
.latest-post-loop .latest-post-box-two .post-desc .post-link:hover {
color: <?php echo htmlspecialchars($color); ?>;
}
.blog-loop.standard-blog .single-post-box .post-meta ul li:hover,
.blog-loop.standard-blog .single-post-box .post-meta ul li a:hover {
color: <?php echo htmlspecialchars($color); ?>;
}
.blog-loop.standard-blog .single-post-box .post-meta ul li i {
color: <?php echo htmlspecialchars($color); ?>;
}
.blog-loop.standard-blog .single-post-box.video-post .post-video .popup-video {
color: <?php echo htmlspecialchars($color); ?>;
}
.blog-loop.grid-blog .single-post-box .post-content .post-date {
color: <?php echo htmlspecialchars($color); ?>;
}
.blog-loop.grid-blog .single-post-box .post-content .post-link:hover {
color: <?php echo htmlspecialchars($color); ?>;
}
.blog-loop.grid-blog .single-post-box:hover .post-content {
border-color: <?php echo htmlspecialchars($color); ?>;
}
.pagination-wrap li.active a, .pagination-wrap li:hover a {
background-color: <?php echo htmlspecialchars($color); ?>;
border-color: <?php echo htmlspecialchars($color); ?>;
}
.sidebar .widget.search-widget form button {
background-color: <?php echo htmlspecialchars($color); ?>;
}
.sidebar .widget.cat-widget ul li a:hover {
color: <?php echo htmlspecialchars($color); ?>;
}
.sidebar .widget.recent-post-widget .single-post .date i {
color: <?php echo htmlspecialchars($color); ?>;
}
.sidebar .widget.popular-tag-widget .tags-loop a:hover {
background-color: <?php echo htmlspecialchars($color); ?>;
}
.sidebar .widget.author-widget .social-icons li a:hover {
color: <?php echo htmlspecialchars($color); ?>;
}
.project-boxes .project-box:hover .project-desc {
background-color: <?php echo htmlspecialchars($color); ?>;
}
.project-nav li::before {
background-color: <?php echo htmlspecialchars($color); ?>;
}
.working-process-section .process-text .process-loop .single-process .icon {
color: <?php echo htmlspecialchars($color); ?>;
}
.working-process-section .process-text .process-loop .single-process .icon span {
background-color: <?php echo htmlspecialchars($color); ?>;
}
.working-process-section .process-text .process-loop .single-process:hover .icon {
background-color: <?php echo htmlspecialchars($color); ?>;
}
.working-process-section .process-text .process-loop .single-process:hover .icon span {
color: <?php echo htmlspecialchars($color); ?>;
}
.working-process-section .process-video .video .paly-icon {
color: <?php echo htmlspecialchars($color); ?>;
}
.working-process-section .process-video .video .paly-icon:hover {
background-color: <?php echo htmlspecialchars($color); ?>;
}
.working-process-section .working-circle {
border: 80px solid <?php echo htmlspecialchars($color); ?>;
}
.video-section .play-btn i {
color: <?php echo htmlspecialchars($color); ?>;
}
.video-section-two .video-cont .play-btn {
color: <?php echo htmlspecialchars($color); ?>;
}
.video-section-two .video-cont .play-btn:hover {
background-color: <?php echo htmlspecialchars($color); ?>;
}
.cta-wrap {
background-color: <?php echo htmlspecialchars($color); ?>;
}
.advanced-tab .tab-buttons .nav-tabs a:hover, .advanced-tab .tab-buttons .nav-tabs a.active {
background-color: <?php echo htmlspecialchars($color); ?>;
}
.advanced-tab .tab-content .tab-text-block .block-text ul li i {
color: <?php echo htmlspecialchars($color); ?>;
border: 2px solid <?php echo htmlspecialchars($color); ?>;
}
.advanced-tab .tab-content .tab-text-block.with-left-circle::before, .advanced-tab .tab-content .tab-text-block.with-right-circle::before {
border: 50px solid <?php echo htmlspecialchars($color); ?>;
}
.faq-section .faq-loop.accordion .card .card-header.active-header, .faq-section .faq-loop.accordion .card .card-header:hover {
background-color: <?php echo htmlspecialchars($color); ?>;
}
.faq-section .faq-loop.accordion .card .card-body {
background-color: <?php echo htmlspecialchars($color); ?>;
}
.faq-section .faq-loop.accordion.grey-header .card .card-header.active-header, .faq-section .faq-loop.accordion.grey-header .card .card-header:hover {
background-color: <?php echo htmlspecialchars($color); ?> !important;
}
.faq-section .faq-loop.accordion.border-style .card .card-header.active-header {
border-color: <?php echo htmlspecialchars($color); ?>;
}
.faq-section .faq-loop.accordion.border-style .card .card-body {
border-left: 2px solid <?php echo htmlspecialchars($color); ?>;
border-right: 2px solid <?php echo htmlspecialchars($color); ?>;
border-bottom: 2px solid <?php echo htmlspecialchars($color); ?>;
}
.contact-section.contact-page .contact-info .contact-info-content ul li i,
.contact-section.contact-page .contact-info .contact-info-content ul li a i {
color: <?php echo htmlspecialchars($color); ?>;
}
.job-categories .single-cat a:hover {
background-color: <?php echo htmlspecialchars($color); ?>;
}
.job-lists .single-job:hover {
background-color: <?php echo htmlspecialchars($color); ?>;
}
.post-details-wrap .post-meta ul li:hover,
.post-details-wrap .post-meta ul li a:hover {
color: <?php echo htmlspecialchars($color); ?>;
}
.post-details-wrap .post-meta ul li i {
color: <?php echo htmlspecialchars($color); ?>;
}
.post-details-wrap .post-footer ul li a:hover {
color: <?php echo htmlspecialchars($color); ?>;
}
.post-author-info .author-desc ul.social-links li a:hover {
color: <?php echo htmlspecialchars($color); ?>;
}
.post-nav .prev-post .date i,
.post-nav .next-post .date i {
color: <?php echo htmlspecialchars($color); ?>;
}
.comment-template .comment-list li .comment-content .reply-btn:hover {
color: <?php echo htmlspecialchars($color); ?>;
}
.service-details .service-details-content .circle-check-list li i {
border: 2px solid <?php echo htmlspecialchars($color); ?>;
color: <?php echo htmlspecialchars($color); ?>;
}
.service-details .service-details-content .check-list li i {
color: <?php echo htmlspecialchars($color); ?>;
}
.member-details-wrapper .member-details .member-picture-wrap .member-picture::after {
background-color: <?php echo htmlspecialchars($color); ?>;
}
.member-details-wrapper .member-details .member-desc span.title-tag,
.member-details-wrapper .member-details .member-desc span.pro,
.member-details-wrapper .member-details .member-contact-info span.title-tag,
.member-details-wrapper .member-details .member-contact-info span.pro {
color: <?php echo htmlspecialchars($color); ?>;
}
.member-details-wrapper .member-details .member-contact-info .social-links li a:hover {
color: <?php echo htmlspecialchars($color); ?>;
}
.member-details-wrapper .member-details .member-contact-info .contact-info li i {
color: <?php echo htmlspecialchars($color); ?>;
}
.product-loop .single-product .product-action a {
background-color: <?php echo htmlspecialchars($color); ?>;
}
.product-loop .single-product .price {
color: <?php echo htmlspecialchars($color); ?>;
}
.shop-top-bar .product-search button {
color: <?php echo htmlspecialchars($color); ?>;
}
.shop-sidebar .widget .widget-title::before, .shop-sidebar .widget .widget-title::after {
background-color: <?php echo htmlspecialchars($color); ?>;
}
.shop-sidebar .widget.product-cat-widget ul li a:hover {
color: <?php echo htmlspecialchars($color); ?>;
}
.shop-sidebar .widget.product-tag-widget .tags-loop a:hover {
background-color: <?php echo htmlspecialchars($color); ?>;
}
.shop-sidebar .widget.product-filter-widget .slider-range .ui-widget-header {
background-color: <?php echo htmlspecialchars($color); ?>;
}
.shop-sidebar .widget.product-filter-widget .ui-slider-handle {
background: <?php echo htmlspecialchars($color); ?>;
}
.shop-details-wrap .product-details .product-gallery .product-gallery-slider .slick-arrow {
background-color: <?php echo htmlspecialchars($color); ?>;
}
.shop-details-wrap .product-details .product-summary .rating li {
color: <?php echo htmlspecialchars($color); ?>;
}
.shop-details-wrap .product-details .product-summary .add-to-cart-form form button {
background-color: <?php echo htmlspecialchars($color); ?>;
}
.shop-details-wrap .product-details .product-summary .product-share li a:hover {
color: <?php echo htmlspecialchars($color); ?>;
}
.shop-details-wrap .product-details .product-details-tab .tab-filter-nav .nav a::before {
background: <?php echo htmlspecialchars($color); ?>;
}
.shop-details-wrap .product-details .product-details-tab .tab-filter-nav .nav a.active, .shop-details-wrap .product-details .product-details-tab .tab-filter-nav .nav a:hover {
color: <?php echo htmlspecialchars($color); ?>;
}
.shop-details-wrap .product-details .product-details-tab .product-review .review-list li .review-rating li {
color: <?php echo htmlspecialchars($color); ?>;
}
.service-tab .nav-link.active {
background-color: <?php echo htmlspecialchars($color); ?>;
}
.job-list-area-section .single-job p i {
color: <?php echo htmlspecialchars($color); ?>;
}
.job-details-section .job-details-wrapper .job-details h3.title {
color: <?php echo htmlspecialchars($color); ?>;
}
.job-details-section .sidebar .newsletter-widget .newsletter-content h5 {
color: <?php echo htmlspecialchars($color); ?>;
}
.job-details-section .sidebar .newsletter-widget .newsletter-content h4:after {
background-color: <?php echo htmlspecialchars($color); ?>;
}
.job-details-section .sidebar .newsletter-widget .newsletter-content .newsletter-btn {
background-color: <?php echo htmlspecialchars($color); ?>;
}
.cart-area-section .cart-table tbody .unit-price .available-info span.icon {
background-color: <?php echo htmlspecialchars($color); ?>;
}
.cart-area-section .cart-middle .cart-btn {
background-color: <?php echo htmlspecialchars($color); ?>;
}
.checkout-area-section .coupon .btn {
background-color: <?php echo htmlspecialchars($color); ?>;
}
.user-dashbord .user-sidebar .links li a:hover {
color: <?php echo htmlspecialchars($color); ?>;
}
.user-dashbord .user-profile-details .order-details .progress-area-step .progress-steps li.active .icon {
background: <?php echo htmlspecialchars($color); ?>;
}
.user-dashbord .user-profile-details .order-details .edit-account-info .filed-btn {
background-color: <?php echo htmlspecialchars($color); ?>;
}
.user-dashbord .user-profile-details .edit-info-area .btn {
background: <?php echo htmlspecialchars($color); ?>;
}
.user-dashbord .user-profile-details .edit-info-area .file-upload-area span {
background: <?php echo htmlspecialchars($color); ?>;
}
.user-dashbord .user-profile-details .edit-info-area .single_radio .single_input:checked + .single_input_label:before, .user-dashbord .user-profile-details .edit-info-area .single_checkbox .single_input:checked + .single_input_label:before {
border-color: <?php echo htmlspecialchars($color); ?>;
}
.user-dashbord .user-profile-details .edit-info-area .sigle_input_check:after {
background: <?php echo htmlspecialchars($color); ?>;
}
.user-dashbord .main-table .dataTables_wrapper td a.btn {
border: 1px solid <?php echo htmlspecialchars($color); ?>;
}
.user-dashbord .main-table .dataTables_wrapper td a.btn:hover {
background: <?php echo htmlspecialchars($color); ?>;
}
.user-dashbord .main-table .dataTables_wrapper .dataTables_paginate .paginate_button.active .page-link {
background-color: <?php echo htmlspecialchars($color); ?> !important;
}
.user-dashbord .main-table .dataTables_wrapper .dataTables_paginate .paginate_button .page-link:hover {
background-color: <?php echo htmlspecialchars($color); ?> !important;
}
.user-dashbord .view-order-page .order-info-area .prinit .btn {
background: <?php echo htmlspecialchars($color); ?>;
}
.user-area-section .user-form .form_group .btn {
background-color: <?php echo htmlspecialchars($color); ?>;
}
footer .widget .social-links li a:hover {
color: <?php echo htmlspecialchars($color); ?>;
}
.portfolio-details-slider .slick-arrow {
background-color: <?php echo htmlspecialchars($color); ?>;
}
.sidebar .widget.cat-widget ul li.active a {
color: <?php echo htmlspecialchars($color); ?>;
}
.page-item.active .page-link {
background-color: <?php echo htmlspecialchars($color); ?>;
border-color: <?php echo htmlspecialchars($color); ?>;
}
.iconic-box {
background-color: <?php echo htmlspecialchars($color); ?>0D;
}
.accordion .accordion-item .accordion-title {
color: var(--color-secondary);
background-color: <?php echo htmlspecialchars($color); ?>0D;
}
.tilke-video::before {
background-color: <?php echo htmlspecialchars($color); ?>B3;
}
.portfolio-items-two .portfolio-thumb .portfolio-link {
background-color: <?php echo htmlspecialchars($color); ?>B3;
}