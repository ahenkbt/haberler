@extends('user.layout')
@php
  $selLang = \App\Models\Language::where([
      ['code', \Illuminate\Support\Facades\Session::get('currentLangCode')],
  ])->first();
  $userDefaultLang = \App\Models\User\Language::where([
      ['user_id', \Illuminate\Support\Facades\Auth::guard('web')->user()->id],
      ['is_default', 1],
  ])->first();

  $userLanguages = \App\Models\User\Language::where(
      'user_id',
      \Illuminate\Support\Facades\Auth::guard('web')->user()->id,
  )->get();
@endphp
@if (!empty($selLang) && $selLang->rtl == 1)
  @section('styles')
    <style>
      form:not(.modal-form) input,
      form:not(.modal-form) textarea,
      form:not(.modal-form) select,
      select[name='userLanguage'] {
        direction: rtl;
      }

      form:not(.modal-form) .note-editor.note-frame .note-editing-area .note-editable {
        direction: rtl;
        text-align: right;
      }
    </style>
  @endsection
@endif
@section('content')
  <div class="page-header">
    <h4 class="page-title">{{ __('Payment_Gateways') }}</h4>
    <ul class="breadcrumbs">
      <li class="nav-home">
        <a href="{{ route('user-dashboard') . '?language=' . request('language') }}">
          <i class="flaticon-home"></i>
        </a>
      </li>
      <li class="separator">
        <i class="flaticon-right-arrow"></i>
      </li>
      <li class="nav-item">
        <a href="#">{{ __('Payment_Gateways') }}</a>
      </li>
    </ul>
  </div>
  <div class="row">
    {{-- Paystack --}}
    <div class="col-lg-4">
      <div class="card">
        <form class="" action="{{ route('user.paystack.update') }}" method="post">
          @csrf
          <div class="card-header">
            <div class="row">
              <div class="col-lg-12">
                <div class="card-title">{{ __('Paystack') }}</div>
              </div>
            </div>
          </div>
          <div class="card-body pb-5">
            <div class="row">
              <div class="col-lg-12">
                @csrf
                @php
                  if (!empty($paystack)) {
                      $paystackInfo = json_decode($paystack->information, true);
                  } else {
                      $paystackInfo = [];
                  }

                @endphp
                <div class="form-group">
                  <label>{{ __('Paystack') }}</label>
                  <div class="selectgroup w-100">
                    <label class="selectgroup-item">
                      <input type="radio" name="status" value="1" class="selectgroup-input"
                        {{ $paystackInfo ? ($paystack->status == 1 ? 'checked' : '') : '' }}>
                      <span class="selectgroup-button"> {{ __('Active') }}</span>
                    </label>
                    <label class="selectgroup-item">
                      <input type="radio" name="status" value="0" class="selectgroup-input"
                        {{ $paystackInfo ? ($paystack->status == 0 ? 'checked' : '') : '' }}>
                      <span class="selectgroup-button"> {{ __('Deactive') }}</span>
                    </label>
                  </div>
                </div>
                <div class="form-group">
                  <label>{{ __('Paystack_Secret_Key') }}</label>
                  <input class="form-control" name="key" value="{{ $paystackInfo['key'] ?? '' }}">
                  @if ($errors->has('key'))
                    <p class="mb-0 text-danger">{{ $errors->first('key') }}</p>
                  @endif
                </div>

              </div>
            </div>
          </div>
          <div class="card-footer">
            <div class="form">
              <div class="form-group from-show-notify row">
                <div class="col-12 text-center">
                  <button type="submit" id="displayNotif" class="btn btn-success">{{ __('Update') }}</button>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>

    {{-- Mollie Payment --}}
    <div class="col-lg-4">
      <div class="card">
        <form class="" action="{{ route('user.mollie.update') }}" method="post">
          @csrf
          <div class="card-header">
            <div class="row">
              <div class="col-lg-12">
                <div class="card-title">{{ __('Mollie_Payment') }}</div>
              </div>
            </div>
          </div>


          <div class="card-body  pb-5">
            <div class="row">
              <div class="col-lg-12">
                @csrf
                @php

                  if (!empty($mollie)) {
                      $mollieInfo = json_decode($mollie->information, true);
                  } else {
                      $mollieInfo = [];
                  }

                @endphp
                <div class="form-group">
                  <label>{{ __('Mollie_Payment') }}</label>
                  <div class="selectgroup w-100">
                    <label class="selectgroup-item">
                      <input type="radio" name="status" value="1" class="selectgroup-input"
                        {{ $mollieInfo ? ($mollie->status == 1 ? 'checked' : '') : '' }}>
                      <span class="selectgroup-button">{{ __('Active') }}</span>
                    </label>
                    <label class="selectgroup-item">
                      <input type="radio" name="status" value="0" class="selectgroup-input"
                        {{ $mollieInfo ? ($mollie->status == 0 ? 'checked' : '') : '' }}>
                      <span class="selectgroup-button">{{ __('Deactive') }}</span>
                    </label>
                  </div>
                </div>

                <div class="form-group">
                  <label>{{ __('Mollie_Payment_Key') }}</label>
                  <input class="form-control" name="key" value="{{ $mollieInfo['key'] ?? '' }}">
                  @if ($errors->has('key'))
                    <p class="mb-0 text-danger">{{ $errors->first('key') }}</p>
                  @endif
                </div>

              </div>
            </div>
          </div>

          <div class="card-footer">
            <div class="form">
              <div class="form-group from-show-notify row">
                <div class="col-12 text-center">
                  <button type="submit" class="btn btn-success">{{ __('Update') }}</button>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>

    {{-- Yoco --}}
    <div class="col-lg-4">
      <div class="card">
        <form action="{{ route('user.yoco.update') }}" method="post">
          @csrf
          <div class="card-header">
            <div class="row">
              <div class="col-lg-12">
                <div class="card-title">{{ __('Yoco') }}</div>
              </div>
            </div>
          </div>

          <div class="card-body">
            <div class="row">
              <div class="col-lg-12">
                <div class="form-group">
                  <label>{{ __('Yoco Status') }}</label>
                  <div class="selectgroup w-100">
                    <label class="selectgroup-item">
                      <input type="radio" name="status" value="1" class="selectgroup-input"
                        {{ @$yoco->status == 1 ? 'checked' : '' }}>
                      <span class="selectgroup-button">{{ __('Active') }}</span>
                    </label>
                    <label class="selectgroup-item">
                      <input type="radio" name="status" value="0" class="selectgroup-input"
                        {{ @$yoco->status == 0 ? 'checked' : '' }}>
                      <span class="selectgroup-button">{{ __('Deactive') }}</span>
                    </label>
                  </div>
                  @if ($errors->has('status'))
                    <p class="mt-1 mb-0 text-danger">{{ $errors->first('status') }}</p>
                  @endif
                </div>

                @php
                  if (!empty($yoco)) {
                      $yocoInfo = json_decode($yoco->information, true);
                  } else {
                      $yocoInfo = [];
                  }
                @endphp


                <div class="form-group">
                  <label>{{ __('Secret_Key') }}</label>
                  <input type="text" class="form-control" name="secret_key"
                    value="{{ @$yocoInfo['secret_key'] }}">
                  @if ($errors->has('secret_key'))
                    <p class="mt-1 mb-0 text-danger">{{ $errors->first('secret_key') }}</p>
                  @endif
                </div>
              </div>
            </div>
          </div>

          <div class="card-footer">
            <div class="row">
              <div class="col-12 text-center">
                <button type="submit" class="btn btn-success">
                  {{ __('Update') }}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>

    {{-- xendit Information --}}
    <div class="col-lg-4">
      <div class="card">
        <form action="{{ route('user.xendit.update') }}" method="post">
          @csrf
          <div class="card-header">
            <div class="row">
              <div class="col-lg-12">
                <div class="card-title">{{ __('Xendit') }}</div>
              </div>
            </div>
          </div>

          <div class="card-body">
            <div class="row">
              <div class="col-lg-12">
                <div class="form-group">
                  <label>{{ __('Xendit Status') }}</label>
                  <div class="selectgroup w-100">
                    <label class="selectgroup-item">
                      <input type="radio" name="status" value="1" class="selectgroup-input"
                        {{ @$xendit->status == 1 ? 'checked' : '' }}>
                      <span class="selectgroup-button">{{ __('Active') }}</span>
                    </label>
                    <label class="selectgroup-item">
                      <input type="radio" name="status" value="0" class="selectgroup-input"
                        {{ @$xendit->status == 0 ? 'checked' : '' }}>
                      <span class="selectgroup-button">{{ __('Deactive') }}</span>
                    </label>
                  </div>
                  @if ($errors->has('status'))
                    <p class="mt-1 mb-0 text-danger">{{ $errors->first('status') }}</p>
                  @endif
                </div>

                @php
                  if (!empty($xendit)) {
                      $xenditInfo = json_decode(@$xendit->information, true);
                  } else {
                      $xenditInfo = [];
                  }
                @endphp

                <div class="form-group">
                  <label>{{ __('Secret_Key') }}</label>
                  <input type="text" class="form-control" name="secret_key"
                    value="{{ @$xenditInfo['secret_key'] }}">
                  @if ($errors->has('secret_key'))
                    <p class="mt-1 mb-0 text-danger">{{ $errors->first('secret_key') }}</p>
                  @endif
                </div>
              </div>
            </div>
          </div>

          <div class="card-footer">
            <div class="row">
              <div class="col-12 text-center">
                <button type="submit" class="btn btn-success">
                  {{ __('Update') }}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
    {{-- Perfect Money Information --}}
    <div class="col-lg-4">
      <div class="card">
        <form action="{{ route('user.perfect_money.update') }}" method="post">
          @csrf
          <div class="card-header">
            <div class="row">
              <div class="col-lg-12">
                <div class="card-title">{{ __('Perfect_Money') }}</div>
              </div>
            </div>
          </div>

          <div class="card-body">
            <div class="row">
              <div class="col-lg-12">
                <div class="form-group">
                  <label>{{ __('Perfect_Money_Status') }}</label>
                  <div class="selectgroup w-100">
                    <label class="selectgroup-item">
                      <input type="radio" name="status" value="1" class="selectgroup-input"
                        {{ @$perfect_money->status == 1 ? 'checked' : '' }}>
                      <span class="selectgroup-button">{{ __('Active') }}</span>
                    </label>
                    <label class="selectgroup-item">
                      <input type="radio" name="status" value="0" class="selectgroup-input"
                        {{ @$perfect_money->status == 0 ? 'checked' : '' }}>
                      <span class="selectgroup-button">{{ __('Deactive') }}</span>
                    </label>
                  </div>
                  @if ($errors->has('status'))
                    <p class="mt-1 mb-0 text-danger">{{ $errors->first('status') }}</p>
                  @endif
                </div>

                @php
                  if (!empty($perfect_money)) {
                      $perfect_moneyInfo = json_decode($perfect_money->information, true);
                  } else {
                      $perfect_moneyInfo = [];
                  }
                @endphp

                <div class="form-group">
                  <label>{{ __('Perfect_Money_Wallet_Id') }}</label>
                  <input type="text" class="form-control" name="perfect_money_wallet_id"
                    value="{{ @$perfect_moneyInfo['perfect_money_wallet_id'] }}">
                  @if ($errors->has('perfect_money_wallet_id'))
                    <p class="mt-1 mb-0 text-danger">{{ $errors->first('perfect_money_wallet_id') }}
                    </p>
                  @endif

                  <p class="text-warning mt-1 mb-0">{{ __('You_will_get_wallet_id_form_here') }}</p>
                  <a href="https://prnt.sc/bM3LqLXBduaq" target="_blank">https://prnt.sc/bM3LqLXBduaq</a>
                </div>
              </div>
            </div>
          </div>

          <div class="card-footer">
            <div class="row">
              <div class="col-12 text-center">
                <button type="submit" class="btn btn-success">
                  {{ __('Update') }}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>

    {{-- Flutterwave --}}
    <div class="col-lg-4">
      <div class="card">
        <form class="" action="{{ route('user.flutterwave.update') }}" method="post">
          @csrf
          <div class="card-header">
            <div class="row">
              <div class="col-lg-12">
                <div class="card-title">{{ __('Flutterwave') }}</div>
              </div>
            </div>
          </div>
          <div class="card-body pt-5 pb-5">
            <div class="row">
              <div class="col-lg-12">
                @csrf
                @php
                  if (!empty($flutterwave)) {
                      $flutterwaveInfo = json_decode($flutterwave->information, true);
                  } else {
                      $flutterwaveInfo = [];
                  }

                @endphp
                <div class="form-group">
                  <label>{{ __('Flutterwave') }}</label>
                  <div class="selectgroup w-100">
                    <label class="selectgroup-item">
                      <input type="radio" name="status" value="1" class="selectgroup-input"
                        {{ $flutterwaveInfo ? ($flutterwave->status == 1 ? 'checked' : '') : '' }}>
                      <span class="selectgroup-button">{{ __('Active') }}</span>
                    </label>
                    <label class="selectgroup-item">
                      <input type="radio" name="status" value="0" class="selectgroup-input"
                        {{ $flutterwaveInfo ? ($flutterwave->status == 0 ? 'checked' : '') : '' }}>
                      <span class="selectgroup-button">{{ __('Deactive') }}</span>
                    </label>
                  </div>
                </div>
                <div class="form-group">
                  <label>{{ __('Flutterwave_Public_Key') }}</label>
                  <input class="form-control" name="public_key" value="{{ $flutterwaveInfo['public_key'] ?? '' }}">
                  @if ($errors->has('public_key'))
                    <p class="mb-0 text-danger">{{ $errors->first('public_key') }}</p>
                  @endif
                </div>
                <div class="form-group">
                  <label>{{ __('Flutterwave_Secret_Key') }}</label>
                  <input class="form-control" name="secret_key" value="{{ $flutterwaveInfo['secret_key'] ?? '' }}">
                  @if ($errors->has('secret_key'))
                    <p class="mb-0 text-danger">{{ $errors->first('secret_key') }}</p>
                  @endif
                </div>

              </div>
            </div>
          </div>
          <div class="card-footer">
            <div class="form">
              <div class="form-group from-show-notify row">
                <div class="col-12 text-center">
                  <button type="submit" class="btn btn-success">{{ __('Update') }}</button>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
    {{-- Razorpay --}}
    <div class="col-lg-4">
      <div class="card">
        <form class="" action="{{ route('user.razorpay.update') }}" method="post">
          @csrf
          <div class="card-header">
            <div class="row">
              <div class="col-lg-12">
                <div class="card-title">{{ __('Razorpay') }}</div>
              </div>
            </div>
          </div>


          <div class="card-body pt-5 pb-5">
            <div class="row">
              <div class="col-lg-12">
                @csrf
                @php
                  if (!empty($razorpay)) {
                      $razorpayInfo = json_decode($razorpay->information, true);
                  } else {
                      $razorpayInfo = [];
                  }

                @endphp
                <div class="form-group">
                  <label>{{ __('Razorpay') }}</label>
                  <div class="selectgroup w-100">
                    <label class="selectgroup-item">
                      <input type="radio" name="status" value="1" class="selectgroup-input"
                        {{ $razorpayInfo ? ($razorpay->status == 1 ? 'checked' : '') : '' }}>
                      <span class="selectgroup-button">{{ __('Active') }}</span>
                    </label>
                    <label class="selectgroup-item">
                      <input type="radio" name="status" value="0" class="selectgroup-input"
                        {{ $razorpayInfo ? ($razorpay->status == 0 ? 'checked' : '') : '' }}>
                      <span class="selectgroup-button">{{ __('Deactive') }}</span>
                    </label>
                  </div>
                </div>

                <div class="form-group">
                  <label>{{ __('Razorpay_Key') }}</label>
                  <input class="form-control" name="key" value="{{ $razorpayInfo['key'] ?? '' }}">
                  @if ($errors->has('key'))
                    <p class="mb-0 text-danger">{{ $errors->first('key') }}</p>
                  @endif
                </div>

                <div class="form-group">
                  <label>{{ __('Razorpay_Secret') }}</label>
                  <input class="form-control" name="secret" value="{{ $razorpayInfo['secret'] ?? '' }}">
                  @if ($errors->has('secret'))
                    <p class="mb-0 text-danger">{{ $errors->first('secret') }}</p>
                  @endif
                </div>

              </div>
            </div>
          </div>

          <div class="card-footer">
            <div class="form">
              <div class="form-group from-show-notify row">
                <div class="col-12 text-center">
                  <button type="submit" class="btn btn-success">{{ __('Update') }}</button>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
    {{-- Mercadopago --}}
    <div class="col-lg-4">
      <div class="card">
        <form class="" action="{{ route('user.mercadopago.update') }}" method="post">
          @csrf
          <div class="card-header">
            <div class="row">
              <div class="col-lg-12">
                <div class="card-title">{{ __('Mercadopago') }}</div>
              </div>
            </div>
          </div>


          <div class="card-body pt-5 pb-5">

            @csrf
            @php
              if (!empty($mercadopago)) {
                  $mercadopagoInfo = json_decode($mercadopago->information, true);
              } else {
                  $mercadopagoInfo = [];
              }

            @endphp
            <div class="form-group">
              <label>{{ __('Mercadopago') }}</label>
              <div class="selectgroup w-100">
                <label class="selectgroup-item">
                  <input type="radio" name="status" value="1" class="selectgroup-input"
                    {{ $mercadopagoInfo ? ($mercadopago->status == 1 ? 'checked' : '') : '' }}>
                  <span class="selectgroup-button">{{ __('Active') }}</span>
                </label>
                <label class="selectgroup-item">
                  <input type="radio" name="status" value="0" class="selectgroup-input"
                    {{ $mercadopagoInfo ? ($mercadopago->status == 0 ? 'checked' : '') : '' }}>
                  <span class="selectgroup-button">{{ __('Deactive') }}</span>
                </label>
              </div>
            </div>

            <div class="form-group">
              <label>{{ __('Mercado_Pago_Test_Mode') }}</label>
              <div class="selectgroup w-100">
                <label class="selectgroup-item">
                  <input type="radio" name="sandbox_check" value="1" class="selectgroup-input"
                    {{ $mercadopagoInfo ? ($mercadopagoInfo['sandbox_check'] == 1 ? 'checked' : '') : '' }}>
                  <span class="selectgroup-button">{{ __('Active') }}</span>
                </label>
                <label class="selectgroup-item">
                  <input type="radio" name="sandbox_check" value="0" class="selectgroup-input"
                    {{ $mercadopagoInfo ? ($mercadopagoInfo['sandbox_check'] == 0 ? 'checked' : '') : '' }}>
                  <span class="selectgroup-button">{{ __('Deactive') }}</span>
                </label>
              </div>
            </div>

            <div class="form-group">
              <label>{{ __('Mercadopago_Token') }}</label>
              <input class="form-control" name="token" value="{{ $mercadopagoInfo['token'] ?? '' }}">
              @if ($errors->has('token'))
                <p class="mb-0 text-danger">{{ $errors->first('token') }}</p>
              @endif
            </div>
          </div>

          <div class="card-footer">
            <div class="form">
              <div class="form-group from-show-notify row">
                <div class="col-12 text-center">
                  <button type="submit" class="btn btn-success">{{ __('Update') }}</button>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>

    {{-- Stripe --}}
    <div class="col-lg-4">
      <div class="card">
        <form class="" action="{{ route('user.stripe.update') }}" method="post">
          @csrf
          <div class="card-header">
            <div class="row">
              <div class="col-lg-12">
                <div class="card-title">{{ __('Stripe') }}</div>
              </div>
            </div>
          </div>
          <div class="card-body pt-5 pb-5">
            <div class="row">
              <div class="col-lg-12">
                @csrf
                @php

                  if (!empty($stripe)) {
                      $stripeInfo = json_decode($stripe->information, true);
                  } else {
                      $stripeInfo = [];
                  }

                @endphp
                <div class="form-group">
                  <label>{{ __('Stripe') }}</label>
                  <div class="selectgroup w-100">
                    <label class="selectgroup-item">
                      <input type="radio" name="status" value="1" class="selectgroup-input"
                        {{ $stripeInfo ? ($stripe->status == 1 ? 'checked' : '') : '' }}>
                      <span class="selectgroup-button">{{ __('Active') }}</span>
                    </label>
                    <label class="selectgroup-item">
                      <input type="radio" name="status" value="0" class="selectgroup-input"
                        {{ $stripeInfo ? ($stripe->status == 0 ? 'checked' : '') : '' }}>
                      <span class="selectgroup-button">{{ __('Deactive') }}</span>
                    </label>
                  </div>
                </div>
                <div class="form-group">
                  <label>{{ __('Stripe_Key') }}</label>
                  <input class="form-control" name="key" value="{{ $stripeInfo['key'] ?? '' }}">
                  @if ($errors->has('key'))
                    <p class="mb-0 text-danger">{{ $errors->first('key') }}</p>
                  @endif
                </div>
                <div class="form-group">
                  <label>{{ __('Stripe_Secret') }}</label>
                  <input class="form-control" name="secret" value="{{ $stripeInfo['secret'] ?? '' }}">
                  @if ($errors->has('secret'))
                    <p class="mb-0 text-danger">{{ $errors->first('secret') }}</p>
                  @endif
                </div>

              </div>
            </div>
          </div>
          <div class="card-footer">
            <div class="form">
              <div class="form-group from-show-notify row">
                <div class="col-12 text-center">
                  <button type="submit" id="displayNotif" class="btn btn-success">{{ __('Update') }}</button>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
    {{-- Midtrans Information --}}
    <div class="col-lg-4">
      <div class="card">
        <form action="{{ route('user.midtrans.update') }}" method="post">
          @csrf
          <div class="card-header">
            <div class="row">
              <div class="col-lg-12">
                <div class="card-title">{{ __('Midtrans') }}</div>
              </div>
            </div>
          </div>

          <div class="card-body">
            <div class="row">
              <div class="col-lg-12">
                <div class="form-group">
                  <label>{{ __('Midtrans_Status') }}</label>
                  <div class="selectgroup w-100">
                    <label class="selectgroup-item">
                      <input type="radio" name="status" value="1" class="selectgroup-input"
                        {{ @$midtrans->status == 1 ? 'checked' : '' }}>
                      <span class="selectgroup-button">{{ __('Active') }}</span>
                    </label>
                    <label class="selectgroup-item">
                      <input type="radio" name="status" value="0" class="selectgroup-input"
                        {{ @$midtrans->status == 0 ? 'checked' : '' }}>
                      <span class="selectgroup-button">{{ __('Deactive') }}</span>
                    </label>
                  </div>
                  @if ($errors->has('status'))
                    <p class="mt-1 mb-0 text-danger">{{ $errors->first('status') }}</p>
                  @endif
                </div>

                @php
                  if (!empty($midtrans)) {
                      $midtransInfo = json_decode($midtrans->information, true);
                  } else {
                      $midtransInfo = [];
                  }
                @endphp

                <div class="form-group">
                  <label>{{ __('Midtrans_Test_Mode') }}</label>
                  <div class="selectgroup w-100">
                    <label class="selectgroup-item">
                      <input type="radio" name="is_production" value="1" class="selectgroup-input"
                        {{ @$midtransInfo['is_production'] == 1 ? 'checked' : '' }}>
                      <span class="selectgroup-button">{{ __('Active') }}</span>
                    </label>
                    <label class="selectgroup-item">
                      <input type="radio" name="is_production" value="0" class="selectgroup-input"
                        {{ @$midtransInfo['is_production'] == 0 ? 'checked' : '' }}>
                      <span class="selectgroup-button">{{ __('Deactive') }}</span>
                    </label>
                  </div>
                  @if ($errors->has('is_production'))
                    <p class="mt-1 mb-0 text-danger">{{ $errors->first('is_production') }}</p>
                  @endif
                </div>

                <div class="form-group">
                  <label>{{ __('Server_Key') }}</label>
                  <input type="text" class="form-control" name="server_key"
                    value="{{ @$midtransInfo['server_key'] }}">
                  @if ($errors->has('server_key'))
                    <p class="mt-1 mb-0 text-danger">{{ $errors->first('server_key') }}</p>
                  @endif
                </div>
                <p class="text-warning mb-0"> {{ __('Your_Success_URL') }} :
                  {{ route('midtrans.bank_notify') }} </p>
                <p class="text-warning mb-0"> {{ __('Your_Cancel_URL') }} :
                  {{ route('midtrans.cancel') }} </p>
                <p class="text-warning mb-0">
                  <strong></strong>{{ __('Set_these_URLs_in_Midtrans_Dashboard_like_this') }} :
                </p>
                <a href="https://prnt.sc/OiucUCeYJIXo" target="_blank">https://prnt.sc/OiucUCeYJIXo</a>
              </div>
            </div>
          </div>

          <div class="card-footer">
            <div class="row">
              <div class="col-12 text-center">
                <button type="submit" class="btn btn-success">
                  {{ __('Update') }}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>

    {{-- myfatoorah Information --}}
    <div class="col-lg-4">
      <div class="card">
        <form action="{{ route('user.myfatoorah.update') }}" method="post">
          @csrf
          <div class="card-header">
            <div class="row">
              <div class="col-lg-12">
                <div class="card-title">{{ __('MyFatoorah') }}</div>
              </div>
            </div>
          </div>

          <div class="card-body">
            <div class="row">
              <div class="col-lg-12">
                <div class="form-group">
                  <label>{{ __('MyFatoorah_Status') }}</label>
                  <div class="selectgroup w-100">
                    <label class="selectgroup-item">
                      <input type="radio" name="status" value="1" class="selectgroup-input"
                        {{ @$myfatoorah->status == 1 ? 'checked' : '' }}>
                      <span class="selectgroup-button">{{ __('Active') }}</span>
                    </label>
                    <label class="selectgroup-item">
                      <input type="radio" name="status" value="0" class="selectgroup-input"
                        {{ @$myfatoorah->status == 0 ? 'checked' : '' }}>
                      <span class="selectgroup-button">{{ __('Deactive') }}</span>
                    </label>
                  </div>
                  @if ($errors->has('status'))
                    <p class="mt-1 mb-0 text-danger">{{ $errors->first('status') }}</p>
                  @endif
                </div>

                @php
                  if (!empty($myfatoorah)) {
                      $myfatoorahInfo = json_decode($myfatoorah->information, true);
                  } else {
                      $myfatoorahInfo = [];
                  }
                @endphp
                <div class="form-group">
                  <label>{{ __('Sandbox_Status') }}</label>
                  <div class="selectgroup w-100">
                    <label class="selectgroup-item">
                      <input type="radio" name="sandbox_status" value="1" class="selectgroup-input"
                        {{ @$myfatoorahInfo['sandbox_status'] == 1 ? 'checked' : '' }}>
                      <span class="selectgroup-button">{{ __('Active') }}</span>
                    </label>
                    <label class="selectgroup-item">
                      <input type="radio" name="sandbox_status" value="0" class="selectgroup-input"
                        {{ @$myfatoorahInfo['sandbox_status'] == 0 ? 'checked' : '' }}>
                      <span class="selectgroup-button">{{ __('Deactive') }}</span>
                    </label>
                  </div>
                  @if ($errors->has('sandbox_status'))
                    <p class="mt-1 mb-0 text-danger">{{ $errors->first('sandbox_status') }}</p>
                  @endif
                </div>

                <div class="form-group">
                  <label>{{ __('Token') }}</label>
                  <input type="text" class="form-control" name="token" value="{{ @$myfatoorahInfo['token'] }}">
                  @if ($errors->has('token'))
                    <p class="mt-1 mb-0 text-danger">{{ $errors->first('token') }}</p>
                  @endif
                </div>
              </div>
            </div>
          </div>

          <div class="card-footer">
            <div class="row">
              <div class="col-12 text-center">
                <button type="submit" class="btn btn-success">
                  {{ __('Update') }}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>

    {{-- Paypal --}}
    <div class="col-lg-4">
      <div class="card">
        <form action="{{ route('user.paypal.update') }}" method="post">
          @csrf
          <div class="card-header">
            <div class="row">
              <div class="col-lg-12">
                <div class="card-title">{{ __('Paypal') }}</div>
              </div>
            </div>
          </div>
          <div class="card-body pt-5 pb-5">
            <div class="row">
              <div class="col-lg-12">
                @csrf

                <div class="form-group">
                  <label>{{ __('Paypal') }}</label>
                  <div class="selectgroup w-100">
                    <label class="selectgroup-item">
                      <input type="radio" name="status" value="1" class="selectgroup-input"
                        {{ @$paypal->status == 1 ? 'checked' : '' }}>
                      <span class="selectgroup-button">{{ __('Active') }}</span>
                    </label>
                    <label class="selectgroup-item">
                      <input type="radio" name="status" value="0" class="selectgroup-input"
                        {{ @$paypal->status == 0 ? 'checked' : '' }}>
                      <span class="selectgroup-button">{{ __('Deactive') }}</span>
                    </label>
                  </div>
                </div>
                @php
                  if (!empty($paypal)) {
                      $paypalInfo = json_decode($paypal->information, true);
                  } else {
                      $paypalInfo = [];
                  }

                @endphp
                <div class="form-group">
                  <label>{{ __('Paypal_Test_Mode') }}</label>
                  <div class="selectgroup w-100">
                    <label class="selectgroup-item">
                      <input type="radio" name="sandbox_check" value="1" class="selectgroup-input"
                        {{ $paypalInfo ? ($paypalInfo['sandbox_check'] == 1 ? 'checked' : '') : '' }}>
                      <span class="selectgroup-button">{{ __('Active') }}</span>
                    </label>
                    <label class="selectgroup-item">
                      <input type="radio" name="sandbox_check" value="0" class="selectgroup-input"
                        {{ $paypalInfo ? ($paypalInfo['sandbox_check'] == 0 ? 'checked' : '') : '' }}>
                      <span class="selectgroup-button">{{ __('Deactive') }}</span>
                    </label>
                  </div>
                </div>
                <div class="form-group">
                  <label>{{ __('Paypal_Client_ID') }}</label>
                  <input class="form-control" name="client_id" value="{{ $paypalInfo['client_id'] ?? '' }}">
                  @if ($errors->has('client_id'))
                    <p class="mb-0 text-danger">{{ $errors->first('client_id') }}</p>
                  @endif
                </div>
                <div class="form-group">
                  <label>{{ __('Paypal_Client_Secret') }}</label>
                  <input class="form-control" name="client_secret" value="{{ $paypalInfo['client_secret'] ?? '' }}">
                  @if ($errors->has('client_secret'))
                    <p class="mb-0 text-danger">{{ $errors->first('client_secret') }}</p>
                  @endif
                </div>

              </div>
            </div>
          </div>
          <div class="card-footer">
            <div class="form">
              <div class="form-group from-show-notify row">
                <div class="col-12 text-center">
                  <button type="submit" id="displayNotif" class="btn btn-success">{{ __('Update') }}</button>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>

    {{-- Instamojo --}}
    <div class="col-lg-4">
      <div class="card">
        <form class="" action="{{ route('user.instamojo.update') }}" method="post">
          @csrf
          <div class="card-header">
            <div class="row">
              <div class="col-lg-12">
                <div class="card-title">{{ __('Instamojo') }} </div>
              </div>
            </div>
          </div>


          <div class="card-body pt-5 pb-5">
            <div class="row">
              <div class="col-lg-12">
                @csrf
                @php
                  if (!empty($instamojo)) {
                      $instamojoInfo = json_decode($instamojo->information, true);
                  } else {
                      $instamojoInfo = [];
                  }

                @endphp
                <div class="form-group">
                  <label>{{ __('Instamojo') }}</label>
                  <div class="selectgroup w-100">
                    <label class="selectgroup-item">
                      <input type="radio" name="status" value="1" class="selectgroup-input"
                        {{ $instamojo ? ($instamojo->status == 1 ? 'checked' : '') : '' }}>
                      <span class="selectgroup-button">{{ __('Active') }}</span>
                    </label>
                    <label class="selectgroup-item">
                      <input type="radio" name="status" value="0" class="selectgroup-input"
                        {{ $instamojo ? ($instamojo->status == 0 ? 'checked' : '') : '' }}>
                      <span class="selectgroup-button">{{ __('Deactive') }}</span>
                    </label>
                  </div>
                </div>
                <div class="form-group">
                  <label>{{ __('Test_Mode') }}</label>
                  <div class="selectgroup w-100">
                    <label class="selectgroup-item">
                      <input type="radio" name="sandbox_check" value="1" class="selectgroup-input"
                        {{ $instamojoInfo ? ($instamojoInfo['sandbox_check'] == 1 ? 'checked' : '') : '' }}>
                      <span class="selectgroup-button">{{ __('Active') }}</span>
                    </label>
                    <label class="selectgroup-item">
                      <input type="radio" name="sandbox_check" value="0" class="selectgroup-input"
                        {{ $instamojoInfo ? ($instamojoInfo['sandbox_check'] == 0 ? 'checked' : '') : '' }}>
                      <span class="selectgroup-button">{{ __('Deactive') }}</span>
                    </label>
                  </div>
                </div>
                <div class="form-group">
                  <label>{{ __('Instamojo_API_Key') }}</label>
                  <input class="form-control" name="key" value="{{ $instamojoInfo['key'] ?? '' }}">
                  @if ($errors->has('key'))
                    <p class="mb-0 text-danger">{{ $errors->first('key') }}</p>
                  @endif
                </div>
                <div class="form-group">
                  <label>{{ __('Instamojo_Auth_Token') }}</label>
                  <input class="form-control" name="token" value="{{ $instamojoInfo['token'] ?? '' }}">
                  @if ($errors->has('token'))
                    <p class="mb-0 text-danger">{{ $errors->first('token') }}</p>
                  @endif
                </div>

              </div>
            </div>
          </div>

          <div class="card-footer">
            <div class="form">
              <div class="form-group from-show-notify row">
                <div class="col-12 text-center">
                  <button type="submit" class="btn btn-success">{{ __('Update') }}</button>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
    {{-- iyzico --}}
    <div class="col-lg-4">
      <div class="card">
        <form action="{{ route('user.iyzico.update') }}" method="post">
          @csrf
          <div class="card-header">
            <div class="row">
              <div class="col-lg-12">
                <div class="card-title">{{ __('Iyzico') }}</div>
              </div>
            </div>
          </div>

          <div class="card-body">
            <div class="row">
              <div class="col-lg-12">
                <div class="form-group">
                  <label>{{ __('Iyzico_Status') }}</label>
                  <div class="selectgroup w-100">
                    <label class="selectgroup-item">
                      <input type="radio" name="status" value="1" class="selectgroup-input"
                        {{ @$iyzico->status == 1 ? 'checked' : '' }}>
                      <span class="selectgroup-button">{{ __('Active') }}</span>
                    </label>
                    <label class="selectgroup-item">
                      <input type="radio" name="status" value="0" class="selectgroup-input"
                        {{ @$iyzico->status == 0 ? 'checked' : '' }}>
                      <span class="selectgroup-button">{{ __('Deactive') }}</span>
                    </label>
                  </div>
                  @if ($errors->has('status'))
                    <p class="mt-1 mb-0 text-danger">{{ $errors->first('status') }}</p>
                  @endif
                </div>

                @php
                  if (!empty($iyzico)) {
                      $iyzicoInfo = json_decode($iyzico->information, true);
                  } else {
                      $iyzicoInfo = [];
                  }
                @endphp

                <div class="form-group">
                  <label>{{ __('Iyzico_Test_Mode') }}</label>
                  <div class="selectgroup w-100">
                    <label class="selectgroup-item">
                      <input type="radio" name="sandbox_status" value="1" class="selectgroup-input"
                        {{ @$iyzicoInfo['sandbox_status'] == 1 ? 'checked' : '' }}>
                      <span class="selectgroup-button">{{ __('Active') }}</span>
                    </label>
                    <label class="selectgroup-item">
                      <input type="radio" name="sandbox_status" value="0" class="selectgroup-input"
                        {{ @$iyzicoInfo['sandbox_status'] == 0 ? 'checked' : '' }}>
                      <span class="selectgroup-button">{{ __('Deactive') }}</span>
                    </label>
                  </div>
                  @if ($errors->has('sandbox_status'))
                    <p class="mt-1 mb-0 text-danger">{{ $errors->first('sandbox_status') }}</p>
                  @endif
                </div>

                <div class="form-group">
                  <label>{{ __('Api_Key') }}</label>
                  <input type="text" class="form-control" name="api_key" value="{{ @$iyzicoInfo['api_key'] }}">
                  @if ($errors->has('api_key'))
                    <p class="mt-1 mb-0 text-danger">{{ $errors->first('api_key') }}</p>
                  @endif
                </div>
                <div class="form-group">
                  <label>{{ __('Secret_Key') }}</label>
                  <input type="text" class="form-control" name="secret_key"
                    value="{{ @$iyzicoInfo['secret_key'] }}">
                  @if ($errors->has('secret_key'))
                    <p class="mt-1 mb-0 text-danger">{{ $errors->first('secret_key') }}</p>
                  @endif
                </div>
              </div>
            </div>
          </div>

          <div class="card-footer">
            <div class="row">
              <div class="col-12 text-center">
                <button type="submit" class="btn btn-success">
                  {{ __('Update') }}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>

    {{-- toyyibpay Information --}}
    <div class="col-lg-4">
      <div class="card">
        <form action="{{ route('user.toyyibpay.update') }}" method="post">
          @csrf
          <div class="card-header">
            <div class="row">
              <div class="col-lg-12">
                <div class="card-title">{{ __('Toyyibpay') }}</div>
              </div>
            </div>
          </div>

          <div class="card-body">
            <div class="row">
              <div class="col-lg-12">
                <div class="form-group">
                  <label>{{ __('Toyyibpay_Status') }}</label>
                  <div class="selectgroup w-100">
                    <label class="selectgroup-item">
                      <input type="radio" name="status" value="1" class="selectgroup-input"
                        {{ @$toyyibpay->status == 1 ? 'checked' : '' }}>
                      <span class="selectgroup-button">{{ __('Active') }}</span>
                    </label>
                    <label class="selectgroup-item">
                      <input type="radio" name="status" value="0" class="selectgroup-input"
                        {{ @$toyyibpay->status == 0 ? 'checked' : '' }}>
                      <span class="selectgroup-button">{{ __('Deactive') }}</span>
                    </label>
                  </div>
                  @if ($errors->has('status'))
                    <p class="mt-1 mb-0 text-danger">{{ $errors->first('status') }}</p>
                  @endif
                </div>

                @php
                  if (!empty($toyyibpay)) {
                      $toyyibpayInfo = json_decode($toyyibpay->information, true);
                  } else {
                      $toyyibpayInfo = [];
                  }
                @endphp

                <div class="form-group">
                  <label>{{ __('Toyyibpay_Test_Mode') }}</label>
                  <div class="selectgroup w-100">
                    <label class="selectgroup-item">
                      <input type="radio" name="sandbox_status" value="1" class="selectgroup-input"
                        {{ @$toyyibpayInfo['sandbox_status'] == 1 ? 'checked' : '' }}>
                      <span class="selectgroup-button">{{ __('Active') }}</span>
                    </label>
                    <label class="selectgroup-item">
                      <input type="radio" name="sandbox_status" value="0" class="selectgroup-input"
                        {{ @$toyyibpayInfo['sandbox_status'] == 0 ? 'checked' : '' }}>
                      <span class="selectgroup-button">{{ __('Deactive') }}</span>
                    </label>
                  </div>
                  @if ($errors->has('sandbox_status'))
                    <p class="mt-1 mb-0 text-danger">{{ $errors->first('sandbox_status') }}</p>
                  @endif
                </div>

                <div class="form-group">
                  <label>{{ __('Secret_Key') }}</label>
                  <input type="text" class="form-control" name="secret_key"
                    value="{{ @$toyyibpayInfo['secret_key'] }}">
                  @if ($errors->has('secret_key'))
                    <p class="mt-1 mb-0 text-danger">{{ $errors->first('secret_key') }}</p>
                  @endif
                </div>
                <div class="form-group">
                  <label>{{ __('Category_Code') }}</label>
                  <input type="text" class="form-control" name="category_code"
                    value="{{ @$toyyibpayInfo['category_code'] }}">
                  @if ($errors->has('category_code'))
                    <p class="mt-1 mb-0 text-danger">{{ $errors->first('category_code') }}</p>
                  @endif
                </div>
              </div>
            </div>
          </div>

          <div class="card-footer">
            <div class="row">
              <div class="col-12 text-center">
                <button type="submit" class="btn btn-success">
                  {{ __('Update') }}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>

    {{-- paytabs Information --}}
    <div class="col-lg-4">
      <div class="card">
        <form action="{{ route('user.paytabs.update') }}" method="post">
          @csrf
          <div class="card-header">
            <div class="row">
              <div class="col-lg-12">
                <div class="card-title">{{ __('Paytabs') }}</div>
              </div>
            </div>
          </div>

          <div class="card-body">
            <div class="row">
              <div class="col-lg-12">
                <div class="form-group">
                  <label>{{ __('Paytabs_Status') }}</label>
                  <div class="selectgroup w-100">
                    <label class="selectgroup-item">
                      <input type="radio" name="status" value="1" class="selectgroup-input"
                        {{ @$paytabs->status == 1 ? 'checked' : '' }}>
                      <span class="selectgroup-button">{{ __('Active') }}</span>
                    </label>
                    <label class="selectgroup-item">
                      <input type="radio" name="status" value="0" class="selectgroup-input"
                        {{ @$paytabs->status == 0 ? 'checked' : '' }}>
                      <span class="selectgroup-button">{{ __('Deactive') }}</span>
                    </label>
                  </div>
                  @if ($errors->has('status'))
                    <p class="mt-1 mb-0 text-danger">{{ $errors->first('status') }}</p>
                  @endif
                </div>

                @php
                  if (!empty($paytabs)) {
                      $paytabsInfo = json_decode($paytabs->information, true);
                  } else {
                      $paytabsInfo = [];
                  }
                @endphp

                <div class="form-group">
                  <label>{{ __('Country') }}</label>
                  <select name="country" id="" class="form-control">
                    <option value="global" @selected(@$paytabsInfo['country'] == 'global')>{{ __('Global') }}</option>
                    <option value="sa" @selected(@$paytabsInfo['country'] == 'sa')>{{ __('Saudi_Arabia') }}
                    </option>
                    <option value="uae" @selected(@$paytabsInfo['country'] == 'uae')>
                      {{ __('United_Arab_Emirates') }}</option>
                    <option value="egypt" @selected(@$paytabsInfo['country'] == 'egypt')>{{ __('Egypt') }}</option>
                    <option value="oman" @selected(@$paytabsInfo['country'] == 'oman')>{{ __('Oman') }}</option>
                    <option value="jordan" @selected(@$paytabsInfo['country'] == 'jordan')>{{ __('Jordan') }}</option>
                    <option value="iraq" @selected(@$paytabsInfo['country'] == 'iraq')>{{ __('Iraq') }}</option>
                  </select>
                  @if ($errors->has('country'))
                    <p class="mt-1 mb-0 text-danger">{{ $errors->first('server_key') }}</p>
                  @endif
                </div>

                <div class="form-group">
                  <label>{{ __('Server_Key') }}</label>
                  <input type="text" class="form-control" name="server_key"
                    value="{{ @$paytabsInfo['server_key'] }}">
                  @if ($errors->has('server_key'))
                    <p class="mt-1 mb-0 text-danger">{{ $errors->first('server_key') }}</p>
                  @endif
                </div>
                <div class="form-group">
                  <label>{{ __('Profile_Id') }}</label>
                  <input type="text" class="form-control" name="profile_id"
                    value="{{ @$paytabsInfo['profile_id'] }}">
                  @if ($errors->has('profile_id'))
                    <p class="mt-1 mb-0 text-danger">{{ $errors->first('profile_id') }}</p>
                  @endif
                </div>
                <div class="form-group">
                  <label>{{ __('API_Endpoint') }}</label>
                  <input type="text" class="form-control" name="api_endpoint"
                    value="{{ @$paytabsInfo['api_endpoint'] }}">
                  @if ($errors->has('api_endpoint'))
                    <p class="mt-1 mb-0 text-danger">{{ $errors->first('api_endpoint') }}</p>
                  @endif
                  <p class="mt-1 mb-0 text-warning">
                    {{ __('You_will_get_your_API_Endpoit_from_PayTabs_Dashboard') }} </p>
                  <strong class="text-warning">{{ __('Step_1') }}:</strong> <a href="https://prnt.sc/McaCbxt75fyi"
                    target="_blank">https://prnt.sc/McaCbxt75fyi</a><br>
                  <strong class="text-warning">{{ __('Step_2') }}:</strong> <a href="https://prnt.sc/DgztAyHVR2o8"
                    target="_blank">https://prnt.sc/DgztAyHVR2o8</a>
                </div>
              </div>
            </div>
          </div>

          <div class="card-footer">
            <div class="row">
              <div class="col-12 text-center">
                <button type="submit" class="btn btn-success">
                  {{ __('Update') }}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>

    {{-- Phonepe --}}
    <div class="col-lg-4">
      <div class="card">
        <form class="" action="{{ route('user.phonepe.update') }}" method="post">
          @csrf
          <div class="card-header">
            <div class="row">
              <div class="col-lg-12">
                <div class="card-title">{{ __('Phonepe') }}</div>
              </div>
            </div>
          </div>


          <div class="card-body pt-5 pb-5">

            @csrf
            @php
              if (!empty($phonepe)) {
                  $phonepeInfo = json_decode($phonepe->information, true);
              } else {
                  $phonepeInfo = [];
              }
            @endphp
            <div class="form-group">
              <label>{{ __('Phonepe') }}</label>
              <div class="selectgroup w-100">
                <label class="selectgroup-item">
                  <input type="radio" name="status" value="1" class="selectgroup-input"
                    {{ $phonepeInfo ? (@$phonepe->status == 1 ? 'checked' : '') : '' }}>
                  <span class="selectgroup-button">{{ __('Active') }}</span>
                </label>
                <label class="selectgroup-item">
                  <input type="radio" name="status" value="0" class="selectgroup-input"
                    {{ $phonepeInfo ? (@$phonepe->status == 0 ? 'checked' : '') : '' }}>
                  <span class="selectgroup-button">{{ __('Deactive') }}</span>
                </label>
              </div>
            </div>

            <div class="form-group">
              <label>{{ __('Sandbox_Status') }}</label>
              <div class="selectgroup w-100">
                <label class="selectgroup-item">
                  <input type="radio" name="sandbox_check" value="1" class="selectgroup-input"
                    {{ $phonepeInfo ? ($phonepeInfo['sandbox_check'] == 1 ? 'checked' : '') : '' }}>
                  <span class="selectgroup-button">{{ __('Active') }}</span>
                </label>
                <label class="selectgroup-item">
                  <input type="radio" name="sandbox_check" value="0" class="selectgroup-input"
                    {{ @$phonepeInfo ? (@$phonepeInfo['sandbox_check'] == 0 ? 'checked' : '') : '' }}>
                  <span class="selectgroup-button">{{ __('Deactive') }}</span>
                </label>
              </div>
            </div>

            <div class="form-group">
              <label>{{ __('MerchantId') }}</label>
              <input class="form-control" name="merchant_id" value="{{ @$phonepeInfo['merchant_id'] ?? '' }}">
              @if ($errors->has('merchant_id'))
                <p class="mb-0 text-danger">{{ $errors->first('merchant_id') }}</p>
              @endif
            </div>
            <div class="form-group">
              <label>{{ __('Salt_Key') }}</label>
              <input class="form-control" name="salt_key" value="{{ @$phonepeInfo['salt_key'] ?? '' }}">
              @if ($errors->has('salt_key'))
                <p class="mb-0 text-danger">{{ $errors->first('salt_key') }}</p>
              @endif
            </div>
            <div class="form-group">
              <label>{{ __('Salt_Index') }}</label>
              <input class="form-control" name="salt_index" value="{{ @$phonepeInfo['salt_index'] ?? '' }}">
              @if ($errors->has('salt_index'))
                <p class="mb-0 text-danger">{{ $errors->first('salt_index') }}</p>
              @endif
            </div>
          </div>

          <div class="card-footer">
            <div class="form">
              <div class="form-group from-show-notify row">
                <div class="col-12 text-center">
                  <button type="submit" class="btn btn-success">{{ __('Update') }}</button>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>

    {{-- Paytm --}}
    <div class="col-lg-4">
      <div class="card">
        <form class="" action="{{ route('user.paytm.update') }}" method="post">
          @csrf
          <div class="card-header">
            <div class="row">
              <div class="col-lg-12">
                <div class="card-title">{{ __('Paytm') }}</div>
              </div>
            </div>
          </div>
          <div class="card-body pt-5 pb-5">
            <div class="row">
              <div class="col-lg-12">
                @csrf
                @php
                  if (!empty($paytm)) {
                      $paytmInfo = json_decode($paytm->information, true);
                  } else {
                      $paytmInfo = [];
                  }

                @endphp
                <div class="form-group">
                  <label>{{ __('Paytm') }}</label>
                  <div class="selectgroup w-100">
                    <label class="selectgroup-item">
                      <input type="radio" name="status" value="1" class="selectgroup-input"
                        {{ $paytmInfo ? ($paytm->status == 1 ? 'checked' : '') : '' }}>
                      <span class="selectgroup-button">{{ __('Active') }}</span>
                    </label>
                    <label class="selectgroup-item">
                      <input type="radio" name="status" value="0" class="selectgroup-input"
                        {{ $paytmInfo ? ($paytm->status == 0 ? 'checked' : '') : '' }}>
                      <span class="selectgroup-button">{{ __('Deactive') }}</span>
                    </label>
                  </div>
                </div>
                <div class="form-group">
                  <label>{{ __('Paytm_Environment') }}</label>
                  <div class="selectgroup w-100">
                    <label class="selectgroup-item">
                      <input type="radio" name="environment" value="local" class="selectgroup-input"
                        {{ $paytmInfo ? ($paytmInfo['environment'] == 'local' ? 'checked' : '') : '' }}>
                      <span class="selectgroup-button">{{ __('Local') }}</span>
                    </label>
                    <label class="selectgroup-item">
                      <input type="radio" name="environment" value="production" class="selectgroup-input"
                        {{ $paytmInfo ? ($paytmInfo['environment'] == 'production' ? 'checked' : '') : '' }}>
                      <span class="selectgroup-button">{{ __('Production') }}</span>
                    </label>
                  </div>
                  @if ($errors->has('environment'))
                    <p class="mb-0 text-danger">{{ $errors->first('environment') }}</p>
                  @endif
                </div>
                <div class="form-group">
                  <label>{{ __('Paytm_Merchant_Key') }}</label>
                  <input class="form-control" name="secret" value="{{ $paytmInfo['secret'] ?? '' }}">
                  @if ($errors->has('secret'))
                    <p class="mb-0 text-danger">{{ $errors->first('secret') }}</p>
                  @endif
                </div>
                <div class="form-group">
                  <label>{{ __('Paytm_Merchant_mid') }}</label>
                  <input class="form-control" name="merchant" value="{{ $paytmInfo['merchant'] ?? '' }}">
                  @if ($errors->has('merchant'))
                    <p class="mb-0 text-danger">{{ $errors->first('merchant') }}</p>
                  @endif
                </div>
                <div class="form-group">
                  <label>{{ __('Paytm_Merchant_website') }}</label>
                  <input class="form-control" name="website" value="{{ $paytmInfo['website'] ?? '' }}">
                  @if ($errors->has('website'))
                    <p class="mb-0 text-danger">{{ $errors->first('website') }}</p>
                  @endif
                </div>
                <div class="form-group">
                  <label>{{ __('Industry_type_id') }}</label>
                  <input class="form-control" name="industry" value="{{ $paytmInfo['industry'] ?? '' }}">
                  @if ($errors->has('industry'))
                    <p class="mb-0 text-danger">{{ $errors->first('industry') }}</p>
                  @endif
                </div>

              </div>
            </div>
          </div>

          <div class="card-footer">
            <div class="form">
              <div class="form-group from-show-notify row">
                <div class="col-12 text-center">
                  <button type="submit" class="btn btn-success">{{ __('Update') }}</button>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
    {{-- Authorize --}}
    <div class="col-lg-4">
      <div class="card">
        <form class="" action="{{ route('user.anet.update') }}" method="post">
          @csrf
          <div class="card-header">
            <div class="row">
              <div class="col-lg-12">
                <div class="card-title">{{ __('Authorize_Net') }}</div>
              </div>
            </div>
          </div>


          <div class="card-body pt-5 pb-5">
            <div class="row">
              <div class="col-lg-12">
                @csrf
                @php
                  if (!empty($anet)) {
                      $anetInfo = json_decode($anet->information, true);
                  } else {
                      $anetInfo = [];
                  }

                @endphp
                <div class="form-group">
                  <label>{{ __('Authorize_Net') }}</label>
                  <div class="selectgroup w-100">
                    <label class="selectgroup-item">
                      <input type="radio" name="status" value="1" class="selectgroup-input"
                        {{ $anetInfo ? ($anet->status == 1 ? 'checked' : '') : '' }}>
                      <span class="selectgroup-button">{{ __('Active') }}</span>
                    </label>
                    <label class="selectgroup-item">
                      <input type="radio" name="status" value="0" class="selectgroup-input"
                        {{ $anetInfo ? ($anet->status == 0 ? 'checked' : '') : '' }}>
                      <span class="selectgroup-button">{{ __('Deactive') }}</span>
                    </label>
                  </div>
                </div>

                <div class="form-group">
                  <label>{{ __('Authorize_Net_Test_Mode') }}</label>
                  <div class="selectgroup w-100">
                    <label class="selectgroup-item">
                      <input type="radio" name="sandbox_check" value="1" class="selectgroup-input"
                        {{ $anetInfo ? ($anetInfo['sandbox_check'] == 1 ? 'checked' : '') : '' }}>
                      <span class="selectgroup-button">{{ __('Active') }}</span>
                    </label>
                    <label class="selectgroup-item">
                      <input type="radio" name="sandbox_check" value="0" class="selectgroup-input"
                        {{ $anetInfo ? ($anetInfo['sandbox_check'] == 0 ? 'checked' : '') : '' }}>
                      <span class="selectgroup-button">{{ __('Deactive') }}</span>
                    </label>
                  </div>
                </div>

                <div class="form-group">
                  <label>{{ __('API_Login_ID') }}</label>
                  <input class="form-control" name="login_id" value="{{ $anetInfo['login_id'] ?? '' }}">
                  @if ($errors->has('login_id'))
                    <p class="mb-0 text-danger">{{ $errors->first('login_id') }}</p>
                  @endif
                </div>

                <div class="form-group">
                  <label>{{ __('Transaction_Key') }}</label>
                  <input class="form-control" name="transaction_key"
                    value="{{ $anetInfo['transaction_key'] ?? '' }}">
                  @if ($errors->has('transaction_key'))
                    <p class="mb-0 text-danger">{{ $errors->first('transaction_key') }}</p>
                  @endif
                </div>

                <div class="form-group">
                  <label>{{ __('Public_Client_Key') }}</label>
                  <input class="form-control" name="public_key" value="{{ $anetInfo['public_key'] ?? '' }}">
                  @if ($errors->has('public_key'))
                    <p class="mb-0 text-danger">{{ $errors->first('public_key') }}</p>
                  @endif
                </div>

              </div>
            </div>
          </div>

          <div class="card-footer">
            <div class="form">
              <div class="form-group from-show-notify row">
                <div class="col-12 text-center">
                  <button type="submit" class="btn btn-success">{{ __('Update') }}</button>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>

  </div>
@endsection
