

/*---------------------------
	JS INDEX
	===================
	01. Main Menu
	02. OffCanvasMenu
	03. Banner Slider
	04. Bootstrap accordion
	05. Popup video
	06. Counter Up
	07. Team Slider
	08. Testimonial Slider
	09. Client Logo Slider
	10. Easy PieChart
	11. LaestPost Slider
	12. fact isotope activation
	13. Active Progress Bar
	14. Project Isotope
	15. Price Range
	16. Product Gallery Slider
	17. Related Product Slider
	18. Quantity Increment
	19. Back to top
	20. Sticky Header
	21. Preloader and init Wow
	22. Wow Js

-----------------------------*/

'use strict';

(function ($) {

	/*-----------------------------
	=== ALL ESSENTIAL FUNCTIONS ===
	------------------------------*/



	// ===== 02. OffCanvasMenu
	function offcanvasMenu() {
		// Set Click Function For open
		$('.offcanvas-toggler').on('click', function (e) {
			e.preventDefault();
			$('.offcanvas-wrapper').addClass('show-offcanvas');
			$('.offcanvas-overly').addClass('show-overly');
		});
		// Set Click Function For Close
		$('.offcanvas-close').on('click', function (e) {
			e.preventDefault();
			$('.offcanvas-overly').removeClass('show-overly');
			$('.offcanvas-wrapper').removeClass('show-offcanvas');
		});
		// Set Click Function on Overly For open on
		$('.offcanvas-overly').on('click', function (e) {
			$(this).removeClass('show-overly');
			$('.offcanvas-wrapper').removeClass('show-offcanvas');
		});
	}

	// ===== 03. Banner Slider
	if ($('#bannerSlider').length > 0) {
		function bannerSlider() {
			var banner = $('#bannerSlider');
			var bannerFirst = $('.single-banner:first-child');
	
			banner.on('init', function (e, slick) {
				var firstAnimatingElements = bannerFirst.find(
					'[data-animation]'
				);
				slideanimate(firstAnimatingElements);
			});
	
			banner.on('beforeChange', function (
				e,
				slick,
				currentSlide,
				nextSlide
			) {
				var animatingElements = $(
					'div.slick-slide[data-slick-index="' + nextSlide + '"]'
				).find('[data-animation]');
				slideanimate(animatingElements);
			});
	
			banner.slick({
				infinite: true,
				slidesToShow: 1,
				slidesToScroll: 1,
				autoplay: true,
				autoplaySpeed: 5000,
				speed: 500,
				arrows: true,
				fade: false,
				dots: false,
				swipe: true,
				adaptiveHeight: true,
				nextArrow: '<button class="slick-arrow next-arrow"><i class="fal fa-long-arrow-right"></i></button>',
				prevArrow: '<button class="slick-arrow prev-arrow"><i class="fal fa-long-arrow-left"></i></button>',
				rtl: rtl == 1 ? true : false,
				responsive: [{
					breakpoint: 768,
					settings: {
						arrows: false
					}
				}],
			});
		}
		bannerSlider();
	}

	function slideanimate(elements) {
		var animationEndEvents =
			'webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend';
		elements.each(function () {
			var $this = $(this);
			var animationDelay = $this.data('delay');
			var animationType = 'animated ' + $this.data('animation');
			$this.css({
				'animation-delay': animationDelay,
				'-webkit-animation-delay': animationDelay,
			});
			$this
				.addClass(animationType)
				.one(animationEndEvents, function () {
					$this.removeClass(animationType);
				});
		});
	}

	//===== electronics slide slick slider
	if ($('.slider-col-4').length > 0) {
    $('.slider-col-4').slick({
        dots: true,
        arrows: false,
        infinite: true,
        autoplay: true,
        autoplaySpeed: 2000,
        speed: 1000,
        slidesToShow: 4,
        slidesToScroll: 1,
        responsive: [
            {
                breakpoint: 1201,
                settings: {
                    slidesToShow: 3,
                }
        },
            {
                breakpoint: 992,
                settings: {
                    arrows: false,
                    slidesToShow: 3,
                }
        },
            {
                breakpoint: 768,
                settings: {
                    slidesToShow: 2,
                    slidesToScroll: 1,
                }
        },
            {
                breakpoint: 576,
                settings: {
                    slidesToShow: 1,
                    slidesToScroll: 1,
                }
        }
      ]

    });
	}
	// ===== 04. Bootstrap accordion
	function bootstrapAccordion() {
		$('.accordion').on('hide.bs.collapse show.bs.collapse', (e) => {
			$(e.target).prev().find('i').toggleClass('fa-minus fa-plus');
			$(e.target).prev().toggleClass('active-header');
		});
	}

	// ===== 05. Popup video
	function popupVideo() {
		$('.popup-video').magnificPopup({
			type: 'iframe',
		});
	}
	function popupImg() {
		$('.img-popup').magnificPopup({
			type: "image",
			gallery: {
				enabled: true
			}
		});
	}
	// ===== 06. Counter Up
	function counterToUp() {
		var factBox = $('.fact-box');
		factBox.each(function() {
			$(this).bind('inview', function (
				event,
				visible,
				visiblePartX,
				visiblePartY
			) {
				if (visible) {
					$(this)
						.find('.counter')
						.each(function () {
							var $this = $(this);
							$({
								Counter: 0
							}).animate({
								Counter: $this.text()
							}, {
								duration: 2000,
								easing: 'swing',
								step: function () {
									$this.text(Math.ceil(this.Counter));
								},
							});
						});
					$(this).unbind('inview');
				}
			});
		})
	}
	$(document).ready(function() {
		counterToUp();
	})
	// $(window).on("load", function() {
	// 	counterToUp();
	// })

	// ===== 07. Team Slider

	function teamSlider() {
		var slideOne = $('#teamSliderOne');
		slideOne.slick({
			infinite: true,
			slidesToShow: 4,
			slidesToScroll: 1,
			autoplay: true,
			autoplaySpeed: 5000,
			speed: 500,
			arrows: false,
			fade: false,
			dots: false,
			swipe: true,
			rtl: rtl == 1 ? true : false,
			responsive: [{
				breakpoint: 991,
				settings: {
					slidesToShow: 3,
				},
			},
			{
				breakpoint: 767,
				settings: {
					slidesToShow: 2,
				},
			},
			{
				breakpoint: 575,
				settings: {
					slidesToShow: 1,
				},
			}
			],
		});

		var slideTwo = $('#teamSliderTwo');
		slideTwo.slick({
			infinite: true,
			slidesToShow: 5,
			slidesToScroll: 1,
			autoplay: true,
			autoplaySpeed: 5000,
			speed: 500,
			arrows: false,
			fade: false,
			dots: false,
			swipe: true,
			rtl: rtl == 1 ? true : false,
			responsive: [{
				breakpoint: 1600,
				settings: {
					slidesToShow: 4,
				},
			},
			{
				breakpoint: 992,
				settings: {
					slidesToShow: 3,
				},
			},
			{
				breakpoint: 768,
				settings: {
					slidesToShow: 2,
				},
			},
			{
				breakpoint: 576,
				settings: {
					slidesToShow: 1,
					centerMode: true,
				},
			},
			],
		});
	}


	// ===== 08. Testimonial Slider
	function testimonialSlider() {
		var slideOne = $('#testimonialSliderOne');
		var arrowsHtml = $('.testimonial-arrows');
		slideOne.slick({
			infinite: true,
			slidesToShow: 1,
			slidesToScroll: 1,
			autoplay: true,
			autoplaySpeed: 5000,
			speed: 500,
			arrows: true,
			fade: false,
			dots: false,
			swipe: true,
			appendArrows: arrowsHtml,
			rtl: rtl == 1 ? true : false,
			nextArrow: '<div class="col-12 order-1"><button class="slick-arrow next-arrow"><i class="fal fa-long-arrow-right"></i></button></div>',
			prevArrow: '<div class="col-12 order-2"><button class="slick-arrow prev-arrow"><i class="fal fa-long-arrow-left"></i></button></div>',
		});

		var slideTwo = $('#testimonialSliderTwo');
		var slideDots = $('.testimonial-dots');
		slideTwo.slick({
			infinite: true,
			slidesToShow: 1,
			slidesToScroll: 1,
			autoplay: true,
			autoplaySpeed: 5000,
			speed: 500,
			arrows: true,
			fade: false,
			dots: true,
			swipe: true,
			nextArrow: '<button class="slick-arrow next-arrow"><i class="fal fa-long-arrow-right"></i></button>',
			prevArrow: '<button class="slick-arrow prev-arrow"><i class="fal fa-long-arrow-left"></i></button>',
			appendDots: slideDots,
			rtl: rtl == 1 ? true : false,
			responsive: [
				{
					breakpoint: 991,
					settings: {
						arrows: false
					}
				},
				{
					breakpoint: 576,
					settings: {
						arrows: false
					}
				}],
			customPaging: function (slick, index) {
				var portrait = $(slick.$slides[index]).data('thumb');
				return '<img src=" ' + portrait + ' "/>';
			},
		});

		var slideThree = $('#testimonialSliderThree');
		slideThree.slick({
			infinite: true,
			slidesToShow: 1,
			slidesToScroll: 1,
			autoplay: true,
			autoplaySpeed: 5000,
			speed: 500,
			arrows: true,
			fade: false,
			dots: false,
			swipe: true,
			nextArrow: '<button class="slick-arrow next-arrow"><i class="fal fa-long-arrow-right"></i></button>',
			prevArrow: '<button class="slick-arrow prev-arrow"><i class="fal fa-long-arrow-left"></i></button>',
			rtl: rtl == 1 ? true : false,
			responsive: [{
				breakpoint: 576,
				settings: {
					arrows: false
				}
			}],
		});

	}

	// ===== 09. Client Logo Slider
	function clientSlider() {
		var slide = $('#clientSlider');
		slide.slick({
			infinite: true,
			slidesToShow: 5,
			slidesToScroll: 1,
			autoplay: true,
			autoplaySpeed: 5000,
			speed: 500,
			arrows: false,
			fade: false,
			dots: false,
			swipe: true,
			rtl: rtl == 1 ? true : false,
			responsive: [{
				breakpoint: 991,
				settings: {
					slidesToShow: 4,
				},
			},
			{
				breakpoint: 767,
				settings: {
					slidesToShow: 3,
				},
			},
			{
				breakpoint: 576,
				settings: {
					slidesToShow: 2,
				},
			},
			{
				breakpoint: 400,
				settings: {
					slidesToShow: 1,
				},
			},
			],
		});
	}

	// ===== 10. Easy PieChart
	function easypieChart() {
		$('.chart-box').bind('inview', function (
			event,
			visible,
			visiblePartX,
			visiblePartY
		) {
			if (visible) {
				$('.chart').easyPieChart({
					scaleLength: 0,
					lineWidth: 30,
					trackWidth: 20,
					size: 220,
					lineCap: 'square',
					rotate: 360,
					trackColor: '#e8e8e8',
					barColor: '#ff4a17',
				});
				$(this).unbind('inview');
			}
		});
	}

	// ===== 11. LaestPost Slider
	function latestPostSlider() {
		var slide = $('#latestPostSlider');
		slide.slick({
			infinite: true,
			slidesToShow: 4,
			slidesToScroll: 1,
			autoplay: true,
			autoplaySpeed: 5000,
			speed: 500,
			arrows: false,
			fade: false,
			dots: false,
			swipe: true,
			nextArrow: '<div class="col-12 order-1"><button class="slick-arrow next-arrow"><i class="fal fa-long-arrow-right"></i></button></div>',
			prevArrow: '<div class="col-12 order-2"><button class="slick-arrow prev-arrow"><i class="fal fa-long-arrow-left"></i></button></div>',
			rtl: rtl == 1 ? true : false,
			responsive: [{
				breakpoint: 1600,
				settings: {
					slidesToShow: 3,
				},
			},
			{
				breakpoint: 992,
				settings: {
					slidesToShow: 2,
				},
			},
			{
				breakpoint: 576,
				settings: {
					slidesToShow: 1,
					centerMode: true,
					centerPadding: '10%',
				},
			},
			{
				breakpoint: 400,
				settings: {
					slidesToShow: 1,
					centerMode: false,
				},
			},
			],
		});
	}



	// ===== 13. Active Progress Bar
	function progressBar() {
		$('.skill-progress-bars').bind('inview', function (
			event,
			visible,
			visiblePartX,
			visiblePartY
		) {
			if (visible) {
				$.each($('div.progressbar'), function () {
					$(this).css('width', $(this).attr('data-width') + '%');
				});
				$(this).unbind('inview');
			}
		});
	}

	// ===== 14. Project Isotope
	
	function projectIsotope() {
		var items = $('.project-isotope').isotope({
			itemSelector: '.isotope-item',
			percentPosition: true,
			isOriginLeft: rtl == 1 ? false : true,
			masonry: {
				columnWidth: '.isotope-item',
			},
		});
		// items on button click
		$('.project-isotope-filter').on('click', 'li', function () {
			var filterValue = $(this).attr('data-filter');
			items.isotope({
				filter: filterValue
			});
		});
		// menu active class
		$('.project-isotope-filter li').on('click', function (event) {
			$(this).siblings('.active').removeClass('active');
			$(this).addClass('active');
			event.preventDefault();
		});
	}
	


	$(window).on('load', function (event) {

		var dir = $('html').attr('dir') === 'rtl' ? 1 : 0;
		// popup js
		if ($('.popup-wrapper').length > 0) {
			let $firstPopup = $('.popup-wrapper').eq(0);

			appearPopup($firstPopup);
		}

		// Preloader JS
		$('.preloader').delay(500).fadeOut('500');

		
			// items on button click
			$('.filter-btn').on('click', 'li', function () {
				var filterValue = $(this).attr('data-filter');
				$grid.isotope({
					filter: filterValue
				});
			});

			// menu active class
			$('.filter-btn li').on('click', function (e) {
				$(this).siblings('.active').removeClass('active');
				$(this).addClass('active');
				e.preventDefault();
			});

			var $grid = $('.masonry-row').isotope({
				itemSelector: '.gallery-column',
				percentPosition: true,
				originLeft: dir == 1 ? false : true,
				masonry: {
					columnWidth: 1
				}
			});
		
	});

	// ===== 15. Price Range
	function priceRange() {
		$('#slider-range').slider({
			range: true,
			min: 40,
			max: 600,
			values: [60, 570],
			slide: function (event, ui) {
				$('#amount').val('$' + ui.values[0] + ' - $' + ui.values[1]);
			}
		});
		$('#amount').val(
			'$' +
			$('#slider-range').slider('values', 0) +
			' - $' +
			$('#slider-range').slider('values', 1)
		);
	}

	// ===== 16. Product Gallery Slider
	function gallerySlider() {
		var galleryDots = $('.product-gallery-arrow');
		$('.product-gallery-slider').slick({
			slidesToShow: 1,
			slidesToScroll: 1,
			infinite: true,
			autoplay: true,
			autoplaySpeed: 6000,
			arrows: true,
			nextArrow: '<button class="slick-arrow next-arrow"><i class="fal fa-long-arrow-right"></i></button>',
			prevArrow: '<button class="slick-arrow prev-arrow"><i class="fal fa-long-arrow-left"></i></button>',
			dots: true,
			appendDots: galleryDots,
			rtl: rtl == 1 ? true : false,
			customPaging: function (slick, index) {
				var portrait = $(slick.$slides[index]).data('thumb');
				return '<img src=" ' + portrait + ' "/>';
			},
		});
	}

	// ===== 17. Related Product Slider
	function realatedProSLider() {
		var slider = $('.related-product-slider');
		slider.slick({
			slidesToShow: 4,
			slidesToScroll: 1,
			infinite: true,
			autoplay: true,
			autoplaySpeed: 6000,
			arrows: false,
			dots: false,
			rtl: rtl == 1 ? true : false,
			responsive: [{
				breakpoint: 992,
				settings: {
					slidesToShow: 3,
				},
			},
			{
				breakpoint: 768,
				settings: {
					slidesToShow: 2,
				},
			},
			],
		});
	}

	if ($('.portfolio-details-slider').length > 0) {

		$('.portfolio-details-slider').slick({
			slidesToShow: 1,
			slidesToScroll: 1,
			infinite: true,
			autoplay: true,
			autoplaySpeed: 6000,
			arrows: true,
			nextArrow: '<button class="slick-arrow next-arrow"><i class="fal fa-long-arrow-right"></i></button>',
			prevArrow: '<button class="slick-arrow prev-arrow"><i class="fal fa-long-arrow-left"></i></button>',
			dots: false,
			rtl: rtl == 1 ? true : false
		});
	}

	// ===== 18. Quantity Increment

	$(document).on('click', '.quantity-down', function () {
		var numProduct = Number($(this).next().val());
		if (numProduct > 0) $(this).next().val(numProduct - 1);
	});

	$(document).on('click', '.quantity-up', function () {
		var numProduct = Number($(this).prev().val());
		$(this).prev().val(numProduct + 1);
	});


	// ===== 19. Back to top
	function gtToTop() {
		$('.back-to-top').on('click', function (e) {
			$('html, body').animate({
				scrollTop: '0',
			},
				1200
			);
			e.preventDefault();
		});
	}

	// ===== 20. Sticky Header
	function stickyHeader() {
		var sticky = $('header.sticky-header, .header-sticky');
		var scrollFromtop = $(window).scrollTop();
		var scrollLimit = $('header').height() + 10;

		if (scrollFromtop < scrollLimit) {
			sticky.removeClass('sticky-on');
		} else {
			sticky.addClass('sticky-on');
		}
	}

	/*---------------------
	=== DOCUMENT READY  ===
	----------------------*/

	// ===== 01. Main Menu
	function mianMenu() {
		// Variables
		var var_window = $(window),
			navContainer = $('.mobile-rs-nav'),
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
						'<span class="dd-trigger"><i class="fal fa-angle-down"></i></span>'
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
			if (windoWidth <= 1199) {
				navContainer.addClass('breakpoint-on');
			} else {
				navContainer.removeClass('breakpoint-on');
			}

			if (windoWidth <= 767) {
				navContainer.find(pushItem).clone(!0).appendTo(pushedWrap);
				pushItem.hide();
			} else {
				pushedWrap.html(pushBlank);
				pushItem.show();
			}
		}

		breakpointCheck();
		var_window.on('resize', function () {
			breakpointCheck();
		});
	}

	if (theme != 'home_six') {
		mianMenu();
	}
	offcanvasMenu()
	// bannerSlider()
	bootstrapAccordion()
	popupVideo()
	// counterToUp()
	teamSlider()
	testimonialSlider()
	clientSlider()
	easypieChart()
	latestPostSlider()
	progressBar()
	projectIsotope()
	priceRange()
	gallerySlider()
	realatedProSLider()
	gtToTop()
	popupImg()
	/*--------------------
	=== WINDOW SCROLL  ===
	----------------------*/
	$(window).on('scroll', function () {
		stickyHeader()
	});

	if ($('.datepicker').length > 0) {
		$('.datepicker').datepicker({
			autoclose: true
		});
	}

	if ($('.timepicker').length > 0) {
		$('.timepicker').timepicker();
	}

	// Product details page
	var arrowBody = $(".product-gallery-arrow");
    var arrowList = $(".product-gallery-arrow .slick-dots li");

    if (arrowList.length > 3) {
        arrowBody.toggleClass("overflow")
    }

    // Dashboard dropdown menu
    //===== Main menu toggle
    $(".user-sidebar .menu-item-has-children>a").on("click", function (t) {
        var i = $(this).closest("li"),
            o = i.find("ul").eq(0);

        if (i.hasClass("open")) {
            o.slideUp(300, function () {
                i.removeClass("open")
            })
        } else {
            o.slideDown(300, function () {
                i.addClass("open")
            })
        }
        t.stopPropagation(), t.preventDefault()
    })
})(jQuery);

$(window).on('load', function () {
	if ($('#preloader').length > 0) {
		$('#preloader').fadeOut(500);
	}

	// ===== 12. fact isotope activation
	function factIsotope() {
		$('#factIsotpe').isotope();
	}

	factIsotope()

	// ===== 22. Wow Js
	new WOW().init();
});

$(document).ready(function () {
	// lazy load init
	var lazyLoadInstance = new LazyLoad();
})


