"use strict";
var olimaDoc;

(function ($) {

    olimaDoc = {
        init: function () {
            this.mainMenu();
        },
        //===== 01. Main Menu
        mainMenu() {
            // Variables
            var var_window = $(window),
                navContainer = $('.nav-container'),
                pushedWrap = $('.nav-pushed-item'),
                pushItem = $('.nav-push-item'),
                pushedHtml = pushItem.html(),
                pushBlank = '',
                navbarToggler = $('.navbar-toggler'),
                navMenu = $('.nav-menu'),
                navMenuLi = $('.nav-menu ul li ul li'),
                closeIcon = $('.navbar-close');

            // navbar toggler
            navbarToggler.on('click', function () {
                navbarToggler.toggleClass('active');
                navMenu.toggleClass('menu-on');
            });

            // close icon
            closeIcon.on('click', function () {
                navMenu.removeClass('menu-on');
                navbarToggler.removeClass('active');
            });

            // adds toggle button to li items that have children
            navMenu.find('li a').each(function () {
                if ($(this).next().length > 0) {
                    $(this)
                        .parent('li')
                        .append(
                            '<span class="dd-trigger"><i class="fas fa-angle-down"></i></span>'
                        );
                }
            });

            // expands the dropdown menu on each click
            navMenu.find('li .dd-trigger').on('click', function (e) {
                e.preventDefault();
                $(this)
                    .parent('li')
                    .children('ul')
                    .stop(true, true)
                    .slideToggle(350);
                $(this).parent('li').toggleClass('active');
            });

            // check browser width in real-time
            function breakpointCheck() {
                var windoWidth = window.innerWidth;
                if (windoWidth <= 991) {
                    navContainer.addClass('breakpoint-on');
                    pushedWrap.html(pushedHtml);
                    pushItem.hide();
                } else {
                    navContainer.removeClass('breakpoint-on');
                    pushedWrap.html(pushBlank);
                    pushItem.show();
                }
            }

            breakpointCheck();
            var_window.on('resize', function () {
                breakpointCheck();
            });
        }
    };

    // Document Ready
    $(document).ready(function () {
        olimaDoc.init();
    });

    //magnific-popup js
    $('.play_btn').magnificPopup({
        type: 'image',
        removalDelay: 300,
        mainClass: 'mfp-fade',
        gallery: {
            enabled: true
        }
    });

    $('.img-popup').magnificPopup({
        type: 'image',
        gallery: {
            enabled: true
        }
    });

    // Show or Hide The 'Back To Top' Button
    $(window).on('scroll', function () {
        if ($(this).scrollTop() > 600) {
            $('.back-to-top').stop().fadeIn();
        } else {
            $('.back-to-top').stop().fadeOut();
        }
    });

    // Animate The 'Back To Top'
    $('.back-to-top').on('click', function (event) {
        event.preventDefault();

        $('html, body').animate({
            scrollTop: 0
        }, 1500);
    });

    // slick slider
    $('.hero_post_slide_v1').slick({
        dots: false,
        arrows: true,
        infinite: true,
        autoplay: true,
        autoplaySpeed: 2500,
        slidesToShow: 1,
        slidesToScroll: 1,
        rtl: true,
        prevArrow: '<div class="arrow prev"><i class="fas fa-arrow-left"></i></div>',
        nextArrow: '<div class="arrow next"><i class="fas fa-arrow-right"></i></div>',
        centerMode: $('.hero_post_slide_v1 .grid_item').length > 1 ? true : false,
        variableWidth: $('.hero_post_slide_v1 .grid_item').length > 1 ? true : false,
        responsive: [{
            breakpoint: 1024,
            settings: {
                arrows: false,
            }
        },
        {
            breakpoint: 600,
            settings: {
                arrows: false,
            }
        },
        {
            breakpoint: 480,
            settings: {
                arrows: false,
            }
        }]
    });

    $('.latest-slider-one').slick({
        dots: false,
        arrows: true,
        infinite: true,
        autoplay: true,
        autoplaySpeed: 2500,
        prevArrow: '<div class="prev"><span><i class="fas fa-angle-left"></i></span></div>',
        nextArrow: '<div class="next"><span><i class="fas fa-angle-right"></i></span></div>',
        slidesToShow: 1,
        slidesToScroll: 1,
        rtl: true,
    });

    $('.categories_slide').slick({
        dots: false,
        arrows: true,
        infinite: true,
        autoplay: true,
        autoplaySpeed: 2500,
        prevArrow: '<div class="arrow prev"><span><i class="fas fa-angle-left"></i></span></div>',
        nextArrow: '<div class="arrow next"><span><i class="fas fa-angle-right"></i></span></div>',
        slidesToShow: 5,
        slidesToScroll: 1,
        rtl: true,
        responsive: [{
            breakpoint: 1024,
            settings: {
                slidesToShow: 3,
                arrows: false,
            }
        },
        {
            breakpoint: 600,
            settings: {
                slidesToShow: 3,
                arrows: false,
            }
        },
        {
            breakpoint: 480,
            settings: {
                slidesToShow: 2,
                arrows: false,
            }
        }
        ]
    });

    $('.video_slide_v1').slick({
        dots: false,
        arrows: true,
        infinite: true,
        autoplay: true,
        autoplaySpeed: 2500,
        centerMode: $('.video_slide_v1 .grid_item').length > 5 ? true : false,
        slidesToShow: 5,
        slidesToScroll: 1,
        prevArrow: '<div class="arrow prev"><span><i class="flaticon-back"></i>Prev</span></div>',
        nextArrow: '<div class="arrow next"><span>Next<i class="flaticon-right"></i></span></div>',
        focusOnSelect: true,
        rtl: true,
        responsive: [{
            breakpoint: 1400,
            settings: {
                slidesToShow: 3
            }
        },
        {
            breakpoint: 1024,
            settings: {
                slidesToShow: 3
            }
        },
        {
            breakpoint: 768,
            settings: {
                slidesToShow: 3,
                arrows: false,
            }
        },
        {
            breakpoint: 600,
            settings: {
                slidesToShow: 2,
                arrows: false,
            }
        },
        {
            breakpoint: 480,
            settings: {
                slidesToShow: 1,
                arrows: false,
            }
        }
        ]
    });

    // nice slect init
    $('.olima_select').niceSelect();

    // lazyload init
    new LazyLoad();
})(window.jQuery);

$(window).on('load', function (event) {
    // Preloader JS
    $('.preloader').delay(500).fadeOut('500');
});
