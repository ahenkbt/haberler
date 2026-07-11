@extends('user-front.layout')

@section('tab-title')
  {{ $keywords['reset_password'] ?? __('Reset password') }}
@endsection

@section('page-name')
  {{ $keywords['reset_password'] ?? __('Reset password') }}
@endsection
@section('br-name')
  {{ $keywords['reset_password'] ?? __('Reset password') }}
@endsection

@section('content')
  <!--====== PROFILE PART START ======-->

  <section class="user-area-section section-gap">
    <div class="container">
      <div class="row justify-content-center">
        <div class="col-lg-8">
          <div class="user-form">
            <div class="title mb-3">
              <h4>
                {{ $keywords['reset_password'] ?? __('Reset password') }}</h4>
            </div>
            <div class="profile-form">
              <form action="{{ route('customer.reset_password_submit', getParam()) }}" method="POST">
                @csrf
                <div class="row">
                  <div class="col-12">
                    <div class="form_group">
                      <label>{{ $keywords['New_Password'] ?? __('New Password') }} *</label>
                      <input type="password" class="form_control" name="new_password"
                        placeholder="{{ $keywords['New_Password'] ?? __('New Password') }}">
                      @error('new_password')
                        <p class="text-danger">{{ $message }}</p>
                      @enderror
                    </div>
                  </div>
                  <div class="col-12">
                    <div class="form_group">
                      <label>{{ $keywords['Confirm_New_Password'] ?? __('Confirm New Password') }}
                        *</label>
                      <input type="password" class="form_control" name="new_password_confirmation"
                        placeholder="{{ $keywords['Confirm_New_Password'] ?? __('Confirm New Password') }}">
                      @error('new_password_confirmation')
                        <p class="text-danger">{{ $message }}</p>
                      @enderror
                    </div>
                  </div>
                  <div class="col-md-12">
                    <div class="single-form">
                      <button class="btn">{{ $keywords['Submit'] ?? __('Submit') }}</button>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
  <!--====== PROFILE PART ENDS ======-->
@endsection
