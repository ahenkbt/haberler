'use strict';

function setMarginTop() {
    if ($(".course-details-sidebar").length > 0 && $(".course-details-area").length > 0) {
        if ($(window).width() > 991) {
            let marginTop = $(".course-title-content").offset().top - $(".course-details-items").offset().top;
            $(".course-details-area .course-details-sidebar").css("margin-top", marginTop + 'px');
        } else {
            $(".course-details-area .course-details-sidebar").css("margin-top", '40px');
        }
    }
}

// Send the token to your server
function stripeTokenHandler(token) {
    // Add the token to the form data before submitting to the server
    var form = document.getElementById('my-checkout-form');
    var hiddenInput = document.createElement('input');
    hiddenInput.setAttribute('type', 'hidden');
    hiddenInput.setAttribute('name', 'stripeToken');
    hiddenInput.setAttribute('value', token.id);
    form.appendChild(hiddenInput);

    // Submit the form to your server
    form.submit();
}

var getHeaderHeight = function () {
    var header = $("header.header-three, .absolute-header"),
        headerHeight = header.height(),
        headerNext = header.next(".course-title-area")

    headerNext.css({
        "margin-top": headerHeight
    })
}
getHeaderHeight();

$(window).on('resize', function () {
    getHeaderHeight();
});

//====== Magnific Popup
if ($('.video-popup').length) {
    $('.video-popup').magnificPopup({
        type: 'iframe'
    });
}

//====== Nice Select
// if ($('.course-select').length) {
//     $('.course-select').niceSelect();
// }

$(document).ready(function () {
    $('#stripe-element').addClass('d-none');
});

$(document).ready(function () {


    if (sessionStorage.getItem('course_id')) {
        let id = parseInt(sessionStorage.getItem('course_id'));

        if (courseId === id) {
            if (sessionStorage.getItem('new_price')) {
                $('#discount-price').text(parseFloat(sessionStorage.getItem('new_price')).toFixed(2));
                $('#discount-info').removeClass('d-none');
                if (sessionStorage.getItem('new_price') == 0) {
                    $("#payment-gateway").next(".nice-select").removeClass('d-block');
                    $("#payment-gateway").next(".nice-select").addClass('d-none');
                    $("#payment-gateway").removeClass('d-block');
                    $("#payment-gateway").addClass('d-none');
                }
            }
        }
    }

    $('select[name="gateway"]').on('change', function () {
        let value = $(this).val();
        let dataType = parseInt(value);

        if (isNaN(dataType)) {
            if ($('.offline-gateway-info').hasClass('d-block')) {
                $('.offline-gateway-info').removeClass('d-block');
            }

            // hide offline gateway informations
            $('.offline-gateway-info').addClass('d-none');

            // show or hide stripe card inputs
            if (value == 'stripe') {
                // show or hide stripe card inputs
                $('#stripe-element').removeClass('d-none');
                $('.iyzico-element').addClass('d-none');
            } else if (value == 'iyzico') {
                $('.iyzico-element').removeClass('d-none');
                $('#stripe-element').addClass('d-none');
            } else {
                $('#stripe-element').addClass('d-none');
                $('.iyzico-element').addClass('d-none');
            }
            // show or hide stripe card inputs
            if (value == 'authorize.net') {
                $('#authorize-net-input').removeClass('d-none');
            } else {
                $('#authorize-net-input').addClass('d-none');
            }
        } else {
            // hide stripe gateway card inputs
            if (!$('#stripe-element').hasClass('d-none')) {
                $('#stripe-element').addClass('d-none');
            }
            if (!$('#authorize-net-input').hasClass('d-none')) {
                $('#authorize-net-input').addClass('d-none');
            }

            // hide offline gateway informations
            $('.offline-gateway-info').addClass('d-none');

            // show particular offline gateway informations
            $('#offline-gateway-' + value).removeClass('d-none');
        }
    });

    // get discount amount & apply the coupon by clicking on 'Apply' button
    $('#coupon-btn').on('click', function (event) {
        event.preventDefault();

        let code = $('#coupon-code').val();

        if (code) {
            applyCoupon(code, courseId);
        } else {
            alert('Please enter your coupon code.');
        }
    });

    $('#coupon-code').on('keypress', function (event) {
        if (event.which == 13) {
            event.preventDefault();

            let code = $(this).val();

            if (code) {
                applyCoupon(code, courseId);
            } else {
                alert('Please enter your coupon code.');
            }
        }
    });

    // get the rating (star) value in integer
    $('.review-value span').on('click', function () {
        let ratingValue = $(this).attr('data-ratingVal');

        // first, remove star color from all the 'review-value' class
        $('.review-value span').css('color', '');

        // second, add star color to the selected parent class
        let parentClass = 'review-' + ratingValue;
        $('.' + parentClass + ' span').css('color', '#FEA116');

        // finally, set the rating value to a hidden input field
        $('#rating-id').val(ratingValue);
    });

    setMarginTop();
});

$(window).on('resize', function () {
    setMarginTop();
});


function applyCoupon(couponCode, courseId) {
    const url = couponUrl;

    let data = {
        coupon: couponCode,
        id: courseId,
        _token: document.querySelector('meta[name="csrf-token"]').getAttribute('content')
    };

    $.post(url, data, function (response) {
        if ('success' in response) {
            let new_price = response.newPrice;
            sessionStorage.setItem('course_id', courseId);
            sessionStorage.setItem('new_price', new_price);

            $('#discount-price').text(new_price.toFixed(2));
            $('#discount-info').removeClass('d-none');
            $('#coupon-code').val('');

            if (sessionStorage.getItem('new_price') == 0) {
                $("#payment-gateway").next(".nice-select").removeClass('d-block');
                $("#payment-gateway").next(".nice-select").addClass('d-none');
            } else {
                $("#payment-gateway").next(".nice-select").removeClass('d-none');
                $("#payment-gateway").next(".nice-select").addClass('d-block');
            }

            $('select').niceSelect();

            toastr['success'](response.success);
        } else if ('error' in response) {
            toastr['error'](response.error);
        }
    });
}
//stripe init start
if (!!stripe_key) {
    // Set your Stripe public key
    var stripe = Stripe(stripe_key);

    // Create a Stripe Element for the card field
    var elements = stripe.elements();
    var cardElement = elements.create('card', {
        style: {
            base: {
                iconColor: '#454545',
                color: '#454545',
                fontWeight: '500',
                lineHeight: '50px',
                fontSmoothing: 'antialiased',
                backgroundColor: '#f2f2f2',
                ':-webkit-autofill': {
                    color: '#454545',
                },
                '::placeholder': {
                    color: '#454545',
                },
            }
        },
    });

    // Add an instance of the card Element into the `card-element` div
    cardElement.mount('#stripe-element');

    // Handle form submission
    var form = document.getElementById('my-checkout-form');



}
//stripe init end
$(document).ready(function () {
    $("#enrol-btn").on('click', function (e) {
        e.preventDefault();
        let val = $("#payment-gateway").val();
        if (val == 'authorize.net') {
            sendPaymentDataToAnet();
        } else if (val == 'stripe') {
            stripe.createToken(cardElement).then(function (result) {
                if (result.error) {
                    // Display errors to the customer
                    var errorElement = document.getElementById('stripe-errors');
                    errorElement.textContent = result.error.message;

                } else {
                    // Send the token to your server
                    stripeTokenHandler(result.token);
                }
            });
        } else {
            $("#my-checkout-form").submit();
        }
    });
});

function sendPaymentDataToAnet() {
    // Set up authorisation to access the gateway.
    var authData = {};
    authData.clientKey = clientKey;
    authData.apiLoginID = apiLoginID;

    var cardData = {};
    cardData.cardNumber = document.getElementById("anetCardNumber").value;
    cardData.month = document.getElementById("anetExpMonth").value;
    cardData.year = document.getElementById("anetExpYear").value;
    cardData.cardCode = document.getElementById("anetCardCode").value;

    // Now send the card data to the gateway for tokenization.
    // The responseHandler function will handle the response.
    var secureData = {};
    secureData.authData = authData;
    secureData.cardData = cardData;
    Accept.dispatchData(secureData, responseHandler);
}

function responseHandler(response) {
    if (response.messages.resultCode === "Error") {
        var i = 0;
        let errorLists = ``;
        while (i < response.messages.message.length) {
            errorLists += `<li class="text-danger">${response.messages.message[i].text}</li>`;

            i = i + 1;
        }
        $("#anetErrors").show();
        $("#anetErrors").html(errorLists);
    } else {
        paymentFormUpdate(response.opaqueData);
    }
}

function paymentFormUpdate(opaqueData) {
    document.getElementById("opaqueDataDescriptor").value = opaqueData.dataDescriptor;
    document.getElementById("opaqueDataValue").value = opaqueData.dataValue;
    document.getElementById("my-checkout-form").submit();
}







