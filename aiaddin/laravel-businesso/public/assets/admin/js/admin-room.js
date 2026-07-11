(function ($) {
  'use strict';

  let selected_dates;
  let num_of_nights;
  let subtotal;
  let discount;
  let total;

  $(window).on('load', function () {

    if ($('#date-range').length > 0) {
      selected_dates = $('#date-range').val();
    }

    if ($('#night').length > 0) {
      num_of_nights = $('#night').val();
    }

    if ($('#subtotal').length > 0) {
      subtotal = $('#subtotal').val();
    }

    if ($('#discount').length > 0) {
      discount = $('#discount').val();
    }

    if ($('#total').length > 0) {
      total = $('#total').val();
    }
  });


  $('#roomForm').on('submit', function (e) {
    $('.request-loader').addClass('show');
    e.preventDefault();

    let action = $('#roomForm').attr('action');
    let fd = new FormData(document.querySelector('#roomForm'));

    $.ajax({
      url: action,
      method: 'POST',
      data: fd,
      contentType: false,
      processData: false,
      success: function (data) {
        $('.request-loader').removeClass('show');

        if (data == 'success') {
          location.reload(true);
        }
      },
      error: function (error) {
        $('#roomErrors').show();
        let errors = ``;

        for (let x in error.responseJSON.errors) {
          errors += `<li>
                <p class="text-danger mb-0">${error.responseJSON.errors[x][0]}</p>
              </li>`;

        }


        $('#roomErrors ul').html(errors);

        $('.request-loader').removeClass('show');

        $('html, body').animate({
          scrollTop: $('#roomErrors').offset().top - 100
        }, 1000);
      }
    });
  });


  /*******************************************************
  ==========Room Booking with AJAX Request Start==========
  *******************************************************/
  $('#roomBookingNextBtn').on('click', function (e) {
    $(e.target).attr('disabled', true);
    $('.request-loader').addClass('show');

    let action = $('#roomSelectForm').attr('action');
    let roomId = $('#selected-room').val();

    $.get(action, { room_id: roomId }, function (response) {
      if ('success' in response) {
        $('.request-loader').removeClass('show');
        $(e.target).attr('disabled', false);

        $('.em').each(function () {
          $(this).html('');
        });

        let url = response.success;

        window.location = url;
      } else if ('error' in response) {
        $('.em').each(function () {
          $(this).html('');
        });

        let errMsg = response.error.room_id[0];

        $('#err_room_id').text(errMsg);

        $('.request-loader').removeClass('show');
        $(e.target).attr('disabled', false);
      }
    });
  });
  /*****************************************************
  ==========Room Booking with AJAX Request End==========
  *****************************************************/


  /**************************************************************
  ==========Form Prepopulate After Clicking Mail Button Start====
  **************************************************************/
  $('.mailBtn').on('click', function () {
    let info = $(this).data();

    $('#mail-id').val(info.customer_email);
  });
  /**************************************************************
  ==========Form Prepopulate After Clicking Mail Button End======
  **************************************************************/


  // initialize date range picker
  let dateArray;

  if (typeof bookedDates != 'undefined') {
    dateArray = bookedDates;
  } else {
    dateArray = [];
  }

  $('#date-range').daterangepicker({
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
    }
  });

  // show the dates and number of nights in input field when user select a date range
  $('#date-range').on('apply.daterangepicker', function (event, picker) {
    $(this).val(picker.startDate.format('YYYY-MM-DD') + ' - ' + picker.endDate.format('YYYY-MM-DD'));

    // get the difference of two dates, date should be in 'YYYY-MM-DD' format
    let dates = $(this).val();

    // first, slice the string and get the arrival_date & departure_date
    let arrOfDate = dates.split(' ');
    let arrival_date = arrOfDate[0];
    let departure_date = arrOfDate[2];

    // parse the strings into date using Date constructor
    arrival_date = new Date(arrival_date);
    departure_date = new Date(departure_date);

    // get the time difference (in millisecond) of two dates
    let difference_in_time = departure_date.getTime() - arrival_date.getTime();

    // finally, get the night difference of two dates (convert time to night)
    let difference_in_night = difference_in_time / (1000 * 60 * 60 * 24);

    $('#night').val(difference_in_night);

    // rent calculation
    let subtotalCost = difference_in_night * parseFloat(roomRentPerNight);

    $('#subtotal').val(subtotalCost.toFixed(2));

    let discountCost = $('#discount').val();

    let totalCost = subtotalCost - parseFloat(discountCost);

    $('#total').val(totalCost.toFixed(2));
  });

  // remove the dates and number of nights when user click on cancel button
  $('#date-range').on('cancel.daterangepicker', function (event, picker) {
    $(this).val(selected_dates);
    $('#night').val(num_of_nights);
    $('#subtotal').val(subtotal);
    $('#discount').val(discount);
    $('#total').val(total);
  });
})(jQuery);


function applyDiscount(event) {
  let roomSubtotal = $('#subtotal').val();

  let newDiscount = $('#discount').val();

  let newTotal = parseFloat(roomSubtotal) - parseFloat(newDiscount);

  if (isNaN(newTotal)) {
    $('#total').val('0.00');
  } else {
    $('#total').val(newTotal.toFixed(2));
  }
}
