(function ($) {
    "use strict";

    $(".more-ammenities a").on('click', function (e) {
        e.preventDefault();
        $(".checkboxes .show-more").removeClass('d-none');
        $(".checkboxes .show-more").addClass('d-block');
        $(this).hide();
    });

    // initialize date range picker
    $('#date-ranges').daterangepicker({
        opens: 'left',
        autoUpdateInput: false,
        locale: {
            format: 'YYYY-MM-DD'
        },
        minDate: new Date(),
    });


    // show the dates in input field when user select a date range
    $('#date-ranges').on('apply.daterangepicker', function (event, picker) {

        $(this).val(picker.startDate.format('YYYY-MM-DD') + ' - ' + picker.endDate.format('YYYY-MM-DD'));
    });

    // remove the dates when user click on cancel button
    $('#date-ranges').on('cancel.daterangepicker', function (event, picker) {
        $(this).val('');
    });

    var position = currency_info.base_currency_symbol_position;
    var symbol = currency_info.base_currency_symbol;

    // price range slider
    $('#price-range-slider').slider({
        range: true,
        min: minprice,
        max: maxprice,
        values: priceValues,
        slide: function (event, ui) {
            //while the slider moves, then this function will show that range value
            $('#amount').val((position == 'left' ? symbol : '') + ui.values[0] + (position == 'right' ? symbol : '') + ' - ' + (position == 'left' ? symbol : '') + ui.values[1] + (position == 'right' ? symbol : ''));
        }
    });

    // initially this is showing the price range value
    $('#amount').val((position == 'left' ? symbol : '') + $('#price-range-slider').slider('values', 0) + (position == 'right' ? symbol : '') + ' - ' + (position == 'left' ? symbol : '') + $('#price-range-slider').slider('values', 1) + (position == 'right' ? symbol : ''));
})(jQuery);
