@extends('user.layout')
@php
  Config::set('app.timezone', App\Models\BasicSetting::first()->timezone);
@endphp
@section('content')
  @if ($message = Session::get('error'))
    <div class="alert alert-danger alert-block">
      <button type="button" class="close" data-dismiss="alert">×</button>
      <strong>{{ $message }}</strong>
    </div>
  @endif
  @if (!empty($membership) && ($membership->package->term == 'lifetime' || $membership->is_trial == 1))
    <div class="alert bg-warning alert-warning text-white text-center">
      <a class="btn btn-info btn-sm float-right d-inline-block" href="{{ route('user.plan.extend.index') . '?language=' . request('language') }}">
        <span class="btn-label">
            <i class="fas fa-backward"></i>
        </span>
        {{ __('Back') }}
    </a>
      <h3>{{ __('If_you_purchase_this_package') }} <strong class="text-dark">({{ __($package->title) }})</strong>,
        {{  __('then_your_current_package') }} <strong class="text-dark">({{  __($membership->package->title)  }}
          @if ($membership->is_trial == 1)
            <span class="badge badge-secondary">{{  __('Trial') }}</span>
          @endif)
        </strong> {{ __('will_be_replaced_immediately') }}</h3>
    </div>
  @endif
  <div class="row justify-content-center align-items-center mb-1">
    <div class="col-md-1 pl-md-0">
    </div>

    <div class="col-md-6 pl-md-0 pr-md-0">
      <div class="card card-pricing card-pricing-focus card-secondary">
        <form id="my-checkout-form" action="{{ route('user.plan.checkout') }}" method="post"
          enctype="multipart/form-data">
          @csrf
          <input type="hidden" name="package_id" value="{{ $package->id }}">
          <input type="hidden" name="user_id" value="{{ auth()->id() }}">
          <input type="hidden" name="payment_method" id="payment" value="{{ old('payment_method') }}">
          <div class="card-header">
            <h4 class="card-title">{{  __($package->title) }}</h4>
            <div class="card-price">
              <span class="price">{{ $package->price == 0 ? __('Free') : format_price($package->price) }}</span>
              <span class="text">/{{ __($package->term) }}</span>
            </div>
          </div>
          <div class="card-body">
            <ul class="specification-list">
              <li>
                <span class="name-specification">{{  __('Membership') }}</span>
                <span class="status-specification">{{ __('Yes') }}</span>
              </li>
              <li>
                <span class="name-specification">{{ __('Start_Date') }}</span>
                @if (
                    (!empty($previousPackage) && $previousPackage->term == 'lifetime') ||
                        (!empty($membership) && $membership->is_trial == 1))
                  <input type="hidden" name="start_date"
                    value="{{ \Illuminate\Support\Carbon::yesterday()->format('d-m-Y') }}">
                  <span class="status-specification">{{ \Illuminate\Support\Carbon::today()->format('d-m-Y') }}</span>
                @else
                  <input type="hidden" name="start_date"
                    value="{{ \Illuminate\Support\Carbon::parse($membership->expire_date ?? \Carbon\Carbon::yesterday())->addDay()->format('d-m-Y') }}">
                  <span
                    class="status-specification">{{ \Illuminate\Support\Carbon::parse($membership->expire_date ?? \Carbon\Carbon::yesterday())->addDay()->format('d-m-Y') }}</span>
                @endif
              </li>
              <li>
                <span class="name-specification">{{ __('Expire_Date') }}</span>
                <span class="status-specification">
                  @if ($package->term == 'monthly')
                    @if (
                        (!empty($previousPackage) && $previousPackage->term == 'lifetime') ||
                            (!empty($membership) && $membership->is_trial == 1))
                      {{ \Illuminate\Support\Carbon::parse(now())->addMonth()->format('d-m-Y') }}
                      <input type="hidden" name="expire_date"
                        value="{{ \Illuminate\Support\Carbon::parse(now())->addMonth()->format('d-m-Y') }}">
                    @else
                      {{ \Illuminate\Support\Carbon::parse($membership->expire_date ?? now())->addMonth()->format('d-m-Y') }}
                      <input type="hidden" name="expire_date"
                        value="{{ \Illuminate\Support\Carbon::parse($membership->expire_date ?? now())->addMonth()->format('d-m-Y') }}">
                    @endif
                  @elseif($package->term == 'lifetime')
                    {{  __('lifetime') }}
                    <input type="hidden" name="expire_date"
                      value="{{ \Illuminate\Support\Carbon::maxValue()->format('d-m-Y') }}">
                  @else
                    @if (
                        (!empty($previousPackage) && $previousPackage->term == 'lifetime') ||
                            (!empty($membership) && $membership->is_trial == 1))
                      {{ \Illuminate\Support\Carbon::parse(now())->addYear()->format('d-m-Y') }}
                      <input type="hidden" name="expire_date"
                        value="{{ \Illuminate\Support\Carbon::parse(now())->addYear()->format('d-m-Y') }}">
                    @else
                      {{ \Illuminate\Support\Carbon::parse($membership->expire_date ?? now())->addYear()->format('d-m-Y') }}
                      <input type="hidden" name="expire_date"
                        value="{{ \Illuminate\Support\Carbon::parse($membership->expire_date ?? now())->addYear()->format('d-m-Y') }}">
                    @endif
                  @endif
                </span>
              </li>
              <li>
                <span class="name-specification">{{  __('Total_Cost') }}</span>
                <input type="hidden" name="price" value="{{ $package->price }}">
                <span class="status-specification">
                  {{ $package->price == 0 ? __('Free') : format_price($package->price) }}
                </span>
              </li>
              @if ($package->price != 0)
                <li>
                  <div class="form-group px-0">
                    <label class="text-white">{{ __('Payment_Method')  }}</label>
                    <select name="payment_method" class="form-control input-solid" id="payment-gateway" required>
                      <option value="" disabled selected>{{ __('Select_a_Payment_Method')  }}
                      </option>
                      @foreach ($payment_methods as $payment_method)
                        <option value="{{ $payment_method->name }}"
                          {{ old('payment_method') == $payment_method->name ? 'selected' : '' }}>
                          {{ __($payment_method->name) }}</option>
                      @endforeach
                    </select>
                  </div>
                </li>
              @endif

              <div class="iyzico-element {{ old('payment_method') == 'Iyzico' ? '' : 'd-none' }}">
                <input type="text" name="identity_number" class="form-control mb-2" placeholder="Identity Number"
                  value="{{ old('identity_number') }}">
                @error('identity_number')
                  <p class="text-danger text-left">{{ $message }}</p>
                @enderror
                <input type="text" name="zip_code" class="form-control" placeholder="Zip Code"
                  value="{{ old('zip_code') }}">
                @error('zip_code')
                  <p class="text-danger text-left">{{ $message }}</p>
                @enderror
              </div>

              <div class="row gateway-details pt-3 text-left" id="tab-stripe" style="display: none;">

                <div class="col-12">
                  <div id="stripe-element" class="mb-2">
                    <!-- A Stripe Element will be inserted here. -->
                  </div>
                  <!-- Used to display form errors -->
                  <div id="stripe-errors" class="pb-2 text-danger" role="alert"></div>
                </div>
              </div>

              {{-- START: Authorize.net Card Details Form --}}
              <div class="row gateway-details pt-3" id="tab-anet" style="display: none;">
                <div class="col-lg-6">
                  <div class="form-group mb-3">
                    <input class="form-control" type="text" id="anetCardNumber" placeholder="Card Number"
                      disabled />
                  </div>
                </div>
                <div class="col-lg-6 mb-3">
                  <div class="form-group">
                    <input class="form-control" type="text" id="anetExpMonth" placeholder="Expire Month"
                      disabled />
                  </div>
                </div>
                <div class="col-lg-6 ">
                  <div class="form-group">
                    <input class="form-control" type="text" id="anetExpYear" placeholder="Expire Year" disabled />
                  </div>
                </div>
                <div class="col-lg-6 ">
                  <div class="form-group">
                    <input class="form-control" type="text" id="anetCardCode" placeholder="Card Code" disabled />
                  </div>
                </div>
                <input type="hidden" name="opaqueDataValue" id="opaqueDataValue" disabled />
                <input type="hidden" name="opaqueDataDescriptor" id="opaqueDataDescriptor" disabled />
                <ul id="anetErrors" style="display: none;"></ul>
              </div>
              {{-- END: Authorize.net Card Details Form --}}

              <div id="instructions" class="text-left"></div>
              <input type="hidden" name="is_receipt" value="0" id="is_receipt">
            </ul>

          </div>
          <div class="card-footer">
            <button class="btn btn-light btn-block" id="buyNow"
              type="submit"><b>{{ __('Checkout_Now') }}</b></button>
          </div>
        </form>
      </div>
    </div>
    <div class="col-md-1 pr-md-0"></div>
  </div>
  @php
    $receiptMsg = __('Receipt image must be') . ' ';
    $receipt = __('Receipt') . ' ';
  @endphp
@endsection

@section('scripts')
  <script>
    "use strict";
    $(document).ready(function() {
      $('#stripe-element').addClass('d-none');
    })

    $(document).ready(function() {
      $("#payment-gateway").on('change', function() {
        let offline = @php echo json_encode($offline) @endphp;
        let data = [];
        offline.map(({
          id,
          name
        }) => {
          data.push(name);
        });
        let paymentMethod = $("#payment-gateway").val();

        $(".gateway-details").hide();
        $(".gateway-details input").attr('disabled', true);
        $("input[name='receipt']").removeAttr("required").val("").removeClass("is-invalid");

        if (paymentMethod == 'Stripe') {
          $('#stripe-element').removeClass('d-none');
          $("#tab-stripe").show();
          $("#tab-stripe input").removeAttr('disabled');
        } else if (paymentMethod == 'Iyzico') {
          $('.iyzico-element').removeClass('d-none');
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
            url: '{{ route('front.payment.instructions') }}',
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
                                              <label>{{ $receipt }}<span>*</span></label><br>
                                              <input type="file" name="receipt" value="" class="file-input" required>
                                              <p class="mb-0 text-warning">** {{ $receiptMsg }} .jpg / .jpeg / .png</p>
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
              errorElement.textContent = result.error.message;

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
  </script>
  {{-- END: Authorize.net Scripts --}}
  @if (!empty($stripe_key))
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
