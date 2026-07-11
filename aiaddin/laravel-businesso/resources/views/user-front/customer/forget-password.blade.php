@extends('user-front.layout')

@section('tab-title')
  {{ $keywords['forget_password'] ?? __('Forget password') }}
@endsection
@section('page-name')
  {{ $keywords['forget_password'] ?? __('Forget password') }}
@endsection
@section('br-name')
  {{ $keywords['forget_password'] ?? __('Forget password') }}
@endsection
@section('content')
  <!--======FORGET PASSWORD PART START ======-->
  <section class="user-area-section section-gap">
    <div class="container">
      <div class="row justify-content-center">
        <div class="col-lg-8">
          <div class="user-form">
            <div class="title mb-3">
              <h4>
                {{ $keywords['forget_password'] ?? __('Forget password') }}
              </h4>
            </div>
            <form action="{{ route('customer.send_forget_password_mail', getParam()) }}" method="POST">
              @csrf
              <input type="hidden" name="user_id" value="{{ $user->id }}">
              <div class="form_group">
                <label>{{ $keywords['Email_Address'] ? $keywords['Email_Address'] . '*' : __('Email Address') . '*' }}</label>
                <input type="email" placeholder="{{ $keywords['Email_Address'] ?? __('Email Address') }}"
                  class="form_control" name="email" value="{{ old('email') }}">
                @error('email')
                  <p class="text-danger">{{ $message }}</p>
                @enderror
              </div> <!-- single-form -->
              <div class="single-form">
                <button type="submit" class="btn">{{ $keywords['Proceed'] ?? __('Proceed') }}</button>
              </div> <!-- single-form -->
            </form>
          </div>
        </div>
      </div>
    </div>
  </section>
  <!--====== FORGET PASSWORD PART ENDS ======-->
@endsection
