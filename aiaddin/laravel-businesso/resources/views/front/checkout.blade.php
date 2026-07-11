@extends('front.layout')

@section('styles')
  <link rel="stylesheet" href="{{ asset('assets/front/css/checkout.css') }}">
@endsection

@section('pagename')
  - {{ __('Checkout') }}
@endsection

@section('meta-description', !empty($seo) ? $seo->checkout_meta_description : '')
@section('meta-keywords', !empty($seo) ? $seo->checkout_meta_keywords : '')

@section('breadcrumb-title')
  {{ __('Checkout') }}
@endsection
@section('breadcrumb-link')
  {{ __('Checkout') }}
@endsection
@section('content')
  <!--====== Start saas_checkout ======-->

  <div class="checkout-area ptb-90">
    <div class="container">
      <form
        onsubmit="document.getElementById('confirmBtn').innerHTML='Processing..';document.getElementById('confirmBtn').disabled=true;"
        action="{{ route('front.membership.checkout') }}" method="POST" enctype="multipart/form-data" id="my-checkout-form">
        <div class="row">
          <div class="col-lg-8">
            <div class="billing-form form-block mb-30 pb-0">
              <div class="title">
                <h4>{{ __('Billing Details') }}</h4>
              </div>
              @csrf
              <div class="row">
                <input type="hidden" name="username" value="{{ $username }}">
                <input type="hidden" name="password" value="{{ $password }}">
                <input type="hidden" name="package_type" value="{{ $status }}">
                <input type="hidden" name="email" value="{{ $email }}">
                <input type="hidden" name="package_id" value="{{ $id }}">
                <input type="hidden" name="trial_days" id="trial_days" value="{{ $package->trial_days }}">
                <input type="hidden" name="start_date" value="{{ \Carbon\Carbon::today()->format('d-m-Y') }}">
                @if ($status === 'trial')
                  <input type="hidden" name="expire_date"
                    value="{{ \Carbon\Carbon::today()->addDay($package->trial_days)->format('d-m-Y') }}">
                @else
                  @if ($package->term === 'monthly')
                    <input type="hidden" name="expire_date"
                      value="{{ \Carbon\Carbon::today()->addMonth()->format('d-m-Y') }}">
                  @elseif($package->term === 'lifetime')
                    <input type="hidden" name="expire_date" value="{{ \Carbon\Carbon::maxValue()->format('d-m-Y') }}">
                  @else
                    <input type="hidden" name="expire_date"
                      value="{{ \Carbon\Carbon::today()->addYear()->format('d-m-Y') }}">
                  @endif
                @endif
                <div class="col-lg-6">
                  <div class="form-group mb-3">
                    <label for="first_name">{{ __('First Name') }}*</label>
                    <input id="first_name" type="text" class="form-control" name="first_name"
                      placeholder="{{ __('First Name') }}" value="{{ old('first_name') }}" required>
                    @if ($errors->has('first_name'))
                      <span class="error">
                        <strong>{{ $errors->first('first_name') }}</strong>
                      </span>
                    @endif
                  </div>
                </div>
                <div class="col-lg-6">
                  <div class="form-group mb-3">
                    <label for="last_name">{{ __('Last Name') }}*</label>
                    <input id="last_name" type="text" class="form-control" name="last_name"
                      placeholder="{{ __('Last Name') }}" value="{{ old('last_name') }}" required>
                    @if ($errors->has('last_name'))
                      <span class="error">
                        <strong>{{ $errors->first('last_name') }}</strong>
                      </span>
                    @endif
                  </div>
                </div>
                <div class="col-lg-6">
                  <div class="form-group mb-3">
                    <label for="phone">{{ __('Phone Number') }}*</label>
                    <input id="phone" type="text" class="form-control" name="phone"
                      placeholder="{{ __('Phone Number') }}" value="{{ old('phone') }}" required>
                    @if ($errors->has('phone'))
                      <span class="error">
                        <strong>{{ $errors->first('phone') }}</strong>
                      </span>
                    @endif
                  </div>
                </div>
                <div class="col-lg-6">
                  <div class="form-group mb-3">
                    <label for="email">{{ __('Email Address') }}*</label>
                    <input id="email" type="email" class="form-control" name="email" value="{{ $email }}"
                      disabled>
                    @if ($errors->has('email'))
                      <span class="error">
                        <strong>{{ $errors->first('email') }}</strong>
                      </span>
                    @endif
                  </div>
                </div>
                <div class="col-lg-6">
                  <div class="form-group mb-3">
                    <label for="company_name">{{ __('Company Name') }}*</label>
                    <input id="company_name" type="text" class="form-control" name="company_name"
                      placeholder="{{ __('Company Name') }}" value="{{ old('company_name') }}" required>
                    @if ($errors->has('company_name'))
                      <span class="error">
                        <strong>{{ $errors->first('company_name') }}</strong>
                      </span>
                    @endif
                  </div>
                </div>

                <div class="col-lg-6">
                  <div class="form-group mb-3">
                    <label for="address">{{ __('Street Address') }}</label>
                    <input id="address" type="text" class="form-control" name="address"
                      placeholder="{{ __('Street Address') }}" value="{{ old('address') }}">
                    @if ($errors->has('address'))
                      <span class="error">
                        <strong>{{ $errors->first('address') }}</strong>
                      </span>
                    @endif
                  </div>
                </div>

                <div class="col-lg-6">
                  <div class="form-group mb-3">
                    <label for="city">{{ __('City') }}</label>
                    <input id="city" type="text" class="form-control" name="city"
                      placeholder="{{ __('City') }}" value="{{ old('city') }}">
                    @if ($errors->has('city'))
                      <span class="error">
                        <strong>{{ $errors->first('city') }}</strong>
                      </span>
                    @endif
                  </div>
                </div>

                <div class="col-lg-6">
                  <div class="form-group mb-3">
                    <label for="district">{{ __('State') }}</label>
                    <input id="district" type="text" class="form-control" name="district"
                      placeholder="{{ __('State') }}" value="{{ old('district') }}">
                    @if ($errors->has('district'))
                      <span class="error">
                        <strong>{{ $errors->first('district') }}</strong>
                      </span>
                    @endif
                  </div>
                </div>
                <div class="col-lg-12">
                  <div class="form-group mb-5">
                    <label for="country">{{ __('Country') }}*</label>
                    <input id="country" type="text" class="form-control" name="country"
                      placeholder="{{ __('Country') }}" value="{{ old('country') }}" required>
                    @if ($errors->has('country'))
                      <span class="error">
                        <strong>{{ $errors->first('country') }}</strong>
                      </span>
                    @endif
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="col-lg-4">
            <div class="order-summery form-block mb-30">
              <div class="title">
                <h4>{{ __('Package Summary') }}</h4>
              </div>
              <div class="order-list-info" id="couponReload">
                <input type="hidden" name="price"
                  value="{{ $status == 'trial' ? 0 : $package->price - $cAmount }}">
                <div class="summery-list">
                  <ul class="summery-list">
                    <li>{{ __('Package') }} <span>{{ __($package->title) }}
                        ({{ __(ucfirst($package->term)) }})</span></li>
                    <li>{{ __('Start Date') }}
                      <span>{{ \Carbon\Carbon::today()->format('d-m-Y') }}</span>
                    </li>
                    @if ($status === 'trial')
                      <li>
                        {{ __('Expiry Date') }}
                        <span>
                          {{ \Carbon\Carbon::today()->addDay($package->trial_days)->format('d-m-Y') }}
                        </span>
                      </li>
                    @else
                      <li>
                        {{ __('Expiry Date') }}
                        <span>
                          @if ($package->term === 'monthly')
                            {{ \Carbon\Carbon::today()->addMonth()->format('d-m-Y') }}
                          @elseif($package->term === 'lifetime')
                            {{ __('Lifetime') }}
                          @else
                            {{ \Carbon\Carbon::today()->addYear()->format('d-m-Y') }}
                          @endif
                        </span>
                      </li>
                    @endif
                    @if (session()->has('coupon'))
                      <li>
                        <span>{{ __('Package Price') }}</span>
                        <span class="price">
                          @if ($status === 'trial')
                            {{ __('Free') }}
                            ({{ $package->trial_days . ' ' . __('days') }})
                          @elseif($package->price == 0)
                            {{ __('Free') }}
                          @else
                            {{ format_price($package->price) }}
                          @endif
                        </span>
                      </li>
                      <li>
                        <span>{{ __('Discount') }}</span>
                        <span class="price text-success">
                          - {{ format_price($cAmount) }}
                        </span>
                      </li>
                    @endif
                  </ul>
                </div>
                <div class="order-price">
                  <ul class="summery-list">
                    <li>{{ __('Total') }}<span class="price">
                        @if ($status === 'trial')
                          {{ __('Free') }} ({{ $package->trial_days . ' ' . __('days') }})
                        @elseif($package->price == 0)
                          {{ __('Free') }}
                        @else
                          {{ format_price($package->price - $cAmount) }}
                        @endif
                      </span></li>
                  </ul>
                </div>

                @if ($package->price > 0 && $status != 'trial')
                  @if (!session()->has('coupon'))
                    <div class="row mt-4">
                      <div class="col-12">
                        <div class="input-group mb-3">
                          <input type="text" class="form-control" name="coupon"
                            placeholder="{{ __('Enter Coupon Code Here') }}">
                          <div class="input-group-append ">
                            <span class="input-group-text coupon-apply h-100 text-white bg-primary border-primary"
                              id="basic-addon2">{{ __('Apply') }}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  @else
                    <div class="alert alert-success mt-2">
                      {{ __('Coupon already applied') }}
                    </div>
                  @endif
                @endif
              </div>
            </div>
            <div class="order-payment form-block mb-30">
              @if ($package->price - $cAmount == 0 || $status == 'trial')
              @else
                <div class="title">
                  <h4>{{ __('Payment Method') }}</h4>
                </div>
                <div class="form-group mb-2">
                  <select name="payment_method" id="payment-gateway" class=" select">
                    <option value="" selected disabled>{{ __('Choose an option') }}</option>
                    @foreach ($payment_methods as $payment_method)
                      <option value="{{ $payment_method->name }}"
                        {{ old('payment_method') == $payment_method->name ? 'selected' : '' }}>
                        {{ __($payment_method->name) }}
                      </option>
                    @endforeach
                  </select>
                  @if ($errors->has('payment_method'))
                    <span class="method-error">
                      <strong>{{ $errors->first('payment_method') }}</strong>
                    </span>
                  @endif
                </div>
              @endif

              <div class="iyzico-element {{ old('payment_method') == 'Iyzico' ? '' : 'd-none' }}">
                <input type="text" name="identity_number" class="form-control mb-2" placeholder="{{ __('Identity Number') }}">
                @error('identity_number')
                  <p class="text-danger">{{ $message }}</p>
                @enderror

                <input type="text" name="zip_code" class="form-control" placeholder="{{ __('Zip Code') }}">
                @error('zip_code')
                  <p class="text-danger">{{ $message }}</p>
                @enderror
              </div>

              <!--  START: Stripe Card Details Form  -->
              <div class="row gateway-details py-3" id="tab-stripe" style="display: none;">
                <div class="col-12">
                  <div id="stripe-element" class="mb-2">
                    <!-- A Stripe Element will be inserted here. -->
                  </div>
                  <!-- Used to display form errors -->
                  <div id="stripe-errors" class="pb-2 text-danger" role="alert"></div>
                </div>
              </div>
              <!-- END: Stripe Card Details Form -->

              <!-- START: Authorize.net Card Details Form -->
              <div class="row gateway-details py-3" id="tab-anet" style="display: none;">
                <div class="col-12">
                  <div class="form-group mb-2">
                    <input class="form-control" type="text" id="anetCardNumber" placeholder="{{ __('Card Number') }}"
                      disabled />
                  </div>
                </div>
                <div class="col-12 mb-2">
                  <div class="form-group">
                    <input class="form-control" type="text" id="anetExpMonth" placeholder="{{ __('Expire Month') }}" 
                      disabled />
                  </div>
                </div>
                <div class="col-12 mb-2">
                  <div class="form-group">
                    <input class="form-control" type="text" id="anetExpYear" placeholder="{{ __('Expire Year') }}"  disabled />
                  </div>
                </div>
                <div class="col-12">
                  <div class="form-group">
                    <input class="form-control" type="text" id="anetCardCode" placeholder="{{ __('Card Code') }}" disabled />
                  </div>
                </div>
                <input type="hidden" name="opaqueDataValue" id="opaqueDataValue" disabled />
                <input type="hidden" name="opaqueDataDescriptor" id="opaqueDataDescriptor" disabled />
                <ul id="anetErrors" style="display: none;"></ul>
              </div>
              <!-- END: Authorize.net Card Details Form -->

              <!-- START: Offline Gateways Information & Receipt Area -->
              <div>
                <div id="instructions"></div>
                <input type="hidden" name="is_receipt" value="0" id="is_receipt">
                @if ($errors->has('receipt'))
                  <span class="error">
                    <strong>{{ $errors->first('receipt') }}</strong>
                  </span>
                @endif
              </div>
              <!-- END: Offline Gateways Information & Receipt Area -->

              <div class="text-center mt-3">
                <button id="confirmBtn" class="btn btn-lg btn-primary w-100" type="submit">{{ __('Confirm') }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  </div>

  <!--====== End saas_checkout ======-->
@endsection

@section('scripts')
  <script>
    "use strict";
    let receiptTxt = "{{ __('Receipt') }}";
    let receiptMsg = "{{ __('Receipt image must be .jpg / .jpeg / .png')}}";
        let stripeError = "{{ $stripeError }}";
        let anetCardError = "{{ $anetCardError }}";
        let anetYearError = "{{ $anetYearError }}";
        let anetMonthError = "{{ $anetMonthError }}";
        let anetExpirationDateError = "{{ $anetExpirationDateError }}";
        let anetCvvInvalidError = "{{ $anetCvvInvalidError }}";
        let successMsgForCoupon = "{{ $successMsgForCoupon }}";
    const originalBtnText = $("#confirmBtn").html();
    $(document).ready(function() {
      $.ajaxSetup({
        headers: {
          'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
        }
      });

      function applyCoupon() {
        let fd = new FormData();
        let coupon = $("input[name='coupon']").val();
        fd.append('coupon', coupon);
        fd.append('package_id', {{ $package->id }});

        $.ajax({
          url: "{{ route('front.membership.coupon') }}",
          type: 'POST',
          data: fd,
          contentType: false,
          processData: false,
          success: function(data) {
            if (data == 'success') {
              $("#couponReload").load(location.href + " #couponReload");
              toastr['success'](successMsgForCoupon);
            } else {
              toastr['warning'](data);
            }
          }
        })
      }

      $("input[name='coupon']").on('keypress', function(e) {
        if (e.which === 13) {
          e.preventDefault();

          applyCoupon();
        }
      });

      $(".coupon-apply").on('click', function() {
        applyCoupon();
      });
      $(document).ready(function() {
        $('#stripe-element').addClass('d-none');
      })

      $("#payment-gateway").on('change', function() {

        // Clear existing error message
        $(".error").remove();

        let offline = @php echo json_encode($offline) @endphp;
        let data = [];
        offline.map(({
          id,
          name
        }) => {
          data.push(name);
        });
        let paymentMethod = $("#payment-gateway").val();
        $("input[name='payment_method']").val(paymentMethod);
        $("input[name='receipt']").removeAttr("required").val("").removeClass("is-invalid");

        $(".gateway-details").hide();
        $(".gateway-details input").attr('disabled', true);

        if (paymentMethod == 'Stripe') {
          $('#stripe-element').removeClass('d-none');
          $("#tab-stripe").show();
          $("#tab-stripe input").removeAttr('disabled');
          $('.iyzico-element').addClass('d-none');
        } else if (paymentMethod == 'Iyzico') {
          $('.iyzico-element').removeClass('d-none');
          $('#stripe-element').addClass('d-none');
        } else {
          $('#stripe-element').addClass('d-none');
          $('.iyzico-element').addClass('d-none');
        }

        if (paymentMethod == 'Authorize.net') {
          $("#tab-anet").show();
          $("#tab-anet input").removeAttr('disabled');
        }

        if (data.indexOf(paymentMethod) != -1) {
          let formData = new FormData();
          formData.append('name', paymentMethod);
          $.ajax({
            url: "{{ route('front.payment.instructions') }}",
            headers: {
              'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
            },
            type: 'POST',
            contentType: false,
            processData: false,
            cache: false,
            data: formData,
            success: function(data) {
              let instruction = $("#instructions");
              let instructions =
                `<div class="gateway-desc">${data.instructions}</div>`;
              if (data.description != null) {
                var description =
                  `<div class="gateway-desc"><p>${data.description}</p></div>`;
              } else {
                var description = `<div></div>`;
              }
              let receipt = `<div class="form-element mb-2">
                                              <label>${receiptTxt}<span>*</span></label><br>
                                              <input type="file" name="receipt" value="" class="file-input" required>
                                              <p class="mb-0 text-warning">** ${receiptMsg}</p>
                                           </div>`;
              if (data.is_receipt == 1) {
                $("#is_receipt").val(1);
                let finalInstruction = instructions + description + receipt;
                instruction.html(finalInstruction);
                $("input[name='receipt']").attr('required', 'required');
              } else {
                $("#is_receipt").val(0);
                let finalInstruction = instructions + description;
                instruction.html(finalInstruction);
              }
              $('#instructions').fadeIn();
            },
            error: function(data) {}
          })
        } else {
          $('#instructions').fadeOut();
          $("#is_receipt").val(0);
        }
      });
    });
  </script>

  {{-- START: Authorize.net Scripts --}}
  @php
    $anet = App\Models\PaymentGateway::find(20);
    $anerInfo = $anet->convertAutoData();
    $anetTest = $anerInfo['sandbox_check'];

    if ($anetTest == 1) {
        $anetSrc = 'https://jstest.authorize.net/v1/Accept.js';
    } else {
        $anetSrc = 'https://js.authorize.net/v1/Accept.js';
    }
  @endphp
  <script type="text/javascript" src="{{ $anetSrc }}" charset="utf-8"></script>
  <script type="text/javascript">
    $(document).ready(function() {
      $("#my-checkout-form").on('submit', function(e) {
        e.preventDefault();
        let val = $("#payment-gateway").val();
        if (val == 'Authorize.net') {
          sendPaymentDataToAnet();
        } else if (val == 'Stripe') {
          stripe.createToken(cardElement).then(function(result) {
            if (result.error) {
              // Display errors to the customer
              var errorElement = document.getElementById('stripe-errors');
              errorElement.textContent = stripeError;
              
              document.getElementById('confirmBtn').innerHTML = originalBtnText;
              document.getElementById('confirmBtn').disabled = false;

            } else {
              // Send the token to your server
              stripeTokenHandler(result.token);
            }
          });
        } else {
          $(this).unbind('submit').submit();
        }
      });
    });

    function sendPaymentDataToAnet() {
      // Set up authorisation to access the gateway.
      var authData = {};
      authData.clientKey = "{{ $anerInfo['public_key'] }}";
      authData.apiLoginID = "{{ $anerInfo['login_id'] }}";

      var cardData = {};
      cardData.cardNumber = document.getElementById("anetCardNumber").value;
      cardData.month = document.getElementById("anetExpMonth").value;
      cardData.year = document.getElementById("anetExpYear").value;
      cardData.cardCode = document.getElementById("anetCardCode").value;

      // Now send the card data to the gateway for tokenisation.
      // The responseHandler function will handle the response.
      var secureData = {};
      secureData.authData = authData;
      secureData.cardData = cardData;
      Accept.dispatchData(secureData, responseHandler);
    }

    function translateMessage(message) {
    const translations = {
        "Please provide valid credit card number.": anetCardError, 
        "Please provide valid expiration year.": anetYearError,
        "Please provide valid expiration month.": anetMonthError,
        "Expiration date must be in the future.": anetExpirationDateError,
        "Please provide valid CVV.": anetCvvInvalidError,
    };

    return translations[message] || message; 
}

    function responseHandler(response) {
      if (response.messages.resultCode === "Error") {
        var i = 0;
        let errorLists = ``;
        while (i < response.messages.message.length) {
          const errorMessage = response.messages.message[i].text;
          const translatedMessage = translateMessage(errorMessage);
          errorLists += `<li class="text-danger">${translatedMessage}</li>`;

          i = i + 1;
        }
        $("#anetErrors").show();
        $("#anetErrors").html(errorLists);

        document.getElementById('confirmBtn').innerHTML = originalBtnText;
        document.getElementById('confirmBtn').disabled = false;
      } else {
        paymentFormUpdate(response.opaqueData);
      }
    }

    function paymentFormUpdate(opaqueData) {
      document.getElementById("opaqueDataDescriptor").value = opaqueData.dataDescriptor;
      document.getElementById("opaqueDataValue").value = opaqueData.dataValue;
      document.getElementById("my-checkout-form").submit();
    }
  </script>
  {{-- END: Authorize.net Scripts --}}
  @if ($stripe_key)
    <script src="https://js.stripe.com/v3/"></script>

    <script>
      let stripe_key = "{{ $stripe_key }}";
      //stripe init start

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

      //stripe init start end
    </script>
  @endif
@endsection
