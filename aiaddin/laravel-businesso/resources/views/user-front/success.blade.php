<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{{ $bs->website_title }} - {{ __('Success') }}</title>
  <link rel="stylesheet" type="text/css" href="{{ asset('assets/front/css/plugin.min.css') }}" />
  <link rel="stylesheet" type="text/css" href="{{ asset('assets/front/css/success.css') }}" />
  <!-- base color change -->
  <link href="{{ asset('assets/front/css/style-base-color.php') . '?color=' . $bs->base_color }}" rel="stylesheet">
  <link rel="stylesheet" href="{{ asset('assets/front/css/cookie-alert.css') }}">
</head>

<body>
  <div class="container">
    <div class="row">
      <div class="col-md-6 mx-auto" id="mt">
        <div class="payment">
          <div class="payment_header">
            <div class="check">
              <i class="fa fa-check" aria-hidden="true"></i>
            </div>
          </div>
          <div class="content">
            <h1>{{ $keywords['payment_success'] ?? __('Payment Success') }}</h1>
            @if (request()->has('room-booking'))
              <p class="paragraph-text">
                {{ $keywords['room_booking_payment_success_msg'] ?? __('Your payment for room booking is successful. We sent you an email with Invoice. Please check your inbox') }}
              </p>
            @elseif (request()->has('donation'))
              <p class="paragraph-text">
                {{ $keywords['donation_payment_success_msg'] ?? __('Your payment for donation is successful. We sent you an email with Invoice. Please check your inbox') }}
              </p>
            @else
              <p class="paragraph-text">
                {{ $keywords['item_order_payment_success_msg'] ?? __('Your payment for items order is successful. We sent you an email with Invoice. Please check your inbox') }}
              </p>
            @endif

            <a
              href="{{ route('front.user.detail.view', getParam()) }}">{{ $keywords['Go_to_Home'] ?? __('Go to Home') }}</a>
            @php
              Session::forget('user_midtrans');
            @endphp
          </div>
        </div>
      </div>
    </div>
  </div>
</body>

</html>
