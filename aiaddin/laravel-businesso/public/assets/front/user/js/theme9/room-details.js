var objOfData = { minimumFractionDigits: 2, maximumFractionDigits: 2 };

(function ($) {
  'use strict';

  var dateArray = bookingDates;

  // initialize date range picker
  $('#date-ranged').daterangepicker({
    opens: 'left',
    autoUpdateInput: false,
    locale: {
      format: 'YYYY-MM-DD'
    },
    isInvalidDate: function (date) {
      for (let index = 0; index < dateArray.length; index++) {
        if (date.format('YYYY-MM-DD') == dateArray[index]) {
          return true;
        }
      }
    },
    minDate: new Date(),
  });


  // show the dates and number of nights in input field when user select a date range
  $('#date-ranged').on('apply.daterangepicker', function (event, picker) {
    $(this).val(picker.startDate.format('YYYY-MM-DD') + ' - ' + picker.endDate.format('YYYY-MM-DD'));

    // get the difference of two dates, date should be in 'YYYY-MM-DD' format
    var dates = $(this).val();

    // first, slice the string and get the arrival_date & departure_date
    var arrOfDate = dates.split(' ');
    var arrival_date = arrOfDate[0];
    var departure_date = arrOfDate[2];

    // parse the strings into date using Date constructor
    arrival_date = new Date(arrival_date);
    departure_date = new Date(departure_date);

    // get the time difference (in millisecond) of two dates
    var difference_in_time = departure_date.getTime() - arrival_date.getTime();

    // finally, get the night difference of two dates (convert time to night)
    var difference_in_night = difference_in_time / (1000 * 60 * 60 * 24);

    $('#night').val(difference_in_night);

    // calculate room rent
    var totalRent = difference_in_night * parseFloat(roomRentPerNight);

    $('#subtotal-amount').text(totalRent.toLocaleString(undefined, objOfData));
    $('#total-amount').text(totalRent.toLocaleString(undefined, objOfData));
  });

  // remove the dates and number of nights when user click on cancel button
  $('#date-ranged').on('cancel.daterangepicker', function (event, picker) {
    $(this).val('');
    $('#night').val('');
    $('#subtotal-amount').text('0.00');
    $('#total-amount').text('0.00');
  });

  $(document).ready(function () {
    $('#stripe-element').addClass('d-none');
  })


  // show or hide the attachment input field for offline payment gateway
  $('#payment-gateways').on('change', function () {
    // get the selected offline payment gateway id
    var gatewayId = $(this).val();

    if (gatewayId == 'stripe') {

      // show or hide stripe card inputs
      $('#stripe-element').removeClass('d-none');
      $('.iyzico-element').addClass('d-none');

      $("#tab-stripe").removeClass('d-none');
      $("#tab-stripe").addClass('d-block');

      $('#gateway-description').removeClass('d-block');
      $('#gateway-description').addClass('d-none');
      $('#gateway-instruction').removeClass('d-block');
      $('#gateway-instruction').addClass('d-none');
      $('#gateway-attachment').removeClass('d-block');
      $('#gateway-attachment').addClass('d-none');
    } else if (gatewayId == 'iyzico') {
      // show or hide stripe card inputs
      $('.iyzico-element').removeClass('d-none');
      $("#tab-stripe").addClass('d-none');
      $('#gateway-description').removeClass('d-block');
      $('#gateway-description').addClass('d-none');
      $('#gateway-instruction').removeClass('d-block');
      $('#gateway-instruction').addClass('d-none');
      $('#gateway-attachment').removeClass('d-block');
      $('#gateway-attachment').addClass('d-none');
    } else {
      $('#stripe-element').addClass('d-none');
      $("#tab-stripe").removeClass('d-block');
      $("#tab-stripe").addClass('d-none');
      $('.iyzico-element').addClass('d-none');

      // change string type to integer type
      gatewayId = parseInt(gatewayId);

      // loop to check which element's id match with selected offline payment's id
      for (var key in offlineGateways) {
        if (Object.hasOwnProperty.call(offlineGateways, key)) {
          var elementId = offlineGateways[key].id;

          if (elementId == gatewayId) {
            if (offlineGateways[key].short_description.length > 0) {
              $('#gateway-description').removeClass('d-none');
              $('#gateway-description').html(offlineGateways[key].short_description);
            } else {
              $('#gateway-description').addClass('d-none');
            }

            if (offlineGateways[key].instructions.length > 0) {

              $('#gateway-instruction').removeClass('d-none');
              $('#gateway-instruction').html(offlineGateways[key].instructions);
            } else {
              $('#gateway-instruction').addClass('d-none');
            }

            if (offlineGateways[key].attachment_status == 1) {
              $('#gateway-attachment').removeClass('d-none');
            } else {
              $('#gateway-attachment').addClass('d-none');
            }
            break;
          } else {
            $('#gateway-description').addClass('d-none');
            $('#gateway-instruction').addClass('d-none');
            $('#gateway-attachment').addClass('d-none');
          }
        }
      }
    }
  });


  // get the rating (star) value in integer
  $('.review-value li a').on('click', function () {
    var ratingValue = $(this).attr('data-ratingVal');

    // first, remove star color from all the 'review-value' class
    $('.review-value li a i').removeClass('text-warning');

    // second, add star color to the selected parent class
    var parentClass = 'review-' + ratingValue;
    $('.' + parentClass + ' li a i').addClass('text-warning');

    // finally, set the rating value to a hidden input field
    $('#ratingId').val(ratingValue);
  });


  $('#coupon-code').on('keypress', function (e) {
    let key = e.which;

    if (key == 13) {
      applyCoupon(e);
    }
  });
})(jQuery);

function applyCoupon(event) {
  event.preventDefault();

  let code = $('#coupon-code').val();
  let subtotal = $('#subtotal-amount').text();
  let id = $('#room-id').text();

  if (code) {
    let url = cUrl;

    let data = {
      coupon: code,
      initTotal: subtotal,
      roomId: id,
      _token: document.querySelector('meta[name="csrf-token"]').getAttribute('content')
    };

    $.post(url, data, function (response) {
      if ('success' in response) {
        $('#coupon-code').val('');

        var discount = response.discount;
        var total = response.total;

        $('#discount-amount').text(discount.toLocaleString(undefined, objOfData));
        $('#total-amount').text(total.toLocaleString(undefined, objOfData));

        toastr['success'](response.success);
      } else if ('error' in response) {
        toastr['error'](response.error);
      }
    });
  } else {
    alert('Please enter your coupon code.');
  }
}

$(function () {
  // Room Details Slider
  $('.main-slider').slick({
    dots: false,
    infinite: false,
    autoplay: false,
    autoplaySpeed: 3000,
    arrows: true,
    slidesToShow: 1,
    slidesToScroll: 1,
    rtl: rtl == 1 ? true : false,
    asNavFor: '.dots-slider',
    prevArrow: '<span class="prev"><i class="fal fa-angle-double-left"></i></span>',
    nextArrow: '<span class="next"><i class="fal fa-angle-double-right"></i></span>'
  });
  $('.dots-slider').slick({
    infinite: false,
    autoplay: false,
    autoplaySpeed: 3000,
    arrows: false,
    slidesToShow: 6,
    slidesToScroll: 1,
    asNavFor: '.main-slider',
    dots: false,
    focusOnSelect: true,
    rtl: rtl == 1 ? true : false,
    responsive: [{
      breakpoint: 576,
      settings: {
        slidesToShow: 3
      }
    }]
  });

  // Room Details Slider Image Popup
  $('.main-slider').each(function () {
    // the containers for all your galleries
    var additionalImages = $('.single-img a.main-img').not(
      '.slick-slide.slick-cloned a.main-img'
    );
    additionalImages.magnificPopup({
      type: 'image',
      gallery: {
        enabled: true
      },
      mainClass: 'mfp-fade'
    });
  });

});

