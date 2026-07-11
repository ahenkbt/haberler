<?php
header("Content-type: text/css; charset: UTF-8");

if (isset($_GET['color'])) {
    $color = '#' . $_GET['color'];
} else {
    $color = "'" . $color . "'";
}
?>
.features-item-one:hover .content .icon-btn,
.header-navigation .main-menu ul li .sub-menu li:hover > a,
.off-canvas-panel .contact-us li i,
.template-footer .footer-widgets-area .widget .newsletter-form button,
.template-header .nav-menu li .submenu li a:hover,
span.sub-title:after, span.sub-title:before,
.back-to-top,
.template-btn, .slick-dots li{
background-color: <?php echo htmlspecialchars($color); ?>;
}
.newsletter-wrapper-one .newsletter-form .form_control:focus{
border-color : <?php echo htmlspecialchars($color); ?>;
}
.counter-item-one .icon i,
span.sub-title{
color: <?php echo htmlspecialchars($color); ?>;
}


.footer-wrapper-one .footer-widget .widget.footer-nav-widget ul.widget-link li a:hover:before, .footer-wrapper-one .footer-widget .widget.about-widget .share ul.social-link li a:hover, .sidebar-widget-area .widget.tag-cloud-widget a:hover, .blog-details-container .blog-post-item .post-share-tag .post-tag-cloud ul li a:hover, .team-details-section .team-content .social-link li a:hover, .team-item-one .team-img .team-overlay .team-social ul.social-link li a:hover, .lawgne-pagination ul li a:hover {
background-color:<?php echo htmlspecialchars($color); ?>;
}
.testimonial-wrapper-one .testimonial-slider-one .slick-dots li.slick-active {
border-color: <?php echo htmlspecialchars($color); ?>
}
.footer-wrapper-one .footer-widget .widget.contact-info-widget .info-widget-content a:hover,
.footer-wrapper-one .footer-widget .widget.contact-info-widget .info-widget-content p i,
.footer-wrapper-one .footer-widget .widget.recent-post-widget .post-widget-list .post-thumbnail-content .post-title-date h6:hover,
.footer-wrapper-one .footer-widget .widget.footer-nav-widget ul.widget-link li a:hover, .blog-details-container .post-nav-area .post-nav .content h6:hover, .blog-details-container .post-author-box .author-content ul.social-link li:hover, .blog-details-container .blog-post-item .post-share-tag .social-share ul.social-link li a:hover, .blog-post-item-six.blog-post-bg .entry-content .post-meta ul li span:hover, .blog-post-item-six.blog-post-bg .entry-content .post-admin span:hover, .blog-post-item-six.blog-post-bg .entry-content h3.title:hover, .blog-post-item-six .entry-content .post-admin span a:hover, .blog-post-item-six .entry-content h3.title:hover, .blog-post-item-five .entry-content .post-admin span a:hover, .blog-post-item-five .entry-content h3.title:hover, .blog-post-item-three .entry-content h3.title:hover, .blog-post-item-two .entry-content .btn-link:hover, .blog-post-item-two .entry-content h3.title:hover, .blog-post-item-one .entry-content h3.title:hover, .arrow-btn:hover, .post-meta ul li span:hover, .team-item-one .team-content h3.title:hover, .case-item-three .case-content h3.title:hover, .case-item-two .case-img .case-overlay .case-content h3.title:hover, .case-item-one .case-content h3.title:hover, .service-item-four .content h3.title:hover, .service-item-three .content h3.title:hover, .service-item-one .content h3.title:hover, .header-logo-area .site-info .info-list li .info h5:hover {
color: <?php echo htmlspecialchars($color); ?>;
}