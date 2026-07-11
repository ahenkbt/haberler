@php
  $custom_amounts = !empty($causeContent->donation->custom_amount)
      ? explode(',', $causeContent->donation->custom_amount)
      : [];
@endphp
@extends('user-front.layout')

@section('tab-title')
  {{ $keywords['cause_details'] ?? 'Cause Details' }}
@endsection

@section('meta-description', !empty($userSeo) ? $userSeo->meta_description_course_details : '')
@section('meta-keywords', !empty($userSeo) ? $userSeo->meta_keyword_course_details : '')

@section('page-name')
  {{ $causeContent->title }}
@endsection
@section('br-name')
  {{ $keywords['cause_details'] ?? 'Cause Details' }}
@endsection

@section('content')
  <section class="causes-single-section pt-140 pb-140">
    <div class="container">
      <div class="row">
        <div class="col-lg-8">
          <div class="causes-single-wrapper">
            <div class="single-work-img">
              <img src="{{ asset('assets/tenant/image/cause/' . $causeContent->donation->image) }}" class="img-fluid"
                alt="">
            </div>
            <div class="single-work-content">
              <h2>{{ $causeContent->title }}</h2>

              <p>
                @if ($userBs->base_currency_symbol_position == 'left')
                  {{ $userBs->base_currency_symbol . formatNumber($causeContent->raised_amount) }}
                @elseif($userBs->base_currency_symbol_position == 'right')
                  {{ formatNumber($causeContent->raised_amount) . $userBs->base_currency_symbol }}
                @endif

                {{ $keywords['of'] ?? __('of') }}

                @if ($userBs->base_currency_symbol_position == 'left')
                  {{ $userBs->base_currency_symbol . formatNumber($causeContent->donation->goal_amount) }}
                @elseif($userBs->base_currency_symbol_position == 'right')
                  {{ formatNumber($causeContent->donation->goal_amount) . $userBs->base_currency_symbol }}
                @endif

                {{ $keywords['raised'] ?? __('Raised') }}
              </p>
              <div class="progress-bar-area">
                <div class="progress-bar">
                  <div class="progress-bar-inner  wow slideInLeft"
                    style="width: {{ $causeContent->goal_percentage . '%' }}">
                    <div class="progress-bar-style">
                      <p>{{ $causeContent->goal_percentage . '%' }}</p>
                    </div>
                  </div>
                </div>
              </div>
              <p>{!! $causeContent->content !!}</p>
            </div>
          </div>
        </div>
        <div class="col-lg-4 col-md-12">
          <div class="nusafe-sidebar causes-sidebar">
            <div class="widget-box donation-box">
              <div class="donation-form">
                <h4 class="widget-title"> {{ $keywords['Donation_Form'] ?? __('Donation Form') }}</h4>
                <form id="my-checkout-form" method="POST" action="{{ route('front.user.causes.payment', getParam()) }}"
                  enctype="multipart/form-data">
                  @csrf
                  <div class="form_group">
                    <input type="hidden" name="cause_id" value="{{ $causeContent->donation->id }}">
                    <input type="hidden" name="minimum_amount" value="{{ $causeContent->donation->min_amount }}">
                    <input type="text" class="form_control amount_input" name="amount" id="custom_amount"
                      placeholder="{{ $causeContent->donation->min_amount }}"
                      min="{{ $causeContent->donation->min_amount }}"
                      value="{{ old('amount', $causeContent->donation->min_amount) }}">
                    <span>{{ $currencyInfo->base_currency_symbol }}</span>
                    @error('amount')
                      <p class="mt-2 text-danger">{{ $message }}</p>
                    @enderror
                  </div>
                  <ul>
                    @foreach ($custom_amounts as $amount)
                      <li><a href="javaScript:void(0)"
                          onclick="setAmount({{ $causeContent->donation->min_amount }},{{ $amount }})">{{ $amount }}</a>
                      </li>
                    @endforeach

                  </ul>
                  @php
                    if (Auth::guard('customer')->check()) {
                        $name = old('name') ?? Auth::guard('customer')->user()->last_name;
                        $email = old('email') ?? Auth::guard('customer')->user()->email;
                        $phone = old('phone') ?? Auth::guard('customer')->user()->contact_number;
                    } else {
                        $name = old('name');
                        $email = old('email');
                        $phone = old('phone');
                    }
                  @endphp
                  <h4 class="widget-title">{{ $keywords['Donation_Form'] ?? __('Donation Form') }}</h4>
                  <div id="donation-info-section" @if (old('checkbox')) class="d-none" @endif>
                    <div class="form_group">
                      <input type="text" class="form_control"
                        placeholder="{{ $keywords['Full_Name'] ?? __('Full Name') }}" name="name"
                        value="{{ $name }}" required>
                      @error('name')
                        <p class="mt-2 text-danger">{{ $message }}</p>
                      @enderror

                    </div>
                    <div class="form_group">
                      <input type="text" class="form_control" placeholder="{{ $keywords['phone'] ?? __('Phone') }}"
                        name="phone" value="{{ $phone }}" required>
                      @error('phone')
                        <p class="mt-2 text-danger">{{ $message }}</p>
                      @enderror
                    </div>
                    <div class="form_group">
                      <input type="email" class="form_control" placeholder="{{ $keywords['email'] ?? __('Email') }}"
                        name="email" value="{{ $email }}" required>
                      @error('email')
                        <p class="mt-2 text-danger">{{ $message }}</p>
                      @enderror
                    </div>

                  </div>
                  <div class="form_group">
                    <select class="form-control" name="gateway" class=" mb-4" id="payment-gateway">
                      <option selected disabled>
                        {{ $keywords['select_payment_gateway'] ?? __('Select Payment Gateway') }}
                      </option>

                      @if (count($onlineGateways) > 0)
                        @foreach ($onlineGateways as $onlineGateway)
                          <option value="{{ $onlineGateway->keyword }}"
                            {{ $onlineGateway->keyword == old('gateway') ? 'selected' : '' }}>
                            {{ $keywords[$onlineGateway->name] ?? $onlineGateway->name }}
                          </option>
                        @endforeach
                      @endif

                      @if (count($offlineGateways) > 0)
                        @foreach ($offlineGateways as $offlineGateway)
                          <option value="{{ $offlineGateway->id }}"
                            {{ $offlineGateway->id == old('gateway') ? 'selected' : '' }}>
                            {{ $offlineGateway->name }}
                          </option>
                        @endforeach
                      @endif
                    </select>

                  </div>
                  @error('gateway')
                    <p class="text-danger text-left">{{ $message }}</p>
                  @enderror

                  <div class="iyzico-element {{ old('gateway') == 'iyzico' ? '' : 'd-none' }}">
                    <input type="text" name="identity_number" class="form-control mb-3"
                      placeholder="{{ $keywords['Identity_Number'] ?? __('Identity Number') }}"
                      value="{{ old('identity_number') }}">
                    @error('identity_number')
                      <p class="text-danger text-left">{{ $message }}</p>
                    @enderror

                    <input type="text" name="city" class="form-control mb-3"
                      placeholder="{{ $keywords['city'] ?? __('City') }}" value="{{ old('city') }}">
                    @error('city')
                      <p class="text-danger text-left">{{ $message }}</p>
                    @enderror
                    <input type="text" name="country" class="form-control mb-3"
                      placeholder="{{ $keywords['country'] ?? __('Country') }}" value="{{ old('country') }}">
                    @error('country')
                      <p class="text-danger text-left">{{ $message }}</p>
                    @enderror
                    <input type="text" name="address" class="form-control mb-3"
                      placeholder="{{ $keywords['address'] ?? __('Address') }}" value="{{ old('address') }}">
                    @error('address')
                      <p class="text-danger text-left">{{ $message }}</p>
                    @enderror

                    <input type="text" name="zip_code" class="form-control mb-3"
                      placeholder="{{ $keywords['Zip_Code'] ?? __('Zip Code') }}" value="{{ old('zip_code') }}">
                    @error('zip_code')
                      <p class="text-danger text-left">{{ $message }}</p>
                    @enderror
                  </div>

                  @foreach ($onlineGateways as $onlineGateway)
                    @if ($onlineGateway->keyword == 'stripe')
                      {{-- <div class="col-12"> --}}
                      <div id="stripe-element" class="mb-3">
                        <!-- A Stripe Element will be inserted here. -->
                      </div>
                      <!-- Used to display form errors -->
                      <div id="stripe-errors" class="pb-2 text-danger" role="alert"></div>
                      {{-- </div> --}}
                    @endif
                    @if ($onlineGateway->keyword == 'authorize.net')
                      <div id="authorize-net-input"
                        class="@if (
                            $errors->has('anetCardNumber') ||
                                $errors->has('anetExpMonth') ||
                                $errors->has('anetExpYear') ||
                                $errors->has('anetCardCode')) d-block @else d-none @endif">
                        <div class="form-group mb-4">
                          <input type="text" class="form-control" id="anetCardNumber" name="anetCardNumber"
                            placeholder="{{ $keywords['enter_your_card_number'] ?? __('Enter Your Card Number') }}"
                            autocomplete="off">
                          <p class="mt-2 text-danger" id="anetCardNumber-error"></p>
                          @error('anetCardNumber')
                            <p class="mt-2 text-danger">{{ $message }}</p>
                          @enderror
                        </div>

                        <div class="form-group mb-4">
                          <input type="text" class="form-control" id="anetExpMonth" name="anetExpMonth"
                            placeholder="{{ $keywords['enter_expiry_month'] ?? __('Enter Expiry Month') }}"
                            autocomplete="off">
                          <p class="mt-2 text-danger" id="anetExpMonth-error"></p>
                          @error('anetExpMonth')
                            <p class="mt-2 text-danger">{{ $message }}</p>
                          @enderror
                        </div>

                        <div class="form-group mb-4">
                          <input type="text" class="form-control" id="anetExpYear" name="anetExpYear"
                            placeholder="{{ $keywords['enter_expiry_year'] ?? __('Enter Expiry Year') }}"
                            autocomplete="off">
                          @error('anetExpYear')
                            <p class="mt-2 text-danger">{{ $message }}</p>
                          @enderror
                        </div>

                        <div class="form-group mb-4">
                          <input type="text" class="form-control" id="anetCardCode" name="anetCardCode"
                            placeholder="{{ $keywords['enter_card_code'] ?? __('Enter Card Code') }}"
                            autocomplete="off">
                          @error('anetCardCode')
                            <p class="mt-2 text-danger">{{ $message }}</p>
                          @enderror
                        </div>
                        <input type="hidden" name="opaqueDataValue" id="opaqueDataValue" />
                        <input type="hidden" name="opaqueDataDescriptor" id="opaqueDataDescriptor" />
                        <ul id="anetErrors" class="dis-none"></ul>
                      </div>
                    @endif
                  @endforeach

                  @foreach ($offlineGateways as $offlineGateway)
                    <div class="@if ($errors->has('attachment') && request()->session()->get('gatewayId') == $offlineGateway->id) d-block @else d-none @endif offline-gateway-info"
                      id="{{ 'offline-gateway-' . $offlineGateway->id }}">
                      @if (!is_null($offlineGateway->short_description))
                        <div class="form-group mb-4">
                          <label>{{ $keywords['description'] ?? __('Description') }}</label>
                          <p>{{ $offlineGateway->short_description }}</p>
                        </div>
                      @endif

                      @if (!is_null($offlineGateway->instructions))
                        <div class="form-group mb-4">
                          <label>{{ $keywords['instructions'] ?? __('Instructions') }}</label>
                          <p>{!! replaceBaseUrl($offlineGateway->instructions) !!}</p>
                        </div>
                      @endif

                      @if ($offlineGateway->is_receipt == 1)
                        <div class="form-group mb-4">
                          <label>{{ $keywords['attachment'] ?? __('Attachment') }} *</label>
                          <br>
                          <input type="file" name="attachment">
                          @error('attachment')
                            <p class="mt-2 text-danger">{{ $message }}</p>
                          @enderror
                        </div>
                      @endif
                    </div>
                  @endforeach
                  <div
                    id="paystack-section"@if ($errors->has('paystack_email')) class="d-block" @else class="d-none" @endif>
                    <input type="text" class="form_control" name="paystack_email"
                      placeholder="{{ __('Email Address') }}" required>
                    @error('paystack_email')
                      <p class="mt-2 text-danger">{{ $message }}</p>
                    @enderror
                  </div>
                  <div id="flutterwave-section"
                    @if ($errors->has('flutterwave_email')) class="d-block" @else class="d-none" @endif>
                    <input type="text" class="form_control" name="flutterwave_email"
                      placeholder="{{ __('Email Address') }}" required>
                    @error('flutterwave_email')
                      <p class="mt-2 text-danger">{{ $message }}</p>
                    @enderror
                  </div>
                  <div id="razorpay-section"
                    @if ($errors->has('razorpay_phone') || $errors->has('razorpay_email')) class="d-block" @else class="d-none" @endif>
                    <input type="text" class="form_control" name="razorpay_phone"
                      placeholder="{{ __('Enter your phone') }}" required>
                    @error('razorpay_phone')
                      <p class="mt-2 text-danger">{{ $message }}</p>
                    @enderror
                    <input type="email" class="form_control mt-3" name="razorpay_email"
                      placeholder="{{ 'Enter your email address' }}" required>
                    @error('razorpay_email')
                      <p class="mt-2 text-danger">{{ $message }}</p>
                    @enderror
                  </div>
                  <div id="paytm-section" @if ($errors->has('paytm_phone') || $errors->has('paytm_email')) class="d-block" @else class="d-none" @endif>
                    <input type="text" class="form_control" name="paytm_phone"
                      placeholder="{{ __('Enter your phone') }}" required>
                    @error('paytm_phone')
                      <p class="mt-2 text-danger">{{ $message }}</p>
                    @enderror
                    <input type="email" class="form_control mt-3" name="paytm_email"
                      placeholder="{{ 'Enter your email address' }}" required>
                    @error('paytm_email')
                      <p class="mt-2 text-danger">{{ $message }}</p>
                    @enderror
                  </div>
                  <div class="anonymous_user">
                    <input id="Anonymous" type="checkbox" class="form_control" name="checkbox"
                      @if (old('checkbox')) checked @endif>
                    <label for="Anonymous">{{ $keywords['Anonymous_Donation'] ?? __('Anonymous Donation') }}</label>

                  </div>

                  <div class="form_btn">
                    <button type="button" id="donateNow"
                      class="btn">{{ $keywords['Donate_Now'] ?? __('Donate Now') }}</button>
                  </div>
                </form>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  </section>

@endsection

@section('scripts')

  {{-- START: Authorize.net Scripts --}}
  @php
    $user = getUser();
    $anet = App\Models\User\UserPaymentGeteway::query()
        ->where('user_id', $user->id)
        ->where('keyword', 'authorize.net')
        ->first();

    $anetSrc = 'assets/front/js/anet-test.js';
    $anetAcceptSrc = 'https://jstest.authorize.net/v1/Accept.js';
    if (!is_null($anet)) {
        $anetInfo = $anet->convertAutoData();
        $anetTest = $anetInfo['sandbox_check'] ?? '';
        if ($anetTest != 1) {
            $anetSrc = 'assets/front/js/anet.js';
            $anetAcceptSrc = 'https://js.authorize.net/v1/Accept.js';
        }
    }
  @endphp
  <script type="text/javascript" src="{{ asset("${anetSrc}") }}" charset="utf-8"></script>
  <script type="text/javascript" src="{{ $anetAcceptSrc }}" charset="utf-8"></script>
  @if (!empty($stripe_key))
    <script src="https://js.stripe.com/v3/"></script>
  @endif
  <script>
    "use strict";
    var clientKey = "{{ isset($anetInfo) && !is_null($anetInfo) ? $anetInfo['public_key'] : null }}";
    var apiLoginID = "{{ isset($anetInfo) && !is_null($anetInfo) ? $anetInfo['login_id'] : null }}";
    let stripe_key = "{{ $stripe_key }}";
  </script>
  <script src="{{ asset('assets/tenant/js/donation/cause-details.js') }}"></script>


@endsection
