@extends('user-front.layout')
@section('tab-title')
  {{ $currentLanguageInfo->pageHeading->signup_title ?? __('Signup') }}
@endsection
@section('meta-description', !empty($userSeo) ? $userSeo->meta_description_signup : '')
@section('meta-keywords', !empty($userSeo) ? $userSeo->meta_keyword_signup : '')

@section('page-name')
  {{ $keywords['Signup'] ?? __('Signup') }}
@endsection
@section('br-name')
  {{ $keywords['Signup'] ?? __('Signup') }}
@endsection
@section('content')
  <!--====== user-area-section part Start ======-->
  <div class="user-area-section section-gap">
    <div class="container">
      <div class="row justify-content-center">
        <div class="col-lg-8">
          @if (Session::has('warning'))
            <div class="alert alert-danger text-danger">{{ Session::get('warning') }}</div>
          @endif
          @if (Session::has('sendmail'))
            <div class="alert alert-success mb-4">
              <p>{{ __(Session::get('sendmail')) }}</p>
            </div>
          @endif
          <div class="user-form">
            <div class="title mb-3">
              <h4>
                {{ $keywords['Signup'] ?? __('Signup') }}
              </h4>
            </div>
            <form action="{{ route('customer.signup.submit', getParam()) }}" method="POST">
              @csrf
              <div class="form_group">
                <label>{{ $keywords['Username'] ?? 'Username' }} **</label>
                <input type="text" placeholder="{{ $keywords['Enter_Username'] ?? 'Enter Username' }}"
                  class="form_control" name="username" value="{{ old('username') }}">
                @error('username')
                  <p class="text-danger">{{ $message }}</p>
                @enderror
              </div>
              <div class="form_group">
                <label>{{ $keywords['Email_Address'] ?? 'Email Address' }} **</label>
                <input type="email" placeholder="{{ $keywords['Enter_Email_Address'] ?? 'Enter Email Address' }}"
                  class="form_control" name="email" value="{{ old('email') }}">
                @error('email')
                  <p class="text-danger">{{ $message }}</p>
                @enderror
              </div>
              <div class="form_group">
                <label>{{ $keywords['Password'] ?? 'Password' }} **</label>
                <input type="password" placeholder="{{ $keywords['Enter_Password'] ?? 'Enter_Password' }}"
                  class="form_control" name="password" value="{{ old('password') }}">
                @error('password')
                  <p class="text-danger">{{ $message }}</p>
                @enderror
              </div>
              <div class="form_group">
                <label>{{ $keywords['Confirm_Password'] ?? 'Confirm Password' }} **</label>
                <input type="password" placeholder="{{ $keywords['Enter_Password_Again'] ?? 'Enter Password Again' }}"
                  class="form_control" name="password_confirmation" value="{{ old('password_confirmation') }}">
                @error('password_confirmation')
                  <p class="text-danger">{{ $message }}</p>
                @enderror
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
                <button type="submit" class="btn btn-form">{{ $keywords['Signup'] ?? __('Signup!') }}</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  </div>
  <!--====== user-area-section part End ======-->
@endsection
