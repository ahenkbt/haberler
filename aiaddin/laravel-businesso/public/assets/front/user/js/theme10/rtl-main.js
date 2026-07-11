'use strict';

$(window).on('load', function() {
    //===== Preloader
    $('#preloader').fadeOut(500);
});

$(function() {

    //===== 01. Main Menu
    function mainMenu() {
        // Variables
        var var_window = $(window),
            navContainer = $('.header-navigation'),
            navbarToggler = $('.navbar-toggler'),
            navMenu = $('.nav-menu'),
            navMenuLi = $('.nav-menu ul li ul li'),
            closeIcon = $('.navbar-close'),
            mainHeader = $(".header-area"),
            cloneItem = $(".mobile-item");

        mainHeader.find(cloneItem).clone(!0).appendTo(navMenu);

        // navbar toggler
        navbarToggler.on('click', function() {
            navbarToggler.toggleClass('active');
            navMenu.toggleClass('menu-on');
        });

        // close icon
        closeIcon.on('click', function() {
            navMenu.removeClass('menu-on');
            navbarToggler.removeClass('active');
        });

        // adds toggle button to li items that have children
        navMenu.find('li a').each(function() {
            if ($(this).next().length > 0) {
                $(this).parent('li').append('<span class="dd-trigger"><i class="far fa-angle-down"></i></span>');
            }
        });

        // expands the dropdown menu on each click
        navMenu.find('li .dd-trigger').on('click', function(e) {
            e.preventDefault();

            $(this).parent('li').children('ul').stop(true, true).slideToggle(350);
            $(this).parent('li').toggleClass('active');
        });

        // check browser width in real-time
        function breakpointCheck() {
            var windoWidth = $(window).width();

            if (windoWidth <= 991) {
                navContainer.addClass('breakpoint-on');
            } else {
                navContainer.removeClass('breakpoint-on');
            }
        }

        breakpointCheck();

        var_window.on('resize', function() {
            breakpointCheck();
        });
    };

    // Document Ready
    $(document).ready(function() {
        mainMenu();
    });

    //===== seller active slick slider
    $('.courses-active').slick({
        dots: false,
        infinite: true,
        autoplay: true,
        autoplaySpeed: 5000,
        arrows: true,
        prevArrow: '<span class="prev"><i class="fal fa-arrow-left"></i></span>',
        nextArrow: '<span class="next"><i class="fal fa-arrow-right"></i></span>',
        speed: 1500,
        slidesToShow: 3,
        slidesToScroll: 1,
        rtl: true,
        responsive: [{
                breakpoint: 1215,
                settings: {
                    slidesToShow: 2,
                }
            },
            {
                breakpoint: 1007,
                settings: {
                    slidesToShow: 1,
                }
            },
            {
                breakpoint: 591,
                settings: {
                    slidesToShow: 1,
                    arrows: false,
                }
            }
        ],
    });

    //===== testimonial slick slider
    $('.testimonials-active').slick({
        dots: false,
        infinite: true,
        autoplay: true,
        autoplaySpeed: 5000,
        arrows: true,
        prevArrow: '<span class="prev"><i class="fal fa-arrow-left"></i></span>',
        nextArrow: '<span class="next"><i class="fal fa-arrow-right"></i></span>',
        speed: 1500,
        slidesToShow: 1,
        slidesToScroll: 1,
        rtl: true,
        responsive: [{
            breakpoint: 992,
            settings: {
                arrows: false,
            }
        }],
    });

    //====== Magnific Popup
    $('.video-popup').magnificPopup({
        type: 'iframe'
    });

    //===== Magnific Popup
    $('.image-popup').magnificPopup({
        type: 'image',
        gallery: {
            enabled: true
        }
    });

    //===== counter up
    $('.counter').counterUp({
        delay: 10,
        time: 2000
    });

    //===== back to top
    $(window).on('scroll', function() {
        if ($(this).scrollTop() > 600) {
            $('.back-to-top').fadeIn(200);
        } else {
            $('.back-to-top').fadeOut(200);
        }
    });

    //===== animate the scroll to top
    $('.back-to-top').on('click', function(event) {
        event.preventDefault();

        $('html, body').animate({
            scrollTop: 0,
        }, 1500);
    });

    //===== niceSelect js
    $('select:not(.course-select)').niceSelect();

    //===== lazy load init
    new LazyLoad({});
});
