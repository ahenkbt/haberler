<?php
header("Content-type: text/css; charset: UTF-8");

if (isset($_GET['color'])) {
    $color = '#' . $_GET['color'];
} else {
    $color = "'" . $color . "'";
}
?>


<!-- .footer-area {
    background-color: var(--yellow);
} -->
.banner-area .banner-slide .banner-item .banner-content a{
    background-color: var(--yellow);
}
.banner-area .banner-slide .banner-item .banner-content a{
border-color: <?php echo htmlspecialchars($color); ?>;
}


.banner-area .banner-slide .banner-item .banner-content .title{
color: <?php echo htmlspecialchars($color); ?>;
}


.electronics-product-item .product-buy-btn ul li a.main-btn,
.shop-home-1-area .shop-home-area .new-product-list .new-product-title .title::before,
.shop-lookbook-item .shop-lookbook-title .title::before,
.electronics-product-area .electronics-title .title::before,
.banner-area .banner-slide .slick-dots li.slick-active button,
.categories_btn{
border-color: <?php echo htmlspecialchars($color); ?>;
background-color: <?php echo htmlspecialchars($color); ?>;
}

.main_menu nav>ul>li ul.sub_menu li a:hover,
.main_menu nav>ul>li>a.active,
#navCatContent li a:hover{
color: <?php echo htmlspecialchars($color); ?>;
}

.header-btn a:hover{
background: <?php echo htmlspecialchars($color); ?>;
border-color: <?php echo htmlspecialchars($color); ?>;
}
.main-btn{
border-color: <?php echo htmlspecialchars($color); ?> !important;
background: <?php echo htmlspecialchars($color); ?> !important;
}
.main-btn:hover{
border-color: <?php echo htmlspecialchars($color); ?>;
}

.shop-lookbook-item .shop-lookbook-slider .item .review-price ul li i,
.electronics-product-item .electronics-product-content .review-price ul li i,
.product-loop .single-product .price{
color: <?php echo htmlspecialchars($color); ?>;
}
.go-top-wrap .go-top-btn::after,
.go-top-area .go-top::before,
.go-top-wrap .go-top-btn{
    background: <?php echo htmlspecialchars($color); ?>;
}
.main-header-icon #cartIconWrapper .badge,
.modal#variationModal .modal-quantity span,
.product-gallery-arrow::-webkit-scrollbar-thumb,
.sidebar .widget.search-widget form button,
.shop-sidebar .widget.product-filter-widget .slider-range .ui-widget-header,
.shop-details-wrap .product-details .product-gallery .product-gallery-slider .slick-arrow{
    background-color: <?php echo htmlspecialchars($color); ?>;
}
.pagination-wrap li.active a, .pagination-wrap li:hover a{
    background-color: <?php echo htmlspecialchars($color); ?>;
    border-color: <?php echo htmlspecialchars($color); ?>;
}