function setAmount(min, amount) {
  $("#custom_amount").val(amount);
}

function infoSectionToggle() {
  let selectedPaymentMethod = $("#payment-gateway").children("option:selected").val();
  if (selectedPaymentMethod == 'iyzico') {
    $('#donation-info-section').fadeIn(5);
  } else {
    if ($('input[type="checkbox"]:checked').length > 0 && selectedPaymentMethod != 'PayUmoney') {
      $('#donation-info-section').fadeOut();
    } else {
      $('#donation-info-section').fadeIn(5);
    }

  }
}
$(document).ready(function () {
  $('input[type="checkbox"]').click(function () {
    infoSectionToggle();
  })
});

$(document).ready(function () {
  $('#stripe-element').addClass('d-none');
})

$(document).ready(function () {
  $('input[type="checkbox"]').click(function () {
    var selectedPaymentMethod = $('select[name="gateway"]').children("option:selected").val();

    if ($(this).prop("checked") == true) {
      if (selectedPaymentMethod == "paystack") {
        $('#stripe-element').addClass('d-none');

        $('#paytm-section').removeClass('d-none');
        $('#paytm-section').addClass('d-none');

        $('#authorize-net-input').removeClass('d-block');
        $('#authorize-net-input').addClass('d-none');

        $('#razorpay-section').removeClass('d-block');
        $('#razorpay-section').addClass('d-none');

        $('#flutterwave-section').removeClass('d-block');
        $('#flutterwave-section').addClass('d-none');

        $('#paystack-section').removeClass('d-none');
      } else if (selectedPaymentMethod == "flutterwave") {
        $('#paytm-section').removeClass('d-none');
        $('#paytm-section').addClass('d-none');

        $('#stripe-element').addClass('d-none');

        $('#authorize-net-input').removeClass('d-block');
        $('#authorize-net-input').addClass('d-none');

        $('#razorpay-section').removeClass('d-block');
        $('#razorpay-section').addClass('d-none');

        $('#paystack-section').removeClass('d-block');
        $('#paystack-section').addClass('d-none');

        $('#flutterwave-section').removeClass('d-none');
      } else if (selectedPaymentMethod == "paytm") {
        $('#stripe-element').addClass('d-none');

        $('#authorize-net-input').removeClass('d-block');
        $('#authorize-net-input').addClass('d-none');

        $('#razorpay-section').removeClass('d-block');
        $('#razorpay-section').addClass('d-none');

        $('#paystack-section').removeClass('d-block');
        $('#paystack-section').addClass('d-none');

        $('#flutterwave-section').removeClass('d-block');
        $('#flutterwave-section').addClass('d-none');

        $('#paytm-section').removeClass('d-none');

      } else if (selectedPaymentMethod == "razorpay") {
        $('#paytm-section').removeClass('d-none');
        $('#paytm-section').addClass('d-none');

        $('#stripe-element').addClass('d-none');

        $('#authorize-net-input').removeClass('d-block');
        $('#authorize-net-input').addClass('d-none');

        $('#paystack-section').removeClass('d-block');
        $('#paystack-section').addClass('d-none');

        $('#flutterwave-section').removeClass('d-block');
        $('#flutterwave-section').addClass('d-none');

        $('#razorpay-section').removeClass('d-none');
      }
    } else if ($(this).prop("checked") == false) {
      $('#donation-info-section').removeClass('d-none');
      $('#authorize-net-input').addClass('d-none');
      $('#paystack-section').addClass('d-none');
      $('#flutterwave-section').addClass('d-none');
      $('#paytm-section').addClass('d-none');
    }
  });
  $('select[name="gateway"]').change(function () {
    var selectedPaymentMethod = $(this).children("option:selected").val();

    let value = $(this).val();
    let dataType = parseInt(value);
    if (selectedPaymentMethod == "stripe") {
      $('#stripe-element').removeClass('d-none');
      $('.iyzico-element').addClass('d-none');

      $('#paytm-section').removeClass('d-block');
      $('#paytm-section').addClass('d-none');

      $('#razorpay-section').removeClass('d-block');
      $('#razorpay-section').addClass('d-none');

      $('#authorize-net-input').removeClass('d-block');
      $('#authorize-net-input').addClass('d-none');

      $('#paystack-section').removeClass('d-block');
      $('#paystack-section').addClass('d-none');

      $('#flutterwave-section').removeClass('d-block');
      $('#flutterwave-section').addClass('d-none');

      $('#stripe-card-input').removeClass('d-none');
    } else if (selectedPaymentMethod == "iyzico") {

      $('.iyzico-element').removeClass('d-none');

      $('#stripe-card-input').removeClass('d-block');
      $('#stripe-card-input').addClass('d-none');


      $('#paytm-section').removeClass('d-block');
      $('#paytm-section').addClass('d-none');

      $('#razorpay-section').removeClass('d-block');
      $('#razorpay-section').addClass('d-none');

      $('#authorize-net-input').removeClass('d-block');
      $('#authorize-net-input').addClass('d-none');

      $('#paystack-section').removeClass('d-block');
      $('#paystack-section').addClass('d-none');

      $('#flutterwave-section').removeClass('d-block');
      $('#flutterwave-section').addClass('d-none');

      $('#stripe-card-input').removeClass('d-none');
    }
    else if (selectedPaymentMethod == "paytm" && $("input[name='checkbox']:checked")
      .length > 0) {
      $('#stripe-card-input').removeClass('d-block');
      $('#stripe-card-input').addClass('d-none');
      $('.iyzico-element').addClass('d-none');

      $('#authorize-net-input').removeClass('d-block');
      $('#authorize-net-input').addClass('d-none');
      $('#paystack-section').removeClass('d-block');
      $('#paystack-section').addClass('d-none');

      $('#flutterwave-section').removeClass('d-block');
      $('#flutterwave-section').addClass('d-none');

      $('#razorpay-section').removeClass('d-block');
      $('#razorpay-section').addClass('d-none');

      $('#paytm-section').removeClass('d-none');
    } else if (selectedPaymentMethod == "razorpay" && $("input[name='checkbox']:checked")
      .length > 0) {
      $('#paytm-section').removeClass('d-block');
      $('#paytm-section').addClass('d-none');
      $('.iyzico-element').addClass('d-none');

      $('#stripe-element').addClass('d-none');

      $('#authorize-net-input').removeClass('d-block');
      $('#authorize-net-input').addClass('d-none');
      $('#paystack-section').removeClass('d-block');
      $('#paystack-section').addClass('d-none');

      $('#flutterwave-section').removeClass('d-block');
      $('#flutterwave-section').addClass('d-none');

      $('#razorpay-section').removeClass('d-none');
    } else if (selectedPaymentMethod == "paystack" && $("input[name='checkbox']:checked")
      .length > 0) {
      $('#paytm-section').removeClass('d-block');
      $('#paytm-section').addClass('d-none');
      $('.iyzico-element').addClass('d-none');

      $('#stripe-element').addClass('d-none');

      $('#authorize-net-input').removeClass('d-block');
      $('#authorize-net-input').addClass('d-none');

      $('#razorpay-section').removeClass('d-block');
      $('#razorpay-section').addClass('d-none');

      $('#flutterwave-section').removeClass('d-block');
      $('#flutterwave-section').addClass('d-none');

      $('#paystack-section').removeClass('d-none');
    } else if (selectedPaymentMethod == "flutterwave" && $("input[name='checkbox']:checked")
      .length > 0) {
      $('.iyzico-element').addClass('d-none');
      $('#paytm-section').removeClass('d-block');
      $('#paytm-section').addClass('d-none');

      $('#stripe-element').addClass('d-none');

      $('#authorize-net-input').removeClass('d-block');
      $('#authorize-net-input').addClass('d-none');

      $('#razorpay-section').removeClass('d-block');
      $('#razorpay-section').addClass('d-none');

      $('#paystack-section').removeClass('d-block');
      $('#paystack-section').addClass('d-none');

      $('#flutterwave-section').removeClass('d-none');
    } else if (selectedPaymentMethod == "authorize.net") {
      $('#paytm-section').removeClass('d-block');
      $('.iyzico-element').addClass('d-none');
      $('#paytm-section').addClass('d-none');

      $('#stripe-element').addClass('d-none');

      $('#razorpay-section').removeClass('d-block');
      $('#razorpay-section').addClass('d-none');

      $('#paystack-section').removeClass('d-block');
      $('#paystack-section').addClass('d-none');

      $('#flutterwave-section').removeClass('d-block');
      $('#flutterwave-section').addClass('d-none');

      $('#authorize-net-input').removeClass('d-none');
    } else {
      $('.iyzico-element').addClass('d-none');
      $('#offline-gateway-' + value).removeClass('d-none');
      $('#stripe-element').addClass('d-none');
      $('#razorpay-section').addClass('d-none');
      $('#paytm-section').addClass('d-none');
      $('#paystack-section').addClass('d-none');
      $('#flutterwave-section').addClass('d-none');
      $('#authorize-net-input').addClass('d-none');

    }
  });
});



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
  // form.addEventListener('submit', function (event) {


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

}
//stripe init start end


$(document).ready(function () {
  $("#donateNow").on('click', function (e) {
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







