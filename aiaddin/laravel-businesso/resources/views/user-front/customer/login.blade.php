@extends('user-front.layout')

@section('tab-title')
  {{ $keywords['Login'] ?? __('Login') }}
@endsection
@section('meta-description', !empty($userSeo) ? $userSeo->meta_description_login : '')
@section('meta-keywords', !empty($userSeo) ? $userSeo->meta_keyword_login : '')

@section('page-name')
  {{ $keywords['Login'] ?? __('Log In') }}
@endsection
@section('br-name')
  {{ $keywords['Login'] ?? __('Log In') }}
@endsection

@section('content')

  <!--====== SING IN PART START ======-->
  <div class="user-area-section section-gap">
    <div class="container">
      <div class="row justify-content-center">
        <div class="col-lg-8">
          <div class="user-form">
            <div class="title mb-3">
              <h4>
                {{ $keywords['Login'] ?? __('Log In') }}
              </h4>
            </div>
            <form action="{{ route('customer.login_submit', getParam()) }}" method="POST">
              @csrf
              <input type="hidden" name="user_id" value="{{ $user->id }}">
              <div class="form_group">
                <label>{{ $keywords['email'] ?? __('Email') }} *</label>
                <input type="email" placeholder="{{ $keywords['Enter_Email_Address'] ?? __('Enter Email Address') }}"
                  class="form_control" name="email" value="{{ old('email') }}">
                @error('email')
                  <p class="text-danger">{{ $message }}</p>
                @enderror
              </div>
              <div class="form_group">
                <label>{{ $keywords['Password'] ?? __('Password') }} *</label>
                <input type="password" class="form-control" name="password" value="{{ old('password') }}"
                  placeholder="{{ $keywords['Enter_Password'] ?? __('Enter Password') }}">
                @error('password')
                  <p class="text-danger">{{ $message }}</p>
                @enderror
              </div>
              <div class="form_group form_inline">
                <div>
                  {{-- <input type="checkbox" name="checkbox1" id="checkbox1"> --}}
                  <label for="checkbox1"></label>
                  {{-- <label class="cursor-pointer"
                                        for="checkbox1"><span></span>{{ $keywords['Remember_Me'] ?? 'Remember Me' }}</label> --}}
                </div>
                <a
                  href="{{ route('customer.forget_password', getParam()) }}">{{ $keywords['Lost_your_password'] ?? __('Lost your password') . '?' }}?</a>
              </div>
              <div class="form_group">
                @if ($userBs->is_recaptcha == 1)
                  <div class="d-block mb-4">
                    {!! NoCaptcha::renderJs() !!}
                    {!! NoCaptcha::display() !!}
                    @if ($errors->has('g-recaptcha-response'))
                      @php
                        $errmsg = $errors->first('g-recaptcha-response');
                      @endphp
                      <p class="text-danger mb-0 mt-2">{{ __("$errmsg") }}</p>
                    @endif
                  </div>
                @endif
              </div>
              <div class="form_group">
                <button type="submit" class="btn">{{ $keywords['Login_Now'] ?? __('Login Now') }}</button>
              </div>
              <div class="new-user text-center">
                <p class="text">{{ $keywords['New_user'] ?? 'New user' }}? <a
                    href="{{ route('customer.signup', getParam()) }}">{{ $keywords['Donot_have_an_account'] ?? "Don't have an account" }}?</a>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  </div>
  <!--====== SING IN PART ENDS ======-->
@endsection
